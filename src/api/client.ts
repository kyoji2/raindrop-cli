import { Blob } from "node:buffer";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { z } from "zod";
import {
  CollectionResponseSchema,
  CollectionsResponseSchema,
  CoversResponseSchema,
  RaindropResponseSchema,
  RaindropsResponseSchema,
  ResultResponseSchema,
  StatsResponseSchema,
  SuggestionsResponseSchema,
  TagsResponseSchema,
  UserResponseSchema,
} from "./schemas";
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

function parseResponse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new RaindropError(`Invalid API response for ${context}: ${issues}`, 500);
  }
  return result.data;
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
          await delay(backoff);
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
          await delay(backoff);
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
        await delay(backoff);
      }
    }

    throw new RaindropError("Maximum retries exceeded", 504);
  }

  async getUser(): Promise<RaindropUser> {
    const data = await this.request<unknown>("GET", "/user");
    const parsed = parseResponse(UserResponseSchema, data, "getUser");
    return parsed.user;
  }

  async getStats(): Promise<UserStats[]> {
    const data = await this.request<unknown>("GET", "/user/stats");
    const parsed = parseResponse(StatsResponseSchema, data, "getStats");
    return parsed.items;
  }

  async getCollections(): Promise<Collection[]> {
    const data = await this.request<unknown>("GET", "/collections/all");
    const parsed = parseResponse(CollectionsResponseSchema, data, "getCollections");
    return parsed.items;
  }

  async getRootCollections(): Promise<Collection[]> {
    const data = await this.request<unknown>("GET", "/collections");
    const parsed = parseResponse(CollectionsResponseSchema, data, "getRootCollections");
    return parsed.items;
  }

  async getChildCollections(): Promise<Collection[]> {
    const data = await this.request<unknown>("GET", "/collections/childrens");
    const parsed = parseResponse(CollectionsResponseSchema, data, "getChildCollections");
    return parsed.items;
  }

  async getCollection(id: number): Promise<Collection> {
    const data = await this.request<unknown>("GET", `/collection/${id}`);
    const parsed = parseResponse(CollectionResponseSchema, data, "getCollection");
    return parsed.item;
  }

  async createCollection(collection: CollectionCreate): Promise<Collection> {
    const data = await this.request<unknown>("POST", "/collection", {
      json: collection,
    });
    const parsed = parseResponse(CollectionResponseSchema, data, "createCollection");
    return parsed.item;
  }

  async updateCollection(id: number, update: CollectionUpdate): Promise<Collection> {
    const data = await this.request<unknown>("PUT", `/collection/${id}`, {
      json: update,
    });
    const parsed = parseResponse(CollectionResponseSchema, data, "updateCollection");
    return parsed.item;
  }

  async deleteCollection(id: number): Promise<boolean> {
    const data = await this.request<unknown>("DELETE", `/collection/${id}`);
    const parsed = parseResponse(ResultResponseSchema, data, "deleteCollection");
    return parsed.result;
  }

  async deleteCollections(ids: number[]): Promise<boolean> {
    const data = await this.request<unknown>("DELETE", "/collections", {
      json: { ids },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "deleteCollections");
    return parsed.result;
  }

  async reorderCollections(sort: string): Promise<boolean> {
    const data = await this.request<unknown>("PUT", "/collections", {
      json: { sort },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "reorderCollections");
    return parsed.result;
  }

  async expandAllCollections(expanded: boolean): Promise<boolean> {
    const data = await this.request<unknown>("PUT", "/collections", {
      json: { expanded },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "expandAllCollections");
    return parsed.result;
  }

  async mergeCollections(ids: number[], targetId: number): Promise<boolean> {
    const data = await this.request<unknown>("PUT", "/collections/merge", {
      json: { ids, to: targetId },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "mergeCollections");
    return parsed.result;
  }

  async cleanEmptyCollections(): Promise<number> {
    const data = await this.request<unknown>("PUT", "/collections/clean");
    const parsed = parseResponse(ResultResponseSchema, data, "cleanEmptyCollections");
    return parsed.count || 0;
  }

  async uploadCollectionCover(id: number, filePath: string): Promise<Collection> {
    if (this.dryRun) {
      this.logger.log(`[DRY RUN] PUT /collection/${id}/cover`);
      this.logger.log(`File: ${filePath}`);
      return { _id: id, title: "Dry Run Icon", count: 0 };
    }

    const fileBuffer = await readFile(filePath);
    const formData = new FormData();
    formData.append("cover", new Blob([fileBuffer]), basename(filePath));

    const response = await fetch(`${RaindropAPI.BASE_URL}/collection/${id}/cover`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    });

    if (!response.ok) {
      throw new RaindropError(`Upload failed: ${response.status}`, response.status);
    }

    const data = await response.json();
    const parsed = parseResponse(CollectionResponseSchema, data, "uploadCollectionCover");
    return parsed.item;
  }

  async searchCovers(query: string): Promise<string[]> {
    const data = await this.request<unknown>("GET", `/collections/covers/${encodeURIComponent(query)}`);
    const parsed = parseResponse(CoversResponseSchema, data, "searchCovers");
    const icons: string[] = [];
    for (const group of parsed.items) {
      for (const icon of group.icons || []) {
        if (icon.png) icons.push(icon.png);
      }
    }
    return icons;
  }

  async emptyTrash(): Promise<boolean> {
    const data = await this.request<unknown>("DELETE", "/collection/-99");
    const parsed = parseResponse(ResultResponseSchema, data, "emptyTrash");
    return parsed.result;
  }

  async getTags(collectionId: number = 0): Promise<Tag[]> {
    const data = await this.request<unknown>("GET", `/tags/${collectionId}`);
    const parsed = parseResponse(TagsResponseSchema, data, "getTags");
    return parsed.items;
  }

  async deleteTags(tags: string[], collectionId: number = 0): Promise<boolean> {
    const data = await this.request<unknown>("DELETE", `/tags/${collectionId}`, {
      json: { tags },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "deleteTags");
    return parsed.result;
  }

  async renameTag(oldName: string, newName: string, collectionId: number = 0): Promise<boolean> {
    const data = await this.request<unknown>("PUT", `/tags/${collectionId}`, {
      json: { replace: newName, tags: [oldName] },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "renameTag");
    return parsed.result;
  }

  async search(query: string = "", collectionId: number = 0, limit: number = 50): Promise<Raindrop[]> {
    const allItems: Raindrop[] = [];
    let page = 0;
    const perPage = Math.min(limit, 50);

    while (allItems.length < limit) {
      const data = await this.request<unknown>("GET", `/raindrops/${collectionId}`, {
        params: { search: query, page, perpage: perPage },
      });
      const parsed = parseResponse(RaindropsResponseSchema, data, "search");

      const items = parsed.items;
      if (items.length === 0) break;

      const remaining = limit - allItems.length;
      allItems.push(...items.slice(0, remaining));

      if (items.length < perPage) break;
      page++;
    }

    return allItems;
  }

  async getRaindrop(id: number): Promise<Raindrop> {
    const data = await this.request<unknown>("GET", `/raindrop/${id}`);
    const parsed = parseResponse(RaindropResponseSchema, data, "getRaindrop");
    return parsed.item;
  }

  async addRaindrop(raindrop: RaindropCreate): Promise<Raindrop> {
    const data = await this.request<unknown>("POST", "/raindrop", {
      json: raindrop,
    });
    const parsed = parseResponse(RaindropResponseSchema, data, "addRaindrop");
    return parsed.item;
  }

  async updateRaindrop(id: number, update: RaindropUpdate): Promise<Raindrop> {
    const data = await this.request<unknown>("PUT", `/raindrop/${id}`, {
      json: update,
    });
    const parsed = parseResponse(RaindropResponseSchema, data, "updateRaindrop");
    return parsed.item;
  }

  async deleteRaindrop(id: number): Promise<boolean> {
    const data = await this.request<unknown>("DELETE", `/raindrop/${id}`);
    const parsed = parseResponse(ResultResponseSchema, data, "deleteRaindrop");
    return parsed.result;
  }

  async batchUpdateRaindrops(collectionId: number, ids: number[], update: RaindropUpdate): Promise<boolean> {
    const payload = { ...update, ids };
    const data = await this.request<unknown>("PUT", `/raindrops/${collectionId}`, {
      json: payload,
    });
    const parsed = parseResponse(ResultResponseSchema, data, "batchUpdateRaindrops");
    return parsed.result;
  }

  async batchDeleteRaindrops(collectionId: number, ids: number[]): Promise<boolean> {
    const data = await this.request<unknown>("DELETE", `/raindrops/${collectionId}`, {
      json: { ids },
    });
    const parsed = parseResponse(ResultResponseSchema, data, "batchDeleteRaindrops");
    return parsed.result;
  }

  async getSuggestions(id: number): Promise<{ tags?: string[]; collections?: Collection[] }> {
    const data = await this.request<unknown>("GET", `/raindrop/${id}/suggest`);
    const parsed = parseResponse(SuggestionsResponseSchema, data, "getSuggestions");
    const item = parsed.item || {};
    return {
      ...item,
      tags: item.tags ?? undefined,
      collections: item.collections ?? undefined,
    };
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
