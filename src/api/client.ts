import type {
  ApiResponse,
  Collection,
  CollectionCreate,
  CollectionUpdate,
  Raindrop,
  RaindropCreate,
  RaindropUpdate,
  RaindropUser,
  Tag,
  UserStats,
} from "./types";

export interface Logger {
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

const defaultLogger: Logger = {
  log: (msg) => console.log(msg),
  warn: (msg) => console.warn(msg),
  error: (msg) => console.error(msg),
};

export class RaindropError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public hint?: string,
  ) {
    super(message);
    this.name = "RaindropError";
  }
}

function calculateBackoff(attempt: number, baseMs: number = 1000, maxMs: number = 30000): number {
  const exponential = baseMs * 2 ** attempt;
  const jitter = Math.random() * 1000;
  return Math.min(exponential + jitter, maxMs);
}

function assertDefined<T>(value: T | undefined | null, context: string): T {
  if (value === undefined || value === null) {
    throw new RaindropError(`Unexpected empty response: ${context}`, 500);
  }
  return value;
}

export class RaindropAPI {
  private static readonly BASE_URL = "https://api.raindrop.io/rest/v1";
  private static readonly MAX_RETRIES = 3;
  private static readonly REQUEST_TIMEOUT_MS = 60000;

  constructor(
    private token: string,
    private dryRun: boolean = false,
    private logger: Logger = defaultLogger,
  ) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private getDryRunResponse<T>(method: string, path: string): ApiResponse<T> {
    if (method === "DELETE") {
      return { result: true } as ApiResponse<T>;
    }

    if (path === "/user") {
      return {
        result: true,
        user: { _id: 0, fullName: "Dry Run User" },
      } as ApiResponse<T>;
    }

    if (path.includes("/tags")) {
      return { result: true, items: [] } as ApiResponse<T>;
    }

    if (path.includes("/collections") || path.includes("/collection")) {
      return {
        result: true,
        item: { _id: 0, title: "Dry Run Collection", count: 0 } as T,
        items: [],
      };
    }

    if (path.includes("/raindrop")) {
      return {
        result: true,
        item: {
          _id: 0,
          title: "Dry Run Item",
          link: "http://dryrun.com",
          tags: [],
        } as T,
        items: [],
      };
    }

    return {
      result: true,
      item: { _id: 0 } as T,
      items: [],
    };
  }

  private async request<T>(
    method: string,
    path: string,
    options: { json?: unknown; params?: Record<string, string | number> } = {},
  ): Promise<ApiResponse<T>> {
    if (this.dryRun && ["POST", "PUT", "DELETE"].includes(method)) {
      this.logger.log(`[DRY RUN] ${method} ${path}`);
      if (options.json) {
        const filtered = Object.fromEntries(
          Object.entries(options.json as Record<string, unknown>).filter(([k]) => !k.toLowerCase().includes("token")),
        );
        this.logger.log(`Payload: ${JSON.stringify(filtered, null, 2)}`);
      }
      return this.getDryRunResponse<T>(method, path);
    }

    let url = `${RaindropAPI.BASE_URL}${path}`;
    if (options.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        searchParams.append(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }

    let attempt = 0;

    while (attempt < RaindropAPI.MAX_RETRIES) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RaindropAPI.REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: options.json ? JSON.stringify(options.json) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          attempt++;
          const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "10", 10);
          const backoff = Math.max(retryAfter * 1000, calculateBackoff(attempt));

          if (attempt >= RaindropAPI.MAX_RETRIES) {
            throw new RaindropError(
              "Rate limit exceeded. Maximum retries reached.",
              429,
              "Wait a few minutes before trying again.",
            );
          }

          this.logger.warn(
            `[${method} ${path}] Rate limited. Retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt}/${RaindropAPI.MAX_RETRIES})`,
          );
          await Bun.sleep(backoff);
          continue;
        }

        if (response.status >= 500) {
          attempt++;
          if (attempt >= RaindropAPI.MAX_RETRIES) {
            throw new RaindropError(
              `Server Error: ${response.status}`,
              response.status,
              "The Raindrop.io server is experiencing issues. Try again later.",
            );
          }

          const backoff = calculateBackoff(attempt);
          this.logger.warn(
            `[${method} ${path}] Server error ${response.status}. Retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt}/${RaindropAPI.MAX_RETRIES})`,
          );
          await Bun.sleep(backoff);
          continue;
        }

        if (!response.ok) {
          let errorDetail = await response.text();
          try {
            const errorJson = JSON.parse(errorDetail);
            errorDetail = errorJson.errorMessage || errorDetail;
          } catch {}

          let hint: string | undefined;
          if (response.status === 401) {
            hint = "Authentication failed. Try running 'raindrop login' again.";
          } else if (response.status === 404) {
            hint = "The requested resource was not found. Verify the ID is correct.";
          } else if (response.status === 400) {
            hint = "Invalid request. Check your input parameters.";
          }

          throw new RaindropError(`API Error ${response.status}: ${errorDetail}`, response.status, hint);
        }

        return (await response.json()) as ApiResponse<T>;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof RaindropError) throw error;

        if (error instanceof Error && error.name === "AbortError") {
          throw new RaindropError(
            `Request timeout after ${RaindropAPI.REQUEST_TIMEOUT_MS}ms`,
            504,
            "The request took too long. Try again later.",
          );
        }

        attempt++;
        if (attempt >= RaindropAPI.MAX_RETRIES) {
          throw new RaindropError(`Network Error: ${error}`, 503, "Check your internet connection and try again.");
        }

        const backoff = calculateBackoff(attempt);
        this.logger.warn(
          `[${method} ${path}] Network error. Retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt}/${RaindropAPI.MAX_RETRIES})`,
        );
        await Bun.sleep(backoff);
      }
    }

    throw new RaindropError("Maximum retries exceeded", 504);
  }

  async getUser(): Promise<RaindropUser> {
    const data = await this.request<RaindropUser>("GET", "/user");
    return assertDefined(data.user, "user");
  }

  async getStats(): Promise<UserStats[]> {
    const data = await this.request<UserStats>("GET", "/user/stats");
    return data.items || [];
  }

  async getCollections(): Promise<Collection[]> {
    const data = await this.request<Collection>("GET", "/collections/all");
    return data.items || [];
  }

  async getRootCollections(): Promise<Collection[]> {
    const data = await this.request<Collection>("GET", "/collections");
    return data.items || [];
  }

  async getChildCollections(): Promise<Collection[]> {
    const data = await this.request<Collection>("GET", "/collections/childrens");
    return data.items || [];
  }

  async getCollection(id: number): Promise<Collection> {
    const data = await this.request<Collection>("GET", `/collection/${id}`);
    return assertDefined(data.item, "collection");
  }

  async createCollection(collection: CollectionCreate): Promise<Collection> {
    const data = await this.request<Collection>("POST", "/collection", {
      json: collection,
    });
    return assertDefined(data.item, "collection");
  }

  async updateCollection(id: number, update: CollectionUpdate): Promise<Collection> {
    const data = await this.request<Collection>("PUT", `/collection/${id}`, {
      json: update,
    });
    return assertDefined(data.item, "collection");
  }

  async deleteCollection(id: number): Promise<boolean> {
    const data = await this.request<never>("DELETE", `/collection/${id}`);
    return data.result;
  }

  async deleteCollections(ids: number[]): Promise<boolean> {
    const data = await this.request<never>("DELETE", "/collections", {
      json: { ids },
    });
    return data.result;
  }

  async reorderCollections(sort: string): Promise<boolean> {
    const data = await this.request<never>("PUT", "/collections", {
      json: { sort },
    });
    return data.result;
  }

  async expandAllCollections(expanded: boolean): Promise<boolean> {
    const data = await this.request<never>("PUT", "/collections", {
      json: { expanded },
    });
    return data.result;
  }

  async mergeCollections(ids: number[], targetId: number): Promise<boolean> {
    const data = await this.request<never>("PUT", "/collections/merge", {
      json: { ids, to: targetId },
    });
    return data.result;
  }

  async cleanEmptyCollections(): Promise<number> {
    const data = await this.request<never>("PUT", "/collections/clean");
    return data.count || 0;
  }

  async uploadCollectionCover(id: number, filePath: string): Promise<Collection> {
    if (this.dryRun) {
      this.logger.log(`[DRY RUN] PUT /collection/${id}/cover`);
      this.logger.log(`File: ${filePath}`);
      return { _id: id, title: "Dry Run Icon", count: 0 };
    }

    const file = Bun.file(filePath);
    const formData = new FormData();
    formData.append("cover", file);

    const response = await fetch(`${RaindropAPI.BASE_URL}/collection/${id}/cover`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    });

    if (!response.ok) {
      throw new RaindropError(`Upload failed: ${response.status}`, response.status);
    }

    const data = (await response.json()) as { item: Collection };
    return data.item;
  }

  async searchCovers(query: string): Promise<string[]> {
    const data = await this.request<{ icons: { png: string }[] }>(
      "GET",
      `/collections/covers/${encodeURIComponent(query)}`,
    );
    const icons: string[] = [];
    for (const group of data.items || []) {
      for (const icon of group.icons || []) {
        if (icon.png) icons.push(icon.png);
      }
    }
    return icons;
  }

  async emptyTrash(): Promise<boolean> {
    const data = await this.request<never>("DELETE", "/collection/-99");
    return data.result;
  }

  async getTags(collectionId: number = 0): Promise<Tag[]> {
    const data = await this.request<Tag>("GET", `/tags/${collectionId}`);
    return data.items || [];
  }

  async deleteTags(tags: string[], collectionId: number = 0): Promise<boolean> {
    const data = await this.request<never>("DELETE", `/tags/${collectionId}`, {
      json: { tags },
    });
    return data.result;
  }

  async renameTag(oldName: string, newName: string, collectionId: number = 0): Promise<boolean> {
    const data = await this.request<never>("PUT", `/tags/${collectionId}`, {
      json: { replace: newName, tags: [oldName] },
    });
    return data.result;
  }

  async search(query: string = "", collectionId: number = 0, limit: number = 50): Promise<Raindrop[]> {
    const allItems: Raindrop[] = [];
    let page = 0;
    const perPage = Math.min(limit, 50);

    while (allItems.length < limit) {
      const data = await this.request<Raindrop>("GET", `/raindrops/${collectionId}`, {
        params: { search: query, page, perpage: perPage },
      });

      const items = data.items || [];
      if (items.length === 0) break;

      const remaining = limit - allItems.length;
      allItems.push(...items.slice(0, remaining));

      if (items.length < perPage) break;
      page++;
    }

    return allItems;
  }

  async getRaindrop(id: number): Promise<Raindrop> {
    const data = await this.request<Raindrop>("GET", `/raindrop/${id}`);
    return assertDefined(data.item, "raindrop");
  }

  async addRaindrop(raindrop: RaindropCreate): Promise<Raindrop> {
    const data = await this.request<Raindrop>("POST", "/raindrop", {
      json: raindrop,
    });
    return assertDefined(data.item, "raindrop");
  }

  async updateRaindrop(id: number, update: RaindropUpdate): Promise<Raindrop> {
    const data = await this.request<Raindrop>("PUT", `/raindrop/${id}`, {
      json: update,
    });
    return assertDefined(data.item, "raindrop");
  }

  async deleteRaindrop(id: number): Promise<boolean> {
    const data = await this.request<never>("DELETE", `/raindrop/${id}`);
    return data.result;
  }

  async batchUpdateRaindrops(collectionId: number, ids: number[], update: RaindropUpdate): Promise<boolean> {
    const payload = { ...update, ids };
    const data = await this.request<never>("PUT", `/raindrops/${collectionId}`, {
      json: payload,
    });
    return data.result;
  }

  async batchDeleteRaindrops(collectionId: number, ids: number[]): Promise<boolean> {
    const data = await this.request<never>("DELETE", `/raindrops/${collectionId}`, {
      json: { ids },
    });
    return data.result;
  }

  async getSuggestions(id: number): Promise<{ tags?: string[]; collections?: Collection[] }> {
    const data = await this.request<{
      tags?: string[];
      collections?: Collection[];
    }>("GET", `/raindrop/${id}/suggest`);
    return data.item || {};
  }

  async checkWayback(url: string): Promise<string | null> {
    try {
      const response = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = (await response.json()) as {
          archived_snapshots?: { closest?: { url?: string } };
        };
        return data.archived_snapshots?.closest?.url ?? null;
      }
    } catch {}
    return null;
  }
}
