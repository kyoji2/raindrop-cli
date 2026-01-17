# Raindrop CLI Skill

Expert guidance for using the RaindropCLI - an AI-native command-line interface for managing Raindrop.io bookmarks, collections, and tags.

## Installation

### For Claude.ai
1. Go to your Claude.ai projects
2. Click on "Knowledge" or "Skills"
3. Upload the `skills/raindrop` folder or just the `SKILL.md` file

### For Claude API
Use the Skills API to upload this skill:

```bash
# Upload skill via API
curl -X POST https://api.anthropic.com/v1/skills \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "name": "raindrop",
    "description": "Expert guidance for using the RaindropCLI",
    "content": "..."
  }'
```

### For Claude Code
If installing as a Claude Code skill, copy this directory to your skills location or use the plugin system.

## What This Skill Does

This skill teaches Claude how to effectively use the RaindropCLI to:
- Search and manage bookmarks
- Organize collections
- Work with tags
- Perform batch operations
- Understand API schemas and output formats

## Usage

Once installed, Claude will automatically use this skill when you ask questions about:
- Managing Raindrop.io bookmarks via CLI
- Searching or organizing bookmarks
- Working with collections and tags
- Automating bookmark workflows

## Example Prompts

```
"Search my bookmarks for JavaScript tutorials"
"Add this URL to my Work collection with the tag 'important'"
"Help me clean up duplicate collections"
"Show me all my untagged bookmarks"
"Create a new collection called 'AI Resources' and add these links"
```

## Files Included

- `SKILL.md` - Main skill instructions (required)
- `references/commands.md` - Detailed command reference (loaded into context when needed)

## Updating This Skill

To update the skill documentation:
1. Edit `SKILL.md` for main instructions
2. Edit `references/commands.md` for detailed reference
3. Re-upload to your Claude environment

## License

This skill documentation is part of the RaindropCLI project.
