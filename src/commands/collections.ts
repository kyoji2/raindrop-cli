import type { CollectionCreate, CollectionUpdate } from "../api";
import { type GlobalOptions, output, outputError } from "../utils/output";
import { startSpinner, stopSpinner, withSpinner } from "../utils/spinner";
import { getTempFilePath } from "../utils/tempfile";
import { getAuthenticatedAPI } from "./auth";

export interface CollectionCreateOptions extends GlobalOptions {
  title: string;
  parent?: string;
  public?: boolean;
  private?: boolean;
  view?: string;
}

export async function cmdCollectionCreate(options: CollectionCreateOptions): Promise<void> {
  if (!options.title) {
    outputError("Collection title is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  const parentId = options.parent ? parseInt(options.parent, 10) : undefined;
  const isPublic = options.public ? true : options.private ? false : undefined;

  const collection: CollectionCreate = {
    title: options.title,
    parent: parentId ? { $id: parentId } : undefined,
    public: isPublic,
    view: options.view as CollectionCreate["view"],
  };
  const result = await withSpinner("Creating collection...", () => api.createCollection(collection));
  output(result, options.format);
}

export interface CollectionGetOptions extends GlobalOptions {
  id: string;
}

export async function cmdCollectionGet(options: CollectionGetOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400);
  }

  const api = getAuthenticatedAPI(options);
  const result = await withSpinner("Fetching collection...", () => api.getCollection(id));
  output(result, options.format);
}

export interface CollectionUpdateOptions extends GlobalOptions {
  id: string;
  json: string;
}

export async function cmdCollectionUpdate(options: CollectionUpdateOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400);
  }

  if (!options.json) {
    outputError("JSON patch data is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  const patchData: CollectionUpdate = JSON.parse(options.json);
  const result = await withSpinner("Updating collection...", () => api.updateCollection(id, patchData));
  output(result, options.format);
}

export interface CollectionDeleteOptions extends GlobalOptions {
  id: string;
}

export async function cmdCollectionDelete(options: CollectionDeleteOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400);
  }

  const api = getAuthenticatedAPI(options);
  const success = await withSpinner("Deleting collection...", () => api.deleteCollection(id));
  output({ success }, options.format);
}

export interface CollectionDeleteMultipleOptions extends GlobalOptions {
  ids: string;
}

export async function cmdCollectionDeleteMultiple(options: CollectionDeleteMultipleOptions): Promise<void> {
  if (!options.ids) {
    outputError("Collection IDs are required (comma-separated)", 400);
  }

  const ids = options.ids.split(",").map((id) => parseInt(id.trim(), 10));
  if (ids.some(Number.isNaN)) {
    outputError("Invalid collection IDs", 400);
  }

  const api = getAuthenticatedAPI(options);
  const success = await withSpinner(`Deleting ${ids.length} collections...`, () => api.deleteCollections(ids));
  output({ success }, options.format);
}

export interface CollectionReorderOptions extends GlobalOptions {
  sort: string;
}

export async function cmdCollectionReorder(options: CollectionReorderOptions): Promise<void> {
  if (!options.sort) {
    outputError("Sort order is required (title, -title, -count)", 400);
  }

  const api = getAuthenticatedAPI(options);
  const success = await withSpinner("Reordering collections...", () => api.reorderCollections(options.sort));
  output({ success }, options.format);
}

export interface CollectionExpandAllOptions extends GlobalOptions {
  expanded: string;
}

export async function cmdCollectionExpandAll(options: CollectionExpandAllOptions): Promise<void> {
  const expanded = options.expanded.toLowerCase() === "true";

  const api = getAuthenticatedAPI(options);
  const action = expanded ? "Expanding" : "Collapsing";
  const success = await withSpinner(`${action} all collections...`, () => api.expandAllCollections(expanded));
  output({ success }, options.format);
}

export interface CollectionMergeOptions extends GlobalOptions {
  ids: string;
  target: string;
}

export async function cmdCollectionMerge(options: CollectionMergeOptions): Promise<void> {
  if (!options.ids) {
    outputError("Source collection IDs are required (comma-separated)", 400);
  }

  const targetId = parseInt(options.target, 10);
  if (Number.isNaN(targetId)) {
    outputError("Target collection ID is required", 400);
  }

  const ids = options.ids.split(",").map((id) => parseInt(id.trim(), 10));
  if (ids.some(Number.isNaN)) {
    outputError("Invalid collection IDs", 400);
  }

  const api = getAuthenticatedAPI(options);
  const success = await withSpinner("Merging collections...", () => api.mergeCollections(ids, targetId));
  output({ success }, options.format);
}

export async function cmdCollectionClean(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  const count = await withSpinner("Cleaning empty collections...", () => api.cleanEmptyCollections());
  output({ removed_count: count }, options.format);
}

export async function cmdCollectionEmptyTrash(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  const success = await withSpinner("Emptying trash...", () => api.emptyTrash());
  output({ success }, options.format);
}

export interface CollectionCoverOptions extends GlobalOptions {
  id: string;
  source: string;
}

export async function cmdCollectionCover(options: CollectionCoverOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400);
  }

  if (!options.source) {
    outputError("Cover image path or URL is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  let filePath = options.source;
  let isTemp = false;

  if (options.source.startsWith("http://") || options.source.startsWith("https://")) {
    const spinner = startSpinner("Downloading cover image...");
    const response = await fetch(options.source);
    if (!response.ok) {
      stopSpinner(spinner, false);
      outputError(`Failed to download image: ${response.status}`, response.status);
    }
    filePath = getTempFilePath("raindrop_cover", ".png");
    await Bun.write(filePath, await response.arrayBuffer());
    stopSpinner(spinner, true, "Downloaded");
    isTemp = true;
  }

  const result = await withSpinner("Uploading cover...", () => api.uploadCollectionCover(id, filePath));

  if (isTemp) {
    await Bun.$`rm -f ${filePath}`;
  }

  output(result, options.format);
}

export interface CollectionSetIconOptions extends GlobalOptions {
  id: string;
  query: string;
}

export async function cmdCollectionSetIcon(options: CollectionSetIconOptions): Promise<void> {
  const id = parseInt(options.id, 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400);
  }

  if (!options.query) {
    outputError("Icon search query is required", 400);
  }

  const api = getAuthenticatedAPI(options);
  const icons = await withSpinner(`Searching icons for '${options.query}'...`, () => api.searchCovers(options.query));

  if (icons.length === 0) {
    outputError("No icons found", 404);
  }

  const iconUrl = icons[0];
  if (!iconUrl) {
    outputError("No icons found", 404);
  }

  const spinner = startSpinner("Downloading icon...");
  const response = await fetch(iconUrl);
  if (!response.ok) {
    stopSpinner(spinner, false);
    outputError(`Failed to download icon: ${response.status}`, response.status);
  }

  const filePath = getTempFilePath("raindrop_icon", ".png");
  await Bun.write(filePath, await response.arrayBuffer());
  stopSpinner(spinner, true, "Downloaded");

  const result = await withSpinner("Uploading icon...", () => api.uploadCollectionCover(id, filePath));

  await Bun.$`rm -f ${filePath}`;

  output(result, options.format);
}
