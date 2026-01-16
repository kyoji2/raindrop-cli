import type {
  RaindropUser,
  Collection,
  Raindrop,
  Tag,
  UserStats,
  CollectionCreate,
  CollectionUpdate,
  RaindropCreate,
  RaindropUpdate,
  ApiResponse,
} from './types';

export class RaindropError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public hint?: string
  ) {
    super(message);
    this.name = 'RaindropError';
  }
}

export class RaindropAPI {
  private static readonly BASE_URL = 'https://api.raindrop.io/rest/v1';
  private static readonly MAX_RETRIES = 3;

  constructor(
    private token: string,
    private dryRun: boolean = false
  ) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    options: { json?: unknown; params?: Record<string, string | number> } = {}
  ): Promise<ApiResponse<T>> {
    if (this.dryRun && ['POST', 'PUT', 'DELETE'].includes(method)) {
      console.log(`[DRY RUN] ${method} ${path}`);
      if (options.json) {
        const filtered = Object.fromEntries(
          Object.entries(options.json as Record<string, unknown>).filter(
            ([k]) => !k.toLowerCase().includes('token')
          )
        );
        console.log(`Payload: ${JSON.stringify(filtered, null, 2)}`);
      }

      if (method === 'DELETE') {
        return { result: true } as ApiResponse<T>;
      }
      return {
        result: true,
        item: { _id: 0, title: 'Dry Run Item', link: 'http://dryrun.com' } as T,
        items: [],
      };
    }

    let url = `${RaindropAPI.BASE_URL}${path}`;
    if (options.params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        searchParams.append(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }

    let retries = RaindropAPI.MAX_RETRIES;
    while (retries > 0) {
      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: options.json ? JSON.stringify(options.json) : undefined,
        });

        if (response.status === 429) {
          retries--;
          const retryAfter = parseInt(response.headers.get('Retry-After') || '10', 10);
          console.warn(`Rate limited. Retrying in ${retryAfter}s... (${retries} retries left)`);
          await Bun.sleep(retryAfter * 1000);
          continue;
        }

        if (response.status >= 500) {
          retries--;
          if (retries === 0) {
            throw new RaindropError(`Server Error: ${response.status}`, response.status);
          }
          await Bun.sleep(2000);
          continue;
        }

        if (!response.ok) {
          let errorDetail = await response.text();
          try {
            const errorJson = JSON.parse(errorDetail);
            errorDetail = errorJson.errorMessage || errorDetail;
          } catch {}
          throw new RaindropError(
            `API Error ${response.status}: ${errorDetail}`,
            response.status
          );
        }

        return (await response.json()) as ApiResponse<T>;
      } catch (error) {
        if (error instanceof RaindropError) throw error;
        throw new RaindropError(`Network Error: ${error}`, 503);
      }
    }

    throw new RaindropError('Maximum retries exceeded', 504);
  }

  async getUser(): Promise<RaindropUser> {
    const data = await this.request<RaindropUser>('GET', '/user');
    return data.user!;
  }

  async getStats(): Promise<UserStats[]> {
    const data = await this.request<UserStats>('GET', '/user/stats');
    return data.items || [];
  }

  async getCollections(): Promise<Collection[]> {
    const data = await this.request<Collection>('GET', '/collections/all');
    return data.items || [];
  }

  async getRootCollections(): Promise<Collection[]> {
    const data = await this.request<Collection>('GET', '/collections');
    return data.items || [];
  }

  async getChildCollections(): Promise<Collection[]> {
    const data = await this.request<Collection>('GET', '/collections/childrens');
    return data.items || [];
  }

  async getCollection(id: number): Promise<Collection> {
    const data = await this.request<Collection>('GET', `/collection/${id}`);
    return data.item!;
  }

  async createCollection(collection: CollectionCreate): Promise<Collection> {
    const data = await this.request<Collection>('POST', '/collection', {
      json: collection,
    });
    return data.item!;
  }

  async updateCollection(id: number, update: CollectionUpdate): Promise<Collection> {
    const data = await this.request<Collection>('PUT', `/collection/${id}`, {
      json: update,
    });
    return data.item!;
  }

  async deleteCollection(id: number): Promise<boolean> {
    const data = await this.request<never>('DELETE', `/collection/${id}`);
    return data.result;
  }

  async deleteCollections(ids: number[]): Promise<boolean> {
    const data = await this.request<never>('DELETE', '/collections', {
      json: { ids },
    });
    return data.result;
  }

  async reorderCollections(sort: string): Promise<boolean> {
    const data = await this.request<never>('PUT', '/collections', {
      json: { sort },
    });
    return data.result;
  }

  async expandAllCollections(expanded: boolean): Promise<boolean> {
    const data = await this.request<never>('PUT', '/collections', {
      json: { expanded },
    });
    return data.result;
  }

  async mergeCollections(ids: number[], targetId: number): Promise<boolean> {
    const data = await this.request<never>('PUT', '/collections/merge', {
      json: { ids, to: targetId },
    });
    return data.result;
  }

  async cleanEmptyCollections(): Promise<number> {
    const data = await this.request<never>('PUT', '/collections/clean');
    return data.count || 0;
  }

  async uploadCollectionCover(id: number, filePath: string): Promise<Collection> {
    if (this.dryRun) {
      console.log(`[DRY RUN] PUT /collection/${id}/cover`);
      console.log(`File: ${filePath}`);
      return { _id: id, title: 'Dry Run Icon', count: 0 };
    }

    const file = Bun.file(filePath);
    const formData = new FormData();
    formData.append('cover', file);

    const response = await fetch(`${RaindropAPI.BASE_URL}/collection/${id}/cover`, {
      method: 'PUT',
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
      'GET',
      `/collections/covers/${encodeURIComponent(query)}`
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
    const data = await this.request<never>('DELETE', '/collection/-99');
    return data.result;
  }

  async getTags(collectionId: number = 0): Promise<Tag[]> {
    const data = await this.request<Tag>('GET', `/tags/${collectionId}`);
    return data.items || [];
  }

  async deleteTags(tags: string[], collectionId: number = 0): Promise<boolean> {
    const data = await this.request<never>('DELETE', `/tags/${collectionId}`, {
      json: { tags },
    });
    return data.result;
  }

  async renameTag(oldName: string, newName: string, collectionId: number = 0): Promise<boolean> {
    const data = await this.request<never>('PUT', `/tags/${collectionId}`, {
      json: { replace: newName, tags: [oldName] },
    });
    return data.result;
  }

  async search(query: string = '', collectionId: number = 0): Promise<Raindrop[]> {
    const allItems: Raindrop[] = [];
    let page = 0;

    while (true) {
      const data = await this.request<Raindrop>('GET', `/raindrops/${collectionId}`, {
        params: { search: query, page, perpage: 50 },
      });

      const items = data.items || [];
      if (items.length === 0) break;

      allItems.push(...items);
      if (items.length < 50) break;

      page++;
    }

    return allItems;
  }

  async getRaindrop(id: number): Promise<Raindrop> {
    const data = await this.request<Raindrop>('GET', `/raindrop/${id}`);
    return data.item!;
  }

  async addRaindrop(raindrop: RaindropCreate): Promise<Raindrop> {
    const data = await this.request<Raindrop>('POST', '/raindrop', {
      json: raindrop,
    });
    return data.item!;
  }

  async updateRaindrop(id: number, update: RaindropUpdate): Promise<Raindrop> {
    const data = await this.request<Raindrop>('PUT', `/raindrop/${id}`, {
      json: update,
    });
    return data.item!;
  }

  async deleteRaindrop(id: number): Promise<boolean> {
    const data = await this.request<never>('DELETE', `/raindrop/${id}`);
    return data.result;
  }

  async batchUpdateRaindrops(
    collectionId: number,
    ids: number[],
    update: RaindropUpdate
  ): Promise<boolean> {
    const payload = { ...update, ids };
    const data = await this.request<never>('PUT', `/raindrops/${collectionId}`, {
      json: payload,
    });
    return data.result;
  }

  async batchDeleteRaindrops(collectionId: number, ids: number[]): Promise<boolean> {
    const data = await this.request<never>('DELETE', `/raindrops/${collectionId}`, {
      json: { ids },
    });
    return data.result;
  }

  async getSuggestions(id: number): Promise<{ tags?: string[]; collections?: Collection[] }> {
    const data = await this.request<{ tags?: string[]; collections?: Collection[] }>(
      'GET',
      `/raindrop/${id}/suggest`
    );
    return data.item || {};
  }

  async checkWayback(url: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
      );
      if (response.ok) {
        const data = (await response.json()) as { archived_snapshots?: { closest?: { url?: string } } };
        return data.archived_snapshots?.closest?.url ?? null;
      }
    } catch {}
    return null;
  }
}
