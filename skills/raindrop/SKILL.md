---
name: raindrop
description: Expert guidance for using the RaindropCLI - an AI-native command-line interface for managing Raindrop.io bookmarks, collections, and tags. Use this skill when working with bookmark management, searching bookmarks, organizing collections, or automating Raindrop.io workflows.
---

# Raindrop CLI Assistant

Expert guidance for interacting with the RaindropCLI - a Bun-powered, AI-native CLI for managing your Raindrop.io bookmarks.

## Overview

The RaindropCLI provides comprehensive command-line access to Raindrop.io's bookmark manager with AI-friendly output formats. All commands support:
- **Output formats**: `toon` (token-optimized, default) or `json` (via `--format json`)
- **Dry-run mode**: Test commands safely with `--dry-run`
- **Schema validation**: All API responses validated with Zod schemas

## Quick Start

```bash
# Authentication
raindrop login [token]           # Login with API token
raindrop whoami                  # Show current user
raindrop logout                  # Remove credentials

# Get context about the account
raindrop context                 # User info, stats, recent activity
raindrop structure               # Show all collections and tags

# Search and manage bookmarks
raindrop search "query"          # Search bookmarks
raindrop add <url>               # Add new bookmark
raindrop get <id>                # Get bookmark details
raindrop patch <id> '<json>'     # Update bookmark
raindrop delete <id>             # Delete bookmark
```

## Authentication & Setup

### Login
```bash
raindrop login                   # Interactive prompt
raindrop login "test_..."        # Provide token directly
```

**Getting an API token**:
1. Visit https://app.raindrop.io/settings/integrations
2. Create a new app or use existing
3. Copy the test token

### Check Current User
```bash
raindrop whoami                  # Returns user ID, name, email, pro status
```

### Account Context
```bash
raindrop context                 # High-level overview:
                                 # - User details
                                 # - Collection/bookmark counts
                                 # - Recent activity

raindrop structure               # Collection hierarchy + all tags
```

## Working with Bookmarks

### Search Bookmarks
```bash
raindrop search "query"                    # Full-text search
raindrop search "query" -c 12345          # Search in specific collection
raindrop search "query" -l 100            # Limit results (default: 50)
raindrop search "query" --pretty          # Formatted table output
```

#### Search Syntax & Operators

Raindrop.io supports powerful search operators for precise filtering:

**Basic Text Search:**
- `apple iphone` - Search across title, description, domain, or content
- `"exact phrase"` - Match exact phrases
- `-excluded` - Exclude terms (e.g., `javascript -react`)
- `match:OR` - Boolean OR (e.g., `python match:OR java`)

**Tag Search:**
- `#tag` - Find items with specific tag
- `#"multi word tag"` - Multi-word tags
- `#tag1 #tag2` - Multiple tags (AND logic)
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
# Find untagged JavaScript articles
raindrop search "javascript notag:true type:article"

# Search favorites created this year
raindrop search "❤️ created:>2024-01-01"

# Find items with "API" in title, exclude "REST"
raindrop search "title:API -REST"

# Multi-word tag search
raindrop search '#"web development" type:article'

# Find items in domain
raindrop search "link:github.com"

# Combine multiple filters
raindrop search "#tutorial type:video created:>2024-01-01" -l 20
```

### Get Bookmark Details
```bash
raindrop get 123456              # Full bookmark details including:
                                 # - Title, URL, excerpt
                                 # - Tags, collection
                                 # - Created/updated dates
                                 # - Media (images, videos)
```

### Add Bookmarks
```bash
raindrop add "https://example.com"
raindrop add "https://example.com" -t "My Title"
raindrop add "https://example.com" --tags "tag1,tag2"
raindrop add "https://example.com" -c 12345          # Add to collection
raindrop add "https://example.com" -t "Title" --tags "dev,api" -c 12345
```

### Update Bookmarks
```bash
# Patch with JSON (merge update)
raindrop patch 123456 '{"title": "New Title"}'
raindrop patch 123456 '{"tags": ["new", "tags"]}'
raindrop patch 123456 '{"collection": {"$id": 54321}}'
raindrop patch 123456 '{"important": true}'
```

**Common fields**:
- `title`: Bookmark title
- `excerpt`: Description/notes
- `tags`: Array of tags
- `important`: Boolean star/favorite
- `collection.$id`: Move to collection

### Delete Bookmarks
```bash
raindrop delete 123456           # Delete single bookmark
```

### AI Features
```bash
raindrop suggest 123456          # Get AI-powered tag/collection suggestions
raindrop wayback "https://..."   # Check Wayback Machine availability
```

## Working with Collections

### View Collections
```bash
raindrop structure               # Show all collections + tags
raindrop collection get 12345    # Get specific collection details
```

### Create Collections
```bash
raindrop collection create "My Collection"
raindrop collection create "Work" --parent 12345    # Child collection
raindrop collection create "Public Links" --public  # Public collection
raindrop collection create "Private" --private      # Private collection
raindrop collection create "Grid View" --view grid  # Set view type
```

**View types**: `list`, `simple`, `grid`, `masonry`

### Update Collections
```bash
# Update with JSON patch
raindrop collection update 12345 '{"title": "New Name"}'
raindrop collection update 12345 '{"view": "grid"}'
raindrop collection update 12345 '{"public": true}'
```

### Organize Collections
```bash
raindrop collection reorder title        # Sort A-Z
raindrop collection reorder -title       # Sort Z-A
raindrop collection reorder -count       # Sort by bookmark count

raindrop collection expand-all true      # Expand all in UI
raindrop collection expand-all false     # Collapse all in UI
```

### Merge Collections
```bash
# Merge source collections into target
raindrop collection merge "12345,67890" 99999
```

### Customize Collections
```bash
raindrop collection cover 12345 "/path/to/image.jpg"     # Local file
raindrop collection cover 12345 "https://example.com/img.jpg"  # URL

raindrop collection set-icon 12345 "rocket"              # Search & set icon
```

### Clean Up Collections
```bash
raindrop collection clean              # Remove all empty collections
raindrop collection empty-trash        # Empty trash collection
raindrop collection delete 12345       # Delete single collection
raindrop collection delete-multiple "12345,67890"  # Delete multiple
```

## Working with Tags

### View Tags
```bash
raindrop structure               # Shows all tags with counts
```

### Manage Tags
```bash
raindrop tag rename "old-tag" "new-tag"                    # Rename globally
raindrop tag rename "old" "new" -c 12345                   # Rename in collection

raindrop tag delete "tag1" "tag2" "tag3"                   # Delete globally
raindrop tag delete "unwanted" -c 12345                    # Delete in collection
```

## Batch Operations

### Batch Update
```bash
# Update multiple bookmarks with same changes
raindrop batch update '{"important": true}' --ids "1,2,3"
raindrop batch update '{"tags": ["work"]}' --ids "1,2,3" -c 12345
```

### Batch Delete
```bash
raindrop batch delete --ids "123456,789012"
raindrop batch delete --ids "1,2,3" -c 12345     # Delete within collection
```

## Development & Schema

### Schema Information
```bash
raindrop schema                  # Dumps JSON schemas and examples
                                 # Useful for AI context and validation
```

This outputs complete Zod schemas for:
- Raindrop (bookmark)
- Collection
- User
- Tag
- And all API response types

## Global Options

All commands support:

```bash
--dry-run                        # Log actions without making API calls
--format json                    # Output as JSON instead of TOON
--format toon                    # Token-optimized output (default)
-v, --version                    # Show version
```

## Output Formats

### TOON (Default)
Token-optimized format designed for AI agents:
```
field_name: value
another_field: value
nested.field: value
```

### JSON
Standard JSON output with `--format json`:
```json
{
  "field_name": "value",
  "nested": {"field": "value"}
}
```

## Best Practices

1. **Start with context**: Run `raindrop context` to understand the account
2. **Use powerful search**: Leverage operators like `notag:true`, `type:article`, date filters, and field-specific search to find exactly what you need
3. **Search before adding**: Use `raindrop search` with `link:domain.com` to avoid duplicates
4. **Use dry-run**: Test destructive operations with `--dry-run` first
5. **Leverage AI features**: Use `raindrop suggest` for intelligent tagging
6. **Combine filters**: Mix tags, types, dates, and text for precise searches (e.g., `#tutorial type:video created:>2024-01-01`)
7. **Check schema**: Use `raindrop schema` when building automation

## Error Handling

The CLI provides helpful error messages with hints:

- **401 Unauthorized**: Run `raindrop login` to authenticate
- **404 Not Found**: Verify the ID is correct
- **Invalid JSON**: Ensure JSON is properly escaped for shell

All errors include:
- Error message
- HTTP status code
- Hint for resolution (when available)

## Examples

### Advanced Search Queries
```bash
# Find all untagged bookmarks
raindrop search "notag:true" -c -1

# Find recent JavaScript tutorials (articles only)
raindrop search "javascript tutorial type:article created:>2024-01-01"

# Find all GitHub repos you've starred
raindrop search "link:github.com ❤️"

# Find videos about Python, exclude beginner content
raindrop search "python type:video -beginner"

# Find articles with "API" in title from specific domain
raindrop search "title:API link:medium.com type:article"

# Combine multiple tags (AND logic)
raindrop search "#javascript #tutorial #advanced" -l 50

# Find items with notes containing "TODO"
raindrop search "note:TODO"

# Find all documents uploaded this month
raindrop search "type:document file:true created:>2024-01-01"
```

### Organize New Bookmarks
```bash
# Find all untagged items
raindrop search "notag:true" -c -1 --pretty

# Get AI suggestions for specific bookmark
raindrop suggest 123456

# Apply suggested tags
raindrop patch 123456 '{"tags": ["javascript", "tutorial", "react"]}'

# Mark as important
raindrop patch 123456 '{"important": true}'
```

### Clean Up Workflow
```bash
# Review structure
raindrop structure

# Find duplicate or similar bookmarks by domain
raindrop search "link:example.com" -l 100

# Merge duplicate collections
raindrop collection merge "123,456" 789

# Remove empty collections
raindrop collection clean

# Rename inconsistent tags across account
raindrop tag rename "Dev" "development"
raindrop tag rename "JS" "javascript"
raindrop tag rename "py" "python"

# Delete obsolete tags
raindrop tag delete "old-tag" "deprecated"
```

### Bulk Tag Update
```bash
# Find all JavaScript items without "programming" tag
raindrop search "javascript -#programming" -l 100

# Get bookmark IDs (from TOON output), then batch update
raindrop batch update '{"tags": ["javascript", "programming"]}' --ids "1,2,3,4,5"

# Mark all tutorials as favorites
raindrop search "#tutorial" -l 50
raindrop batch update '{"important": true}' --ids "10,20,30"
```

### Content Curation
```bash
# Find all articles saved last week
raindrop search "type:article created:>2024-01-10 created:<2024-01-17"

# Find all images tagged "inspiration"
raindrop search "#inspiration type:image"

# Find videos without excerpts (need descriptions)
raindrop search "type:video excerpt:" -l 100

# Archive old bookmarks by moving to collection
raindrop search "created:<2023-01-01" -c 12345
raindrop batch update '{"collection": {"$id": 99999}}' --ids "1,2,3"
```

## Resources

See `references/commands.md` for detailed command reference and API schema information.
