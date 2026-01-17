import type { RaindropUpdate } from "../api";
import { type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export interface SearchOptions extends GlobalOptions {
  query: string;
  collection?: string;
  limit: string;
  pretty?: boolean;
}

export async function cmdSearch(options: SearchOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  const collectionId = options.collection ? parseInt(options.collection, 10) : 0;
  const limit = parseInt(options.limit, 10) || 50;

  const results = await withSpinner("Searching...", () => api.search(options.query, collectionId, limit));

  if (options.pretty) {
    console.log(`\n${"ID".padEnd(12)}${"Title".padEnd(50)}${"Tags".padEnd(30)}Link`);
    console.log("-".repeat(120));
    for (const r of results) {
      const title = r.title.length > 47 ? `${r.title.slice(0, 47)}...` : r.title;
      const tags = r.tags.join(", ");
      const tagsDisplay = tags.length > 27 ? `${tags.slice(0, 27)}...` : tags;
      const link = r.link.length > 40 ? `${r.link.slice(0, 40)}...` : r.link;
      console.log(`${String(r._id).padEnd(12)}${title.padEnd(50)}${tagsDisplay.padEnd(30)}${link}`);
    }
    console.log(`\nTotal results: ${results.length}`);
  } else {
    output(
      {
        items: results.map((r) => ({
          id: r._id,
          title: r.title,
          link: r.link,
          tags: r.tags.join(","),
          type: r.type || "link",
          created: r.created,
        })),
      },
      options.format,
    );
  }
}

export interface GetOptions extends GlobalOptions {
  id: string;
}

export async function cmdGet(options: GetOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400);
  }

  const api = getAuthenticatedAPI(options);
  const result = await withSpinner("Fetching bookmark...", () => api.getRaindrop(id));
  output(result, options.format);
}

export interface SuggestOptions extends GlobalOptions {
  id: string;
}

export async function cmdSuggest(options: SuggestOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400);
  }

  const api = getAuthenticatedAPI(options);
  const suggestions = await withSpinner("Getting suggestions...", () => api.getSuggestions(id));
  output(suggestions, options.format);
}

export interface WaybackOptions extends GlobalOptions {
  url: string;
}

export async function cmdWayback(options: WaybackOptions): Promise<void> {
  if (!options.url) {
    outputError("URL is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  const snapshot = await withSpinner("Checking Wayback Machine...", () => api.checkWayback(options.url));
  output({ url: options.url, snapshot }, options.format);
}

export interface AddOptions extends GlobalOptions {
  url: string;
  title?: string;
  tags?: string;
  collection?: string;
}

export async function cmdAdd(options: AddOptions): Promise<void> {
  if (!options.url) {
    outputError("URL is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  const tags = options.tags ? options.tags.split(",").map((t) => t.trim()) : undefined;
  const collectionId = options.collection ? parseInt(options.collection, 10) : undefined;

  const result = await withSpinner("Adding bookmark...", () =>
    api.addRaindrop({
      link: options.url,
      title: options.title,
      tags,
      collection: collectionId ? { $id: collectionId } : undefined,
    }),
  );
  output(result, options.format);
}

export interface PatchOptions extends GlobalOptions {
  id: string;
  json: string;
}

export async function cmdPatch(options: PatchOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400);
  }

  if (!options.json) {
    outputError("JSON patch data is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  const patchData: RaindropUpdate = JSON.parse(options.json);
  const result = await withSpinner("Updating bookmark...", () => api.updateRaindrop(id, patchData));
  output(result, options.format);
}

export interface DeleteOptions extends GlobalOptions {
  id: string;
}

export async function cmdDelete(options: DeleteOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400);
  }

  const api = getAuthenticatedAPI(options);
  const success = await withSpinner("Deleting bookmark...", () => api.deleteRaindrop(id));
  output({ success }, options.format);
}
