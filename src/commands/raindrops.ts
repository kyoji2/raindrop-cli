import type { RaindropUpdate } from "../api";
import { createCommandRunner, type GlobalOptions, output, outputError } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export async function cmdSearch(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const api = getAuthenticatedAPI(options);

  let query = "";
  let collectionId = 0;
  let limit = 50;
  let pretty = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--collection" || arg === "-c") {
      i++;
      collectionId = parseInt(args[i] ?? "0", 10);
    } else if (arg === "--limit" || arg === "-l") {
      i++;
      limit = parseInt(args[i] ?? "50", 10);
    } else if (arg === "--pretty" || arg === "-p") {
      pretty = true;
    } else if (!arg.startsWith("-")) {
      query = arg;
    }
  }

  await runCommand(async () => {
    const results = await withSpinner("Searching...", () => api.search(query, collectionId, limit));

    if (pretty) {
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
  });
}

export async function cmdGet(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const result = await withSpinner("Fetching bookmark...", () => api.getRaindrop(id));
    output(result, options.format);
  });
}

export async function cmdSuggest(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const suggestions = await withSpinner("Getting suggestions...", () => api.getSuggestions(id));
    output(suggestions, options.format);
  });
}

export async function cmdWayback(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const url = args[0] ?? "";

  if (!url) {
    outputError("URL is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const snapshot = await withSpinner("Checking Wayback Machine...", () => api.checkWayback(url));
    output({ url, snapshot }, options.format);
  });
}

export async function cmdAdd(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);

  let url = "";
  let title: string | undefined;
  let tags: string[] | undefined;
  let collectionId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "--title" || arg === "-t") {
      i++;
      title = args[i];
    } else if (arg === "--tags") {
      i++;
      tags = (args[i] ?? "").split(",").map((t) => t.trim());
    } else if (arg === "--collection" || arg === "-c") {
      i++;
      collectionId = parseInt(args[i] ?? "", 10);
    } else if (!arg.startsWith("-")) {
      url = arg;
    }
  }

  if (!url) {
    outputError("URL is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const result = await withSpinner("Adding bookmark...", () =>
      api.addRaindrop({
        link: url,
        title,
        tags,
        collection: collectionId ? { $id: collectionId } : undefined,
      }),
    );
    output(result, options.format);
  });
}

export async function cmdPatch(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);
  const dataJson = args[1] ?? "";

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400, undefined, options.format);
  }

  if (!dataJson) {
    outputError("JSON patch data is required", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const patchData: RaindropUpdate = JSON.parse(dataJson);
    const result = await withSpinner("Updating bookmark...", () => api.updateRaindrop(id, patchData));
    output(result, options.format);
  });
}

export async function cmdDelete(args: string[], options: GlobalOptions): Promise<void> {
  const runCommand = createCommandRunner(options.format);
  const id = parseInt(args[0] ?? "", 10);

  if (Number.isNaN(id)) {
    outputError("Invalid raindrop ID", 400, undefined, options.format);
  }

  const api = getAuthenticatedAPI(options);

  await runCommand(async () => {
    const success = await withSpinner("Deleting bookmark...", () => api.deleteRaindrop(id));
    output({ success }, options.format);
  });
}
