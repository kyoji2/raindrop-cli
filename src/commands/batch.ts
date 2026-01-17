import type { RaindropUpdate } from "../api";
import { type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export interface BatchUpdateOptions extends GlobalOptions {
  ids: string;
  json: string;
  collection?: string;
}

export async function cmdBatchUpdate(options: BatchUpdateOptions): Promise<void> {
  const ids = options.ids.split(",").map((id) => parseInt(id.trim(), 10));

  if (ids.length === 0 || ids.some(Number.isNaN)) {
    outputError("--ids is required (comma-separated list)", 400);
  }

  if (!options.json) {
    outputError("JSON patch data is required", 400);
  }

  const collectionId = options.collection ? parseInt(options.collection, 10) : 0;
  const api = getAuthenticatedAPI(options);
  const patchData: RaindropUpdate = JSON.parse(options.json);
  const success = await withSpinner(`Updating ${ids.length} bookmark(s)...`, () =>
    api.batchUpdateRaindrops(collectionId, ids, patchData),
  );
  output({ success }, options.format);
}

export interface BatchDeleteOptions extends GlobalOptions {
  ids: string;
  collection?: string;
}

export async function cmdBatchDelete(options: BatchDeleteOptions): Promise<void> {
  const ids = options.ids.split(",").map((id) => parseInt(id.trim(), 10));

  if (ids.length === 0 || ids.some(Number.isNaN)) {
    outputError("--ids is required (comma-separated list)", 400);
  }

  const collectionId = options.collection ? parseInt(options.collection, 10) : 0;
  const api = getAuthenticatedAPI(options);
  const success = await withSpinner(`Deleting ${ids.length} bookmark(s)...`, () =>
    api.batchDeleteRaindrops(collectionId, ids),
  );
  output({ success }, options.format);
}
