import type { RaindropUpdate } from "../api";
import { createCommandRunner, type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export async function cmdBatchUpdate(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);

  let ids: number[] = [];
  let collectionId = 0;
  let dataJson = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--ids") {
      i++;
      ids = (args[i] ?? "").split(",").map((id) => parseInt(id.trim(), 10));
    } else if (arg === "--collection" || arg === "-c") {
      i++;
      collectionId = parseInt(args[i] ?? "0", 10);
    } else if (!arg.startsWith("-")) {
      dataJson = arg;
    }
  }

  if (ids.length === 0) {
    outputError("--ids is required (comma-separated list)", 400, undefined, options.format);
  }

  if (!dataJson) {
    outputError("JSON patch data is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const patchData: RaindropUpdate = JSON.parse(dataJson);
    const success = await withSpinner(`Updating ${ids.length} bookmark(s)...`, () =>
      api.batchUpdateRaindrops(collectionId, ids, patchData),
    );
    output({ success }, options.format);
  });
}

export async function cmdBatchDelete(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);

  let ids: number[] = [];
  let collectionId = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--ids") {
      i++;
      ids = (args[i] ?? "").split(",").map((id) => parseInt(id.trim(), 10));
    } else if (arg === "--collection" || arg === "-c") {
      i++;
      collectionId = parseInt(args[i] ?? "0", 10);
    }
  }

  if (ids.length === 0) {
    outputError("--ids is required (comma-separated list)", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner(`Deleting ${ids.length} bookmark(s)...`, () =>
      api.batchDeleteRaindrops(collectionId, ids),
    );
    output({ success }, options.format);
  });
}
