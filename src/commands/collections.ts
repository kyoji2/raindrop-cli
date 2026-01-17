import type { CollectionCreate, CollectionUpdate } from "../api";
import { createCommandRunner, type GlobalOptions, output, outputError } from "../utils/output";
import { startSpinner, stopSpinner, withSpinner } from "../utils/spinner";
import { getTempFilePath } from "../utils/tempfile";
import { getAuthenticatedAPI } from "./auth";

export async function cmdCollectionCreate(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);

  let title = "";
  let parentId: number | undefined;
  let isPublic: boolean | undefined;
  let view: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--parent") {
      i++;
      parentId = parseInt(args[i] ?? "", 10);
    } else if (arg === "--public") {
      isPublic = true;
    } else if (arg === "--private") {
      isPublic = false;
    } else if (arg === "--view") {
      i++;
      view = args[i];
    } else if (!arg.startsWith("-")) {
      title = arg;
    }
  }

  if (!title) {
    outputError("Collection title is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const collection: CollectionCreate = {
      title,
      parent: parentId ? { $id: parentId } : undefined,
      public: isPublic,
      view: view as CollectionCreate["view"],
    };
    const result = await withSpinner("Creating collection...", () => api.createCollection(collection));
    output(result, options.format);
  });
}

export async function cmdCollectionGet(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const result = await withSpinner("Fetching collection...", () => api.getCollection(id));
    output(result, options.format);
  });
}

export async function cmdCollectionUpdate(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);
  const dataJson = args[1] ?? "";

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400, undefined, options.format);
  }

  if (!dataJson) {
    outputError("JSON patch data is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const patchData: CollectionUpdate = JSON.parse(dataJson);
    const result = await withSpinner("Updating collection...", () => api.updateCollection(id, patchData));
    output(result, options.format);
  });
}

export async function cmdCollectionDelete(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner("Deleting collection...", () => api.deleteCollection(id));
    output({ success }, options.format);
  });
}

export async function cmdCollectionDeleteMultiple(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const idsArg = args[0] ?? "";

  if (!idsArg) {
    outputError("Collection IDs are required (comma-separated)", 400, undefined, options.format);
  }

  const ids = idsArg.split(",").map((id) => parseInt(id.trim(), 10));
  if (ids.some(Number.isNaN)) {
    outputError("Invalid collection IDs", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner(`Deleting ${ids.length} collections...`, () => api.deleteCollections(ids));
    output({ success }, options.format);
  });
}

export async function cmdCollectionReorder(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const sort = args[0] ?? "";

  if (!sort) {
    outputError("Sort order is required (title, -title, -count)", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner("Reordering collections...", () => api.reorderCollections(sort));
    output({ success }, options.format);
  });
}

export async function cmdCollectionExpandAll(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const expanded = (args[0] ?? "").toLowerCase() === "true";

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const action = expanded ? "Expanding" : "Collapsing";
    const success = await withSpinner(`${action} all collections...`, () => api.expandAllCollections(expanded));
    output({ success }, options.format);
  });
}

export async function cmdCollectionMerge(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const idsArg = args[0] ?? "";
  const targetId = parseInt(args[1] ?? "", 10);

  if (!idsArg) {
    outputError("Source collection IDs are required (comma-separated)", 400, undefined, options.format);
  }

  if (Number.isNaN(targetId)) {
    outputError("Target collection ID is required", 400, undefined, options.format);
  }

  const ids = idsArg.split(",").map((id) => parseInt(id.trim(), 10));
  if (ids.some(Number.isNaN)) {
    outputError("Invalid collection IDs", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner("Merging collections...", () => api.mergeCollections(ids, targetId));
    output({ success }, options.format);
  });
}

export async function cmdCollectionClean(options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const count = await withSpinner("Cleaning empty collections...", () => api.cleanEmptyCollections());
    output({ removed_count: count }, options.format);
  });
}

export async function cmdCollectionEmptyTrash(options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner("Emptying trash...", () => api.emptyTrash());
    output({ success }, options.format);
  });
}

export async function cmdCollectionCover(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);
  const source = args[1] ?? "";

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400, undefined, options.format);
  }

  if (!source) {
    outputError("Cover image path or URL is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    let filePath = source;
    let isTemp = false;

    if (source.startsWith("http://") || source.startsWith("https://")) {
      const spinner = startSpinner("Downloading cover image...");
      const response = await fetch(source);
      if (!response.ok) {
        stopSpinner(spinner, false);
        outputError(`Failed to download image: ${response.status}`, response.status, undefined, options.format);
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
  });
}

export async function cmdCollectionSetIcon(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);
  const query = args[1] ?? "";

  if (Number.isNaN(id)) {
    outputError("Invalid collection ID", 400, undefined, options.format);
  }

  if (!query) {
    outputError("Icon search query is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const icons = await withSpinner(`Searching icons for '${query}'...`, () => api.searchCovers(query));

    if (icons.length === 0) {
      outputError("No icons found", 404, undefined, options.format);
    }

    const iconUrl = icons[0];
    if (!iconUrl) {
      outputError("No icons found", 404, undefined, options.format);
    }

    const spinner = startSpinner("Downloading icon...");
    const response = await fetch(iconUrl);
    if (!response.ok) {
      stopSpinner(spinner, false);
      outputError(`Failed to download icon: ${response.status}`, response.status, undefined, options.format);
    }

    const filePath = getTempFilePath("raindrop_icon", ".png");
    await Bun.write(filePath, await response.arrayBuffer());
    stopSpinner(spinner, true, "Downloaded");

    const result = await withSpinner("Uploading icon...", () => api.uploadCollectionCover(id, filePath));

    await Bun.$`rm -f ${filePath}`;

    output(result, options.format);
  });
}
