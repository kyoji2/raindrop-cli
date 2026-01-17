# RaindropCLI Command Reference

Detailed reference for all RaindropCLI commands, options, and API schemas.

## Architecture

Built with:
- **Bun**: JavaScript runtime (fast, modern)
- **Commander.js**: CLI argument parsing
- **Zod**: Runtime schema validation
- **TOON format**: Token-optimized output for AI agents

Project structure:
```
src/
├── index.ts              # CLI entry point
├── api/
│   ├── client.ts         # RaindropAPI class (HTTP client)
│   ├── schemas.ts        # Zod schemas for validation
│   └── types.ts          # TypeScript types
├── commands/
│   ├── auth.ts           # login, logout, whoami
│   ├── raindrops.ts      # search, get, add, patch, delete, suggest, wayback
│   ├── collections.ts    # Collection management
│   ├── tags.ts           # Tag operations
│   ├── batch.ts          # Batch operations
│   └── overview.ts       # context, structure, schema
└── utils/
    ├── output.ts         # Output formatting
    ├── config.ts         # Config management
    ├── spinner.ts        # Loading indicators
    └── tempfile.ts       # Temp file utilities
```

## API Client Features

The `RaindropAPI` class provides:
- Automatic retry (3 attempts) with exponential backoff
- Per-request timeout (60s default) via AbortController
- Zod validation on all API responses
- Dry-run mode for safe testing
- Token-based authentication

## Complete Command Reference

### Authentication Commands

#### `raindrop login [token]`
Authenticate with Raindrop.io API.

**Arguments:**
- `token` (optional): API token. If not provided, prompts interactively.

**Getting a token:**
1. Visit https://app.raindrop.io/settings/integrations
2. Create a new app or use existing test token
3. Copy the token (starts with `test_...` for test tokens)

**Examples:**
```bash
raindrop login
raindrop login "test_abcd1234..."
```

#### `raindrop logout`
Remove stored credentials from config file.

**Examples:**
```bash
raindrop logout
```

#### `raindrop whoami`
Display current authenticated user details.

**Output:**
- User ID
- Full name
- Email address
- Pro status (boolean)
- Registration date

**Examples:**
```bash
raindrop whoami
raindrop whoami --format json
```

### Context & Overview Commands

#### `raindrop context`
Display high-level account overview.

**Output:**
- User details (ID, name, email, pro status)
- Statistics (total collections, bookmarks)
- Recent activity

Use this to understand the account before performing operations.

**Examples:**
```bash
raindrop context
```

#### `raindrop structure`
Display collection hierarchy and all tags.

**Output:**
- All collections with IDs, titles, counts
- Collection parent/child relationships
- All tags with bookmark counts

**Examples:**
```bash
raindrop structure
raindrop structure --format json
```

#### `raindrop schema`
Dump JSON schemas and usage examples.

**Output:**
- Complete Zod schemas for all API types
- Raindrop (bookmark) schema
- Collection schema
- User schema
- Tag schema
- API response schemas

Useful for:
- AI context when building automation
- Understanding API structure
- Validation reference

**Examples:**
```bash
raindrop schema > schemas.txt
```

### Bookmark (Raindrop) Commands

#### `raindrop search [query]`
Search for bookmarks.

**Arguments:**
- `query` (optional): Search query string. Empty string searches all.

**Options:**
- `-c, --collection <id>`: Filter by collection ID
  - Use `-1` for all bookmarks
  - Use `0` for unsorted
  - Use collection ID for specific collection
- `-l, --limit <count>`: Maximum results (default: 50)
- `-p, --pretty`: Display as formatted table (more readable)

**Query syntax:**

Raindrop.io supports powerful search operators for precise filtering:

**Basic Text Search:**
- `apple iphone` - Search across title, description, domain, or content
- `"exact phrase"` - Match exact phrases
- `-excluded` - Exclude terms (e.g., `javascript -react`)
- `match:OR` - Boolean OR logic (e.g., `python match:OR java`)

**Tag Search:**
- `#tag` - Find items with specific tag
- `#"multi word tag"` - Multi-word tags
- `#tag1 #tag2` - Multiple tags (AND logic by default)
- `notag:true` - Find untagged items

**Field-Specific Search:**
- `title:keyword` - Search only in titles
- `excerpt:keyword` - Search in descriptions
- `note:keyword` - Search in user notes
- `link:domain.com` - Search URLs/domains

**Type Filters:**
- `type:link` - Web links
- `type:article` - Articles
- `type:image` - Images
- `type:video` - Videos
- `type:document` - Documents
- `type:audio` - Audio files

**Date Filters:**
- `created:2024-01-15` - Exact creation date
- `created:>2024-01-01` - Created after date
- `created:<2024-12-31` - Created before date
- `lastUpdate:2024-01-15` - Last modified date

**Status & Special Filters:**
- `❤️` or `important:true` - Starred/favorite items
- `file:true` - Items with uploaded files
- `cache.status:ready` - Items with permanent copies
- `reminder:true` - Items with reminders

**Examples:**
```bash
# Basic search
raindrop search "javascript tutorial"

# Search in specific collection
raindrop search "javascript" -c 12345

# Find untagged articles
raindrop search "notag:true type:article"

# Find starred items created after Jan 1, 2024
raindrop search "❤️ created:>2024-01-01"

# Search by domain
raindrop search "link:github.com"

# Find items with "API" in title, exclude "REST"
raindrop search "title:API -REST"

# Multi-word tag with type filter
raindrop search '#"web development" type:article' -l 100

# Complex query with multiple filters
raindrop search "#tutorial type:video created:>2024-01-01 -beginner" -l 20

# Find items with notes containing TODO
raindrop search "note:TODO"

# Find all bookmarks (any collection)
raindrop search "" -c -1 --pretty
```

#### `raindrop get <id>`
Get full details for a specific bookmark.

**Arguments:**
- `id` (required): Bookmark ID

**Output:**
Complete bookmark object including:
- `_id`: Bookmark ID
- `link`: URL
- `title`: Bookmark title
- `excerpt`: Description/notes
- `note`: User notes
- `tags`: Array of tags
- `important`: Star/favorite status
- `collection`: Collection object with `$id` and `title`
- `created`: Creation timestamp
- `lastUpdate`: Last modified timestamp
- `media`: Array of images/videos
- `type`: link, article, image, video
- `domain`: Extracted domain

**Examples:**
```bash
raindrop get 123456
raindrop get 123456 --format json
```

#### `raindrop add <url>`
Add a new bookmark.

**Arguments:**
- `url` (required): URL to bookmark

**Options:**
- `-t, --title <title>`: Bookmark title (defaults to page title)
- `--tags <tags>`: Comma-separated tags
- `-c, --collection <id>`: Collection ID (defaults to unsorted)

**Examples:**
```bash
raindrop add "https://example.com"
raindrop add "https://example.com" -t "My Example"
raindrop add "https://example.com" --tags "web,development"
raindrop add "https://example.com" -t "Work Doc" --tags "work,docs" -c 12345
raindrop add "https://example.com" --dry-run
```

#### `raindrop patch <id> <json>`
Update a bookmark with JSON patch.

**Arguments:**
- `id` (required): Bookmark ID
- `json` (required): JSON patch data (merge update)

**Patchable fields:**
- `title`: Bookmark title
- `excerpt`: Description
- `note`: User notes
- `tags`: Array of tags (replaces existing)
- `important`: Boolean (star/favorite)
- `collection.$id`: Move to collection (use nested object)
- `pleaseParse`: Boolean - re-parse URL for metadata

**Examples:**
```bash
raindrop patch 123456 '{"title": "New Title"}'
raindrop patch 123456 '{"tags": ["javascript", "tutorial"]}'
raindrop patch 123456 '{"collection": {"$id": 54321}}'
raindrop patch 123456 '{"important": true}'
raindrop patch 123456 '{"excerpt": "My notes here"}'
raindrop patch 123456 '{"pleaseParse": true}'
```

#### `raindrop delete <id>`
Delete a bookmark (moves to trash).

**Arguments:**
- `id` (required): Bookmark ID

**Examples:**
```bash
raindrop delete 123456
raindrop delete 123456 --dry-run
```

#### `raindrop suggest <id>`
Get AI-powered tag and collection suggestions.

**Arguments:**
- `id` (required): Bookmark ID

**Output:**
- Suggested tags
- Suggested collection
- Confidence scores

Powered by Raindrop.io's AI analysis.

**Examples:**
```bash
raindrop suggest 123456
```

#### `raindrop wayback <url>`
Check if URL is available in the Wayback Machine.

**Arguments:**
- `url` (required): URL to check

**Output:**
- Availability status
- Archived URL (if available)
- Snapshot date

**Examples:**
```bash
raindrop wayback "https://example.com"
```

### Collection Commands

#### `raindrop collection create <title>`
Create a new collection.

**Arguments:**
- `title` (required): Collection title

**Options:**
- `--parent <id>`: Parent collection ID (creates nested collection)
- `--public`: Make collection public
- `--private`: Make collection private (default)
- `--view <view>`: View type - `list`, `simple`, `grid`, `masonry`

**Examples:**
```bash
raindrop collection create "My Collection"
raindrop collection create "Work Notes" --parent 12345
raindrop collection create "Public Resources" --public --view grid
```

#### `raindrop collection get <id>`
Get details of a specific collection.

**Arguments:**
- `id` (required): Collection ID

**Output:**
- Collection ID, title, description
- Parent collection (if nested)
- View type, sort order
- Public/private status
- Bookmark count
- Created/updated timestamps

**Examples:**
```bash
raindrop collection get 12345
```

#### `raindrop collection update <id> <json>`
Update a collection with JSON patch.

**Arguments:**
- `id` (required): Collection ID
- `json` (required): JSON patch data

**Patchable fields:**
- `title`: Collection title
- `view`: View type (list, simple, grid, masonry)
- `public`: Boolean
- `parent.$id`: Move to parent collection
- `sort`: Sort order

**Examples:**
```bash
raindrop collection update 12345 '{"title": "New Name"}'
raindrop collection update 12345 '{"view": "grid"}'
raindrop collection update 12345 '{"public": true}'
```

#### `raindrop collection delete <id>`
Delete a collection (moves to trash).

**Arguments:**
- `id` (required): Collection ID

**Examples:**
```bash
raindrop collection delete 12345
raindrop collection delete 12345 --dry-run
```

#### `raindrop collection delete-multiple <ids>`
Delete multiple collections at once.

**Arguments:**
- `ids` (required): Comma-separated collection IDs

**Examples:**
```bash
raindrop collection delete-multiple "12345,67890,11111"
```

#### `raindrop collection reorder <sort>`
Reorder all collections.

**Arguments:**
- `sort` (required): Sort order
  - `title`: Sort A-Z
  - `-title`: Sort Z-A
  - `-count`: Sort by bookmark count (descending)

**Examples:**
```bash
raindrop collection reorder title
raindrop collection reorder -count
```

#### `raindrop collection expand-all <expanded>`
Expand or collapse all collections in UI.

**Arguments:**
- `expanded` (required): `true` or `false`

**Examples:**
```bash
raindrop collection expand-all true
raindrop collection expand-all false
```

#### `raindrop collection merge <ids> <target>`
Merge source collections into target.

**Arguments:**
- `ids` (required): Comma-separated source collection IDs
- `target` (required): Target collection ID

Moves all bookmarks from source collections to target, then deletes sources.

**Examples:**
```bash
raindrop collection merge "12345,67890" 99999
```

#### `raindrop collection clean`
Remove all empty collections.

**Examples:**
```bash
raindrop collection clean
raindrop collection clean --dry-run
```

#### `raindrop collection empty-trash`
Permanently delete all items in trash.

**Examples:**
```bash
raindrop collection empty-trash
raindrop collection empty-trash --dry-run
```

#### `raindrop collection cover <id> <source>`
Upload a cover image for a collection.

**Arguments:**
- `id` (required): Collection ID
- `source` (required): Image file path or URL

**Supported formats:**
- Local file: `/path/to/image.jpg`
- Remote URL: `https://example.com/image.jpg`

**Examples:**
```bash
raindrop collection cover 12345 "/Users/me/Pictures/cover.jpg"
raindrop collection cover 12345 "https://example.com/cover.jpg"
```

#### `raindrop collection set-icon <id> <query>`
Search for and set a collection icon.

**Arguments:**
- `id` (required): Collection ID
- `query` (required): Icon search query (emoji name or keyword)

**Examples:**
```bash
raindrop collection set-icon 12345 "rocket"
raindrop collection set-icon 12345 "book"
```

### Tag Commands

#### `raindrop tag rename <old> <new>`
Rename a tag.

**Arguments:**
- `old` (required): Old tag name
- `new` (required): New tag name

**Options:**
- `-c, --collection <id>`: Scope to specific collection (optional)

Renames the tag across all bookmarks (or within specified collection).

**Examples:**
```bash
raindrop tag rename "JS" "javascript"
raindrop tag rename "old-name" "new-name" -c 12345
```

#### `raindrop tag delete <tags...>`
Delete one or more tags.

**Arguments:**
- `tags...` (required): One or more tag names to delete

**Options:**
- `-c, --collection <id>`: Scope to specific collection (optional)

**Examples:**
```bash
raindrop tag delete "unwanted"
raindrop tag delete "tag1" "tag2" "tag3"
raindrop tag delete "old-tag" -c 12345
```

### Batch Commands

#### `raindrop batch update <json>`
Update multiple bookmarks with same changes.

**Arguments:**
- `json` (required): JSON patch data to apply to all bookmarks

**Options:**
- `--ids <ids>` (required): Comma-separated bookmark IDs
- `-c, --collection <id>`: Collection ID for scope (optional)

**Examples:**
```bash
raindrop batch update '{"important": true}' --ids "1,2,3,4,5"
raindrop batch update '{"tags": ["work"]}' --ids "10,20,30"
raindrop batch update '{"collection": {"$id": 999}}' --ids "1,2" -c 12345
```

#### `raindrop batch delete`
Delete multiple bookmarks.

**Options:**
- `--ids <ids>` (required): Comma-separated bookmark IDs
- `-c, --collection <id>`: Collection ID for scope (optional)

**Examples:**
```bash
raindrop batch delete --ids "123456,789012,345678"
raindrop batch delete --ids "1,2,3" -c 12345 --dry-run
```

## Special Collection IDs

- `-1`: All bookmarks (entire account)
- `0`: Unsorted bookmarks (no collection)
- `-99`: Trash
- Any positive integer: Specific collection ID

## Output Formats

### TOON (Token-Optimized)
Default format designed for AI agents. Minimizes token usage while preserving structure.

```
field: value
nested.field: value
array.0: first item
array.1: second item
```

### JSON
Standard JSON output with `--format json`:

```json
{
  "field": "value",
  "nested": {
    "field": "value"
  },
  "array": ["first item", "second item"]
}
```

## Error Codes

- `400`: Bad request (invalid JSON, missing parameters)
- `401`: Unauthorized (need to login)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found (invalid ID)
- `429`: Rate limited
- `500`: Internal server error

All errors include:
- Descriptive error message
- HTTP status code
- Hint for resolution (when available)

## Configuration

Config stored in: `~/.config/raindrop-cli/config.json`

Contents:
```json
{
  "token": "test_your_api_token_here"
}
```

## Development

### Run from source
```bash
bun run start <command>
bun run dev           # Watch mode
```

### Testing
```bash
bun test              # Run test suite
```

### Building
```bash
bun run build         # Build to dist/
```

### Code quality
```bash
bun run lint          # Check with Biome
bun run lint:fix      # Auto-fix issues
bun run typecheck     # TypeScript validation
```
