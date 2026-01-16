import { createCommandRunner, type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export async function cmdTagDelete(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);

  let collectionId = 0;
  const tags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--collection" || arg === "-c") {
      i++;
      collectionId = parseInt(args[i] ?? "0", 10);
    } else if (!arg.startsWith("-")) {
      tags.push(arg);
    }
  }

  if (tags.length === 0) {
    outputError("At least one tag is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner(`Deleting ${tags.length} tag(s)...`, () => api.deleteTags(tags, collectionId));
    output({ success }, options.format);
  });
}

export async function cmdTagRename(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);

  let collectionId = 0;
  let oldName = "";
  let newName = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--collection" || arg === "-c") {
      i++;
      collectionId = parseInt(args[i] ?? "0", 10);
    } else if (!arg.startsWith("-")) {
      if (!oldName) {
        oldName = arg;
      } else {
        newName = arg;
      }
    }
  }

  if (!oldName || !newName) {
    outputError("Both old and new tag names are required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner(`Renaming tag '${oldName}' to '${newName}'...`, () =>
      api.renameTag(oldName, newName, collectionId),
    );
    output({ success }, options.format);
  });
}
