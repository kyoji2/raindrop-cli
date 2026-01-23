# raindrop-cli

AI-native CLI for Raindrop.io. Built with TypeScript, using Bun for tooling and Node standard APIs in the codebase.

Designed for AI agents and automation scripts. **TOON** format for maximum token efficiency, with optional JSON output for standard integrations.

## Key Features

- **AI-Native:** Outputs TOON format by default to save on context tokens
- **Situation Reports:** High-level `context` command for a quick "state of the world" overview
- **Hierarchy Support:** Create, move, and manage nested collections
- **Batch Operations:** Bulk update or delete bookmarks efficiently
- **Dry Run Mode:** Safe account management with `--dry-run` flag

## Runtime Notes

- Prefer Node standard APIs (`node:fs`, `node:timers/promises`, `node:child_process`) over `Bun.*` in source code.
- Tests still run with `bun test`.

## Release

```bash
# Bump and release (runs lint + tests, commits, tags, pushes)
bun run release:patch
bun run release:minor
bun run release:major

# Or set an explicit version
bun run release -- 1.2.3
```

## Installation

```bash
# Clone and install
git clone <repo>
cd raindrop-cli
bun install

# Run directly
bun run src/index.ts --help

# Or link globally
bun link
```

## Quick Start

1. **Get your API Token**

   Get a test token from https://app.raindrop.io/settings/integrations

2. **Login** (Verifies token before saving)

   ```bash
   bun run src/index.ts login
   ```

3. **Account Overview** (The agent "situation report")

   ```bash
   bun run src/index.ts context
   ```

## Usage Examples

### Authentication

```bash
# Login with your API token
raindrop login

# Check current user
raindrop whoami

# Logout
raindrop logout
```

### Overview Commands

```bash
# Get high-level account context
raindrop context

# List all collections and tags
raindrop structure

# Get API schema (for AI context)
raindrop schema
```

### Bookmark Management

```bash
# Search bookmarks (TOON format - default)
raindrop search "python"

# Search with pretty table output
raindrop search "python" --pretty

# Search in JSON format
raindrop search "python" --format json

# Get bookmark details
raindrop get 123456

# Add a new bookmark
raindrop add "https://example.com" --title "Example" --tags "work,reference"

# Update a bookmark with JSON patch
raindrop patch 123456 '{"title": "New Title", "tags": ["updated"]}'

# Delete a bookmark
raindrop delete 123456

# Get tag suggestions for a bookmark
raindrop suggest 123456

# Check Wayback Machine for a URL
raindrop wayback "https://example.com"
```

### Collection Management

```bash
# Create a collection
raindrop collection create "Research"

# Create a public collection with parent
raindrop collection create "AI Papers" --parent 123 --public

# Get collection details
raindrop collection get 123

# Update a collection
raindrop collection update 123 '{"title": "New Name"}'

# Delete a collection
raindrop collection delete 123

# Delete multiple collections
raindrop collection delete-multiple 123,456,789

# Reorder collections
raindrop collection reorder title
raindrop collection reorder -count

# Expand/collapse all collections
raindrop collection expand-all true

# Merge collections
raindrop collection merge 123,456 789

# Remove empty collections
raindrop collection clean

# Empty trash
raindrop collection empty-trash

# Set collection cover from URL
raindrop collection cover 123 "https://example.com/image.png"

# Set collection icon by search
raindrop collection set-icon 123 "robot"
```

### Tag Management

```bash
# Delete tags globally
raindrop tag delete "old-tag" "useless-tag"

# Delete tags from specific collection
raindrop tag delete "old-tag" --collection 123

# Rename a tag
raindrop tag rename "work" "career"
```

### Batch Operations

```bash
# Update multiple bookmarks
raindrop batch update --ids 1,2,3 '{"tags": ["archived"]}'

# Move multiple bookmarks to a collection
raindrop batch update --ids 1,2,3 '{"collection": {"$id": 123}}'

# Delete multiple bookmarks
raindrop batch delete --ids 1,2,3
```

## Global Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Log actions instead of making real API requests |
| `--format, -f` | Output format: `toon` (default) or `json` |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RAINDROP_TOKEN` | API token (alternative to login command) |

## Output Formats

### TOON (Default)

Token-optimized format for AI agents. Tabular data with minimal overhead.

### JSON

Standard JSON output for programmatic use:

```bash
raindrop search "python" --format json
```

## Configuration

Config is stored in `~/.config/raindrop-cli/config.json`

## Development

```bash
# Run with watch mode
bun run dev

# Type check
bun run typecheck

# Build
bun run build
```

## License

MIT
