#!/usr/bin/env bun

import { Command } from "commander";
import { RaindropError } from "./api";
import {
  cmdAdd,
  cmdBatchDelete,
  cmdBatchUpdate,
  cmdCollectionClean,
  cmdCollectionCover,
  cmdCollectionCreate,
  cmdCollectionDelete,
  cmdCollectionDeleteMultiple,
  cmdCollectionEmptyTrash,
  cmdCollectionExpandAll,
  cmdCollectionGet,
  cmdCollectionMerge,
  cmdCollectionReorder,
  cmdCollectionSetIcon,
  cmdCollectionUpdate,
  cmdContext,
  cmdDelete,
  cmdGet,
  cmdLogin,
  cmdLogout,
  cmdPatch,
  cmdSchema,
  cmdSearch,
  cmdStructure,
  cmdSuggest,
  cmdTagDelete,
  cmdTagRename,
  cmdWayback,
  cmdWhoami,
} from "./commands";
import { CLIError, type GlobalOptions, type OutputFormat } from "./utils";

const VERSION = "0.1.0";

function getGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  return {
    dryRun: opts.dryRun ?? false,
    format: (opts.format as OutputFormat) ?? "toon",
  };
}

function formatAndExit(error: string, statusCode: number, hint?: string, format: OutputFormat = "toon"): never {
  const errorData = { error, status: statusCode, hint };

  if (format === "toon") {
    console.error(`error: ${error}`);
    console.error(`status: ${statusCode}`);
    if (hint) console.error(`hint: ${hint}`);
  } else {
    console.error(JSON.stringify(errorData, null, 2));
  }

  process.exit(1);
}

function withErrorHandler<T extends unknown[]>(fn: (...args: T) => Promise<void>): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
}

function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    formatAndExit(error.message, error.statusCode, error.hint);
  } else if (error instanceof RaindropError) {
    let hint = error.hint;
    if (!hint) {
      if (error.statusCode === 404) {
        hint = "The requested resource was not found. Verify the ID is correct.";
      } else if (error.statusCode === 401) {
        hint = "Authentication failed. Try running 'raindrop login' again.";
      }
    }
    formatAndExit(error.message, error.statusCode, hint);
  } else if (error instanceof SyntaxError) {
    formatAndExit(
      "Invalid JSON input provided to command.",
      400,
      "Ensure your JSON data is valid and properly escaped for the shell.",
    );
  } else {
    formatAndExit(`Unexpected error: ${error}`, 500, "Check the CLI logs or report this issue.");
  }
}

const program = new Command();

program
  .name("raindrop")
  .description("AI-native CLI for Raindrop.io")
  .version(VERSION, "-v, --version")
  .option("--dry-run", "Log actions instead of making real API requests", false)
  .option("-f, --format <format>", "Output format: toon (default) or json", "toon");

program
  .command("login")
  .description("Login with your Raindrop.io API token")
  .argument("[token]", "API token (will prompt if not provided)")
  .action(
    withErrorHandler(async (token: string | undefined, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdLogin(token ? [token] : [], globalOpts);
    }),
  );

program
  .command("logout")
  .description("Remove stored credentials")
  .action(
    withErrorHandler(async (_options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdLogout(globalOpts);
    }),
  );

program
  .command("whoami")
  .description("Show current user details")
  .action(
    withErrorHandler(async (_options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdWhoami(globalOpts);
    }),
  );

program
  .command("context")
  .description("Show high-level account context (User, Stats, Recent Activity)")
  .action(
    withErrorHandler(async (_options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdContext(globalOpts);
    }),
  );

program
  .command("structure")
  .description("Show collections and tags")
  .action(
    withErrorHandler(async (_options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdStructure(globalOpts);
    }),
  );

program
  .command("schema")
  .description("Dump JSON schemas and usage examples (for AI context)")
  .action(() => {
    cmdSchema();
  });

program
  .command("search")
  .description("Search for bookmarks")
  .argument("[query]", "Search query", "")
  .option("-c, --collection <id>", "Filter by collection ID")
  .option("-l, --limit <count>", "Maximum results to return", "50")
  .option("-p, --pretty", "Display as formatted table")
  .action(
    withErrorHandler(async (query: string, options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = [query];
      if (options.collection) args.push("--collection", options.collection);
      if (options.limit) args.push("--limit", options.limit);
      if (options.pretty) args.push("--pretty");
      await cmdSearch(args, globalOpts);
    }),
  );

program
  .command("get")
  .description("Get full details for a specific bookmark")
  .argument("<id>", "Bookmark ID")
  .action(
    withErrorHandler(async (id: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdGet([id], globalOpts);
    }),
  );

program
  .command("suggest")
  .description("Get tag/collection suggestions for a bookmark")
  .argument("<id>", "Bookmark ID")
  .action(
    withErrorHandler(async (id: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdSuggest([id], globalOpts);
    }),
  );

program
  .command("wayback")
  .description("Check if a URL is available in the Wayback Machine")
  .argument("<url>", "URL to check")
  .action(
    withErrorHandler(async (url: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdWayback([url], globalOpts);
    }),
  );

program
  .command("add")
  .description("Add a new bookmark")
  .argument("<url>", "URL to bookmark")
  .option("-t, --title <title>", "Bookmark title")
  .option("--tags <tags>", "Comma-separated tags")
  .option("-c, --collection <id>", "Collection ID")
  .action(
    withErrorHandler(async (url: string, options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = [url];
      if (options.title) args.push("--title", options.title);
      if (options.tags) args.push("--tags", options.tags);
      if (options.collection) args.push("--collection", options.collection);
      await cmdAdd(args, globalOpts);
    }),
  );

program
  .command("patch")
  .description("Update a bookmark with a JSON patch")
  .argument("<id>", "Bookmark ID")
  .argument("<json>", "JSON patch data")
  .action(
    withErrorHandler(async (id: string, json: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdPatch([id, json], globalOpts);
    }),
  );

program
  .command("delete")
  .description("Delete a bookmark")
  .argument("<id>", "Bookmark ID")
  .action(
    withErrorHandler(async (id: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdDelete([id], globalOpts);
    }),
  );

const collectionCmd = program.command("collection").description("Manage collections");

collectionCmd
  .command("create")
  .description("Create a new collection")
  .argument("<title>", "Collection title")
  .option("--parent <id>", "Parent collection ID")
  .option("--public", "Make collection public")
  .option("--private", "Make collection private")
  .option("--view <view>", "View type: list, simple, grid, masonry")
  .action(
    withErrorHandler(async (title: string, options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = [title];
      if (options.parent) args.push("--parent", options.parent);
      if (options.public) args.push("--public");
      if (options.private) args.push("--private");
      if (options.view) args.push("--view", options.view);
      await cmdCollectionCreate(args, globalOpts);
    }),
  );

collectionCmd
  .command("get")
  .description("Get details of a specific collection")
  .argument("<id>", "Collection ID")
  .action(
    withErrorHandler(async (id: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionGet([id], globalOpts);
    }),
  );

collectionCmd
  .command("update")
  .description("Update a collection with a JSON patch")
  .argument("<id>", "Collection ID")
  .argument("<json>", "JSON patch data")
  .action(
    withErrorHandler(async (id: string, json: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionUpdate([id, json], globalOpts);
    }),
  );

collectionCmd
  .command("delete")
  .description("Delete a collection")
  .argument("<id>", "Collection ID")
  .action(
    withErrorHandler(async (id: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionDelete([id], globalOpts);
    }),
  );

collectionCmd
  .command("delete-multiple")
  .description("Delete multiple collections")
  .argument("<ids>", "Comma-separated collection IDs")
  .action(
    withErrorHandler(async (ids: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionDeleteMultiple([ids], globalOpts);
    }),
  );

collectionCmd
  .command("reorder")
  .description("Reorder collections")
  .argument("<sort>", "Sort order: title, -title, -count")
  .action(
    withErrorHandler(async (sort: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionReorder([sort], globalOpts);
    }),
  );

collectionCmd
  .command("expand-all")
  .description("Expand or collapse all collections")
  .argument("<expanded>", "true or false")
  .action(
    withErrorHandler(async (expanded: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionExpandAll([expanded], globalOpts);
    }),
  );

collectionCmd
  .command("merge")
  .description("Merge collections into target")
  .argument("<ids>", "Comma-separated source collection IDs")
  .argument("<target>", "Target collection ID")
  .action(
    withErrorHandler(async (ids: string, target: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionMerge([ids, target], globalOpts);
    }),
  );

collectionCmd
  .command("clean")
  .description("Remove all empty collections")
  .action(
    withErrorHandler(async (_options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionClean(globalOpts);
    }),
  );

collectionCmd
  .command("empty-trash")
  .description("Empty the trash collection")
  .action(
    withErrorHandler(async (_options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionEmptyTrash(globalOpts);
    }),
  );

collectionCmd
  .command("cover")
  .description("Upload a cover image (file path or URL)")
  .argument("<id>", "Collection ID")
  .argument("<source>", "Image file path or URL")
  .action(
    withErrorHandler(async (id: string, source: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionCover([id, source], globalOpts);
    }),
  );

collectionCmd
  .command("set-icon")
  .description("Search and set a collection icon")
  .argument("<id>", "Collection ID")
  .argument("<query>", "Icon search query")
  .action(
    withErrorHandler(async (id: string, query: string, _options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      await cmdCollectionSetIcon([id, query], globalOpts);
    }),
  );

const tagCmd = program.command("tag").description("Manage tags");

tagCmd
  .command("delete")
  .description("Delete tags")
  .argument("<tags...>", "Tags to delete")
  .option("-c, --collection <id>", "Scope to collection ID")
  .action(
    withErrorHandler(async (tags: string[], options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = [...tags];
      if (options.collection) args.push("--collection", options.collection);
      await cmdTagDelete(args, globalOpts);
    }),
  );

tagCmd
  .command("rename")
  .description("Rename a tag")
  .argument("<old>", "Old tag name")
  .argument("<new>", "New tag name")
  .option("-c, --collection <id>", "Scope to collection ID")
  .action(
    withErrorHandler(async (oldName: string, newName: string, options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = [oldName, newName];
      if (options.collection) args.push("--collection", options.collection);
      await cmdTagRename(args, globalOpts);
    }),
  );

const batchCmd = program.command("batch").description("Batch operations");

batchCmd
  .command("update")
  .description("Update multiple bookmarks")
  .argument("<json>", "JSON patch data")
  .requiredOption("--ids <ids>", "Comma-separated bookmark IDs")
  .option("-c, --collection <id>", "Collection ID for scope")
  .action(
    withErrorHandler(async (json: string, options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = ["--ids", options.ids];
      if (options.collection) args.push("--collection", options.collection);
      args.push(json);
      await cmdBatchUpdate(args, globalOpts);
    }),
  );

batchCmd
  .command("delete")
  .description("Delete multiple bookmarks")
  .requiredOption("--ids <ids>", "Comma-separated bookmark IDs")
  .option("-c, --collection <id>", "Collection ID for scope")
  .action(
    withErrorHandler(async (options, cmd: Command) => {
      const globalOpts = getGlobalOptions(cmd);
      const args: string[] = ["--ids", options.ids];
      if (options.collection) args.push("--collection", options.collection);
      await cmdBatchDelete(args, globalOpts);
    }),
  );

program.parse();
