import { type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export interface TagDeleteOptions extends GlobalOptions {
  tags: string[];
  collection?: string;
}

export async function cmdTagDelete(options: TagDeleteOptions): Promise<void> {
  if (options.tags.length === 0) {
    outputError("At least one tag is required", 400);
  }

  const collectionId = options.collection ? parseInt(options.collection, 10) : 0;
  const api = getAuthenticatedAPI(options);
  const success = await withSpinner(`Deleting ${options.tags.length} tag(s)...`, () =>
    api.deleteTags(options.tags, collectionId),
  );
  output({ success }, options.format);
}

export interface TagRenameOptions extends GlobalOptions {
  oldName: string;
  newName: string;
  collection?: string;
}

export async function cmdTagRename(options: TagRenameOptions): Promise<void> {
  if (!options.oldName || !options.newName) {
    outputError("Both old and new tag names are required", 400);
  }

  const collectionId = options.collection ? parseInt(options.collection, 10) : 0;
  const api = getAuthenticatedAPI(options);
  const success = await withSpinner(`Renaming tag '${options.oldName}' to '${options.newName}'...`, () =>
    api.renameTag(options.oldName, options.newName, collectionId),
  );
  output({ success }, options.format);
}
