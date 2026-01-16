#!/usr/bin/env bun

import { RaindropAPI, RaindropError } from './api';
import type {
  CollectionCreate,
  CollectionUpdate,
  RaindropUpdate,
} from './api';
import {
  getToken,
  saveConfig,
  deleteConfig,
  output,
  outputError,
  type OutputFormat,
  type GlobalOptions,
} from './utils';

const VERSION = '0.1.0';

function parseGlobalOptions(args: string[]): {
  globalOptions: GlobalOptions;
  remainingArgs: string[];
} {
  const globalOptions: GlobalOptions = {
    dryRun: false,
    format: 'toon',
  };

  const remainingArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--dry-run') {
      globalOptions.dryRun = true;
    } else if (arg === '--format' || arg === '-f') {
      i++;
      const format = args[i] ?? '';
      if (format === 'json' || format === 'toon') {
        globalOptions.format = format;
      }
    } else if (arg.startsWith('--format=')) {
      const format = arg.split('=')[1] ?? '';
      if (format === 'json' || format === 'toon') {
        globalOptions.format = format;
      }
    } else {
      remainingArgs.push(arg);
    }
  }

  return { globalOptions, remainingArgs };
}

function getAuthenticatedAPI(options: GlobalOptions): RaindropAPI {
  const token = getToken();
  if (!token) {
    outputError('Not logged in. Run `raindrop login` first.', 401);
    process.exit(1);
  }
  return new RaindropAPI(token, options.dryRun);
}

async function handleError(error: unknown): Promise<never> {
  if (error instanceof RaindropError) {
    let hint = error.hint;
    if (!hint) {
      if (error.statusCode === 404) {
        hint = 'The requested resource was not found. Verify the ID is correct.';
      } else if (error.statusCode === 401) {
        hint = "Authentication failed. Try running 'raindrop login' again.";
      }
    }
    outputError(error.message, error.statusCode, hint);
  } else if (error instanceof SyntaxError) {
    outputError('Invalid JSON input provided to command.', 400, 'Ensure your JSON data is valid and properly escaped for the shell.');
  } else {
    outputError(`Unexpected error: ${error}`, 500, 'Check the CLI logs or report this issue.');
  }
  process.exit(1);
}

async function cmdLogin(args: string[], _options: GlobalOptions): Promise<void> {
  let token = args[0] ?? '';

  if (!token) {
    process.stdout.write('Enter your Raindrop.io API Token: ');
    const prompt = await import('readline');
    const rl = prompt.createInterface({ input: process.stdin, output: process.stdout });
    token = await new Promise((resolve) => {
      rl.question('', (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  if (!token) {
    outputError('Token is required', 400);
    return;
  }

  console.log('Verifying token...');
  const api = new RaindropAPI(token);

  try {
    const user = await api.getUser();
    await saveConfig({ token });
    console.log(`Success! Logged in as ${user.fullName}.`);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdLogout(): Promise<void> {
  await deleteConfig();
  console.log('Logged out. Credentials removed.');
}

async function cmdWhoami(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  try {
    const user = await api.getUser();
    output(user, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdContext(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  try {
    const [user, stats, recent, collections] = await Promise.all([
      api.getUser(),
      api.getStats(),
      api.search('', 0),
      api.getCollections(),
    ]);

    const totalBookmarks = stats.find((s) => s._id === 0)?.count ?? 0;

    const contextData = {
      user: [{ id: user._id, name: user.fullName }],
      stats: [{ total_bookmarks: totalBookmarks, total_collections: collections.length }],
      structure: {
        root_collections: collections
          .filter((c) => !c.parent)
          .map((c) => ({ id: c._id, title: c.title, count: c.count })),
      },
      recent_activity: recent.slice(0, 5).map((r) => ({
        id: r._id,
        title: r.title,
        created: r.created,
      })),
    };

    output(contextData, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdStructure(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  try {
    const [collections, tags] = await Promise.all([
      api.getCollections(),
      api.getTags(),
    ]);

    output(
      {
        collections: collections.map((c) => ({
          id: c._id,
          title: c.title,
          count: c.count,
          parent_id: c.parent?.$id ?? null,
          last_update: c.lastUpdate,
        })),
        tags: tags.map((t) => t._id),
      },
      options.format
    );
  } catch (error) {
    await handleError(error);
  }
}

function cmdSchema(): void {
  const schemas = {
    Raindrop: {
      type: 'object',
      properties: {
        link: { type: 'string', required: true },
        title: { type: 'string' },
        excerpt: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        collection: { type: 'object', properties: { $id: { type: 'number' } } },
        important: { type: 'boolean' },
        cover: { type: 'string' },
        note: { type: 'string' },
      },
    },
    Collection: {
      type: 'object',
      properties: {
        title: { type: 'string', required: true },
        parent: { type: 'object', properties: { $id: { type: 'number' } } },
        public: { type: 'boolean' },
        view: { type: 'string', enum: ['list', 'simple', 'grid', 'masonry'] },
      },
    },
  };

  const usageExamples = {
    patch_update_title_tags: "raindrop patch <id> '{\"title\": \"New Title\", \"tags\": [\"ai\", \"cli\"]}'",
    move_single_bookmark: "raindrop patch <id> '{\"collection\": {\"$id\": <target_col_id>}}'",
    move_batch_bookmarks: "raindrop batch update --ids 1,2 --collection <source_col_id> '{\"collection\": {\"$id\": <target_col_id>}}'",
    create_collection: 'raindrop collection create "Research" --public',
    search_with_tags: 'raindrop search "python tag:important"',
  };

  console.log(JSON.stringify({ schemas, usage_examples: usageExamples }, null, 2));
}

async function cmdSearch(args: string[], options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);

  let query = '';
  let collectionId = 0;
  let pretty = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--collection' || arg === '-c') {
      i++;
      collectionId = parseInt(args[i] ?? '0', 10);
    } else if (arg === '--pretty' || arg === '-p') {
      pretty = true;
    } else if (!arg.startsWith('-')) {
      query = arg;
    }
  }

  try {
    const results = await api.search(query, collectionId);

    if (pretty) {
      console.log(`\n${'ID'.padEnd(12)}${'Title'.padEnd(50)}${'Tags'.padEnd(30)}Link`);
      console.log('-'.repeat(120));
      for (const r of results) {
        const title = r.title.length > 47 ? r.title.slice(0, 47) + '...' : r.title;
        const tags = r.tags.join(', ');
        const tagsDisplay = tags.length > 27 ? tags.slice(0, 27) + '...' : tags;
        const link = r.link.length > 40 ? r.link.slice(0, 40) + '...' : r.link;
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
            tags: r.tags.join(','),
            type: r.type || 'link',
            created: r.created,
          })),
        },
        options.format
      );
    }
  } catch (error) {
    await handleError(error);
  }
}

async function cmdGet(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  if (isNaN(id)) {
    outputError('Invalid raindrop ID', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const result = await api.getRaindrop(id);
    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdSuggest(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  if (isNaN(id)) {
    outputError('Invalid raindrop ID', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const suggestions = await api.getSuggestions(id);
    output(suggestions, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdWayback(args: string[], options: GlobalOptions): Promise<void> {
  const url = args[0] ?? '';
  if (!url) {
    outputError('URL is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const snapshot = await api.checkWayback(url);
    output({ url, snapshot }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdAdd(args: string[], options: GlobalOptions): Promise<void> {
  let url = '';
  let title: string | undefined;
  let tags: string[] | undefined;
  let collectionId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--title' || arg === '-t') {
      i++;
      title = args[i];
    } else if (arg === '--tags') {
      i++;
      tags = (args[i] ?? '').split(',').map((t) => t.trim());
    } else if (arg === '--collection' || arg === '-c') {
      i++;
      collectionId = parseInt(args[i] ?? '', 10);
    } else if (!arg.startsWith('-')) {
      url = arg;
    }
  }

  if (!url) {
    outputError('URL is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const result = await api.addRaindrop({
      link: url,
      title,
      tags,
      collection: collectionId ? { $id: collectionId } : undefined,
    });
    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdPatch(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  const dataJson = args[1] ?? '';

  if (isNaN(id)) {
    outputError('Invalid raindrop ID', 400);
    return;
  }

  if (!dataJson) {
    outputError('JSON patch data is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const patchData: RaindropUpdate = JSON.parse(dataJson);
    const result = await api.updateRaindrop(id, patchData);
    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdDelete(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  if (isNaN(id)) {
    outputError('Invalid raindrop ID', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.deleteRaindrop(id);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionCreate(args: string[], options: GlobalOptions): Promise<void> {
  let title = '';
  let parentId: number | undefined;
  let isPublic: boolean | undefined;
  let view: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--parent') {
      i++;
      parentId = parseInt(args[i] ?? '', 10);
    } else if (arg === '--public') {
      isPublic = true;
    } else if (arg === '--private') {
      isPublic = false;
    } else if (arg === '--view') {
      i++;
      view = args[i];
    } else if (!arg.startsWith('-')) {
      title = arg;
    }
  }

  if (!title) {
    outputError('Collection title is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const collection: CollectionCreate = {
      title,
      parent: parentId ? { $id: parentId } : undefined,
      public: isPublic,
      view: view as CollectionCreate['view'],
    };
    const result = await api.createCollection(collection);
    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionGet(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  if (isNaN(id)) {
    outputError('Invalid collection ID', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const result = await api.getCollection(id);
    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionUpdate(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  const dataJson = args[1] ?? '';

  if (isNaN(id)) {
    outputError('Invalid collection ID', 400);
    return;
  }

  if (!dataJson) {
    outputError('JSON patch data is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const patchData: CollectionUpdate = JSON.parse(dataJson);
    const result = await api.updateCollection(id, patchData);
    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionDelete(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  if (isNaN(id)) {
    outputError('Invalid collection ID', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.deleteCollection(id);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionDeleteMultiple(args: string[], options: GlobalOptions): Promise<void> {
  const idsArg = args[0] ?? '';
  if (!idsArg) {
    outputError('Collection IDs are required (comma-separated)', 400);
    return;
  }

  const ids = idsArg.split(',').map((id) => parseInt(id.trim(), 10));
  if (ids.some(isNaN)) {
    outputError('Invalid collection IDs', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.deleteCollections(ids);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionReorder(args: string[], options: GlobalOptions): Promise<void> {
  const sort = args[0] ?? '';
  if (!sort) {
    outputError('Sort order is required (title, -title, -count)', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.reorderCollections(sort);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionExpandAll(args: string[], options: GlobalOptions): Promise<void> {
  const expanded = (args[0] ?? '').toLowerCase() === 'true';

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.expandAllCollections(expanded);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionMerge(args: string[], options: GlobalOptions): Promise<void> {
  const idsArg = args[0] ?? '';
  const targetId = parseInt(args[1] ?? '', 10);

  if (!idsArg) {
    outputError('Source collection IDs are required (comma-separated)', 400);
    return;
  }

  if (isNaN(targetId)) {
    outputError('Target collection ID is required', 400);
    return;
  }

  const ids = idsArg.split(',').map((id) => parseInt(id.trim(), 10));
  if (ids.some(isNaN)) {
    outputError('Invalid collection IDs', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.mergeCollections(ids, targetId);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionClean(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  try {
    const count = await api.cleanEmptyCollections();
    output({ removed_count: count }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionEmptyTrash(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.emptyTrash();
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionCover(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  const source = args[1] ?? '';

  if (isNaN(id)) {
    outputError('Invalid collection ID', 400);
    return;
  }

  if (!source) {
    outputError('Cover image path or URL is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    let filePath = source;
    let isTemp = false;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      console.log(`Downloading cover from ${source}...`);
      const response = await fetch(source);
      if (!response.ok) {
        outputError(`Failed to download image: ${response.status}`, response.status);
        return;
      }
      filePath = '/tmp/raindrop_cover_temp.png';
      await Bun.write(filePath, await response.arrayBuffer());
      isTemp = true;
    }

    console.log(`Uploading cover to collection ${id}...`);
    const result = await api.uploadCollectionCover(id, filePath);

    if (isTemp) {
      await Bun.$`rm -f ${filePath}`;
    }

    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdCollectionSetIcon(args: string[], options: GlobalOptions): Promise<void> {
  const id = parseInt(args[0] ?? '', 10);
  const query = args[1] ?? '';

  if (isNaN(id)) {
    outputError('Invalid collection ID', 400);
    return;
  }

  if (!query) {
    outputError('Icon search query is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    console.log(`Searching icons for '${query}'...`);
    const icons = await api.searchCovers(query);

    if (icons.length === 0) {
      outputError('No icons found', 404);
      return;
    }

    const iconUrl = icons[0];
    if (!iconUrl) {
      outputError('No icons found', 404);
      return;
    }

    console.log('Found icon, downloading...');

    const response = await fetch(iconUrl);
    if (!response.ok) {
      outputError(`Failed to download icon: ${response.status}`, response.status);
      return;
    }

    const filePath = '/tmp/raindrop_icon_temp.png';
    await Bun.write(filePath, await response.arrayBuffer());

    console.log(`Uploading icon to collection ${id}...`);
    const result = await api.uploadCollectionCover(id, filePath);

    await Bun.$`rm -f ${filePath}`;

    output(result, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdTagDelete(args: string[], options: GlobalOptions): Promise<void> {
  let collectionId = 0;
  const tags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--collection' || arg === '-c') {
      i++;
      collectionId = parseInt(args[i] ?? '0', 10);
    } else if (!arg.startsWith('-')) {
      tags.push(arg);
    }
  }

  if (tags.length === 0) {
    outputError('At least one tag is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.deleteTags(tags, collectionId);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdTagRename(args: string[], options: GlobalOptions): Promise<void> {
  let collectionId = 0;
  let oldName = '';
  let newName = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--collection' || arg === '-c') {
      i++;
      collectionId = parseInt(args[i] ?? '0', 10);
    } else if (!arg.startsWith('-')) {
      if (!oldName) {
        oldName = arg;
      } else {
        newName = arg;
      }
    }
  }

  if (!oldName || !newName) {
    outputError('Both old and new tag names are required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.renameTag(oldName, newName, collectionId);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdBatchUpdate(args: string[], options: GlobalOptions): Promise<void> {
  let ids: number[] = [];
  let collectionId = 0;
  let dataJson = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--ids') {
      i++;
      ids = (args[i] ?? '').split(',').map((id) => parseInt(id.trim(), 10));
    } else if (arg === '--collection' || arg === '-c') {
      i++;
      collectionId = parseInt(args[i] ?? '0', 10);
    } else if (!arg.startsWith('-')) {
      dataJson = arg;
    }
  }

  if (ids.length === 0) {
    outputError('--ids is required (comma-separated list)', 400);
    return;
  }

  if (!dataJson) {
    outputError('JSON patch data is required', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const patchData: RaindropUpdate = JSON.parse(dataJson);
    const success = await api.batchUpdateRaindrops(collectionId, ids, patchData);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

async function cmdBatchDelete(args: string[], options: GlobalOptions): Promise<void> {
  let ids: number[] = [];
  let collectionId = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? '';
    if (arg === '--ids') {
      i++;
      ids = (args[i] ?? '').split(',').map((id) => parseInt(id.trim(), 10));
    } else if (arg === '--collection' || arg === '-c') {
      i++;
      collectionId = parseInt(args[i] ?? '0', 10);
    }
  }

  if (ids.length === 0) {
    outputError('--ids is required (comma-separated list)', 400);
    return;
  }

  const api = getAuthenticatedAPI(options);
  try {
    const success = await api.batchDeleteRaindrops(collectionId, ids);
    output({ success }, options.format);
  } catch (error) {
    await handleError(error);
  }
}

function printHelp(): void {
  console.log(`
raindrop-cli v${VERSION}
AI-native CLI for Raindrop.io

USAGE:
  raindrop [OPTIONS] <COMMAND> [ARGS]

GLOBAL OPTIONS:
  --dry-run         Log actions instead of making real API requests
  --format, -f      Output format: toon (default) or json

COMMANDS:
  Authentication:
    login [token]         Login with your Raindrop.io API token
    logout                Remove stored credentials
    whoami                Show current user details

  Overview:
    context               Show high-level account context (User, Stats, Recent Activity)
    structure             Show collections and tags
    schema                Dump JSON schemas and usage examples (for AI context)

  Bookmarks:
    search [query]        Search for bookmarks (--pretty for table, --collection <id>)
    get <id>              Get full details for a specific bookmark
    suggest <id>          Get tag/collection suggestions for a bookmark
    wayback <url>         Check if a URL is available in the Wayback Machine
    add <url>             Add a new bookmark (--title, --tags, --collection)
    patch <id> <json>     Update a bookmark with a JSON patch
    delete <id>           Delete a bookmark

  Collections:
    collection create <title>     Create a new collection (--parent, --public, --view)
    collection get <id>           Get details of a specific collection
    collection update <id> <json> Update a collection with a JSON patch
    collection delete <id>        Delete a collection
    collection delete-multiple <ids>  Delete multiple collections (comma-separated)
    collection reorder <sort>     Reorder collections (title, -title, -count)
    collection expand-all <bool>  Expand or collapse all collections
    collection merge <ids> <target>   Merge collections into target
    collection clean              Remove all empty collections
    collection empty-trash        Empty the trash collection
    collection cover <id> <source>    Upload a cover image (file path or URL)
    collection set-icon <id> <query>  Search and set a collection icon

  Tags:
    tag delete <tags...>      Delete tags (--collection for scope)
    tag rename <old> <new>    Rename a tag (--collection for scope)

  Batch Operations:
    batch update --ids <ids> <json>   Update multiple bookmarks
    batch delete --ids <ids>          Delete multiple bookmarks

EXAMPLES:
  raindrop login
  raindrop context
  raindrop search "python" --pretty
  raindrop add "https://example.com" --title "Example" --tags "work,reference"
  raindrop collection create "Research" --public
  raindrop batch update --ids 1,2,3 '{"tags": ["archived"]}'
`);
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp();
    return;
  }

  if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
    console.log(`raindrop-cli v${VERSION}`);
    return;
  }

  const { globalOptions, remainingArgs } = parseGlobalOptions(rawArgs);
  const command = remainingArgs[0] ?? '';
  const commandArgs = remainingArgs.slice(1);

  switch (command) {
    case 'login':
      await cmdLogin(commandArgs, globalOptions);
      break;
    case 'logout':
      await cmdLogout();
      break;
    case 'whoami':
      await cmdWhoami(globalOptions);
      break;
    case 'context':
      await cmdContext(globalOptions);
      break;
    case 'structure':
      await cmdStructure(globalOptions);
      break;
    case 'schema':
      cmdSchema();
      break;
    case 'search':
      await cmdSearch(commandArgs, globalOptions);
      break;
    case 'get':
      await cmdGet(commandArgs, globalOptions);
      break;
    case 'suggest':
      await cmdSuggest(commandArgs, globalOptions);
      break;
    case 'wayback':
      await cmdWayback(commandArgs, globalOptions);
      break;
    case 'add':
      await cmdAdd(commandArgs, globalOptions);
      break;
    case 'patch':
      await cmdPatch(commandArgs, globalOptions);
      break;
    case 'delete':
      await cmdDelete(commandArgs, globalOptions);
      break;
    case 'collection': {
      const subCommand = commandArgs[0] ?? '';
      const subArgs = commandArgs.slice(1);
      switch (subCommand) {
        case 'create':
          await cmdCollectionCreate(subArgs, globalOptions);
          break;
        case 'get':
          await cmdCollectionGet(subArgs, globalOptions);
          break;
        case 'update':
          await cmdCollectionUpdate(subArgs, globalOptions);
          break;
        case 'delete':
          await cmdCollectionDelete(subArgs, globalOptions);
          break;
        case 'delete-multiple':
          await cmdCollectionDeleteMultiple(subArgs, globalOptions);
          break;
        case 'reorder':
          await cmdCollectionReorder(subArgs, globalOptions);
          break;
        case 'expand-all':
          await cmdCollectionExpandAll(subArgs, globalOptions);
          break;
        case 'merge':
          await cmdCollectionMerge(subArgs, globalOptions);
          break;
        case 'clean':
          await cmdCollectionClean(globalOptions);
          break;
        case 'empty-trash':
          await cmdCollectionEmptyTrash(globalOptions);
          break;
        case 'cover':
          await cmdCollectionCover(subArgs, globalOptions);
          break;
        case 'set-icon':
          await cmdCollectionSetIcon(subArgs, globalOptions);
          break;
        default:
          outputError(`Unknown collection subcommand: ${subCommand}`, 400);
      }
      break;
    }
    case 'tag': {
      const subCommand = commandArgs[0] ?? '';
      const subArgs = commandArgs.slice(1);
      switch (subCommand) {
        case 'delete':
          await cmdTagDelete(subArgs, globalOptions);
          break;
        case 'rename':
          await cmdTagRename(subArgs, globalOptions);
          break;
        default:
          outputError(`Unknown tag subcommand: ${subCommand}`, 400);
      }
      break;
    }
    case 'batch': {
      const subCommand = commandArgs[0] ?? '';
      const subArgs = commandArgs.slice(1);
      switch (subCommand) {
        case 'update':
          await cmdBatchUpdate(subArgs, globalOptions);
          break;
        case 'delete':
          await cmdBatchDelete(subArgs, globalOptions);
          break;
        default:
          outputError(`Unknown batch subcommand: ${subCommand}`, 400);
      }
      break;
    }
    default:
      outputError(`Unknown command: ${command}`, 400, 'Run "raindrop --help" for usage.');
  }
}

main().catch(handleError);
