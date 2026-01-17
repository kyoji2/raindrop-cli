---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# RaindropCLI

AI-native CLI for Raindrop.io bookmark manager.

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander.js setup, error handling)
├── api/
│   ├── client.ts         # RaindropAPI class (HTTP client with retry/timeout)
│   ├── schemas.ts        # Zod schemas for API response validation
│   ├── types.ts          # TypeScript types (derived from zod schemas)
│   └── index.ts          # API exports
├── commands/
│   ├── auth.ts           # login, logout, whoami
│   ├── raindrops.ts      # search, get, add, patch, delete, suggest, wayback
│   ├── collections.ts    # create, get, update, delete, merge, cover, etc.
│   ├── tags.ts           # delete, rename
│   ├── batch.ts          # batch update/delete
│   ├── overview.ts       # context, structure, schema
│   └── index.ts          # Command exports
└── utils/
    ├── output.ts         # CLIError, output(), outputError()
    ├── config.ts         # loadConfig(), saveConfig(), getToken()
    ├── spinner.ts        # createSpinner(), stopSpinner()
    ├── tempfile.ts       # getTempFilePath()
    └── index.ts          # Utils exports
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `commander` | CLI argument parsing and command structure |
| `zod` | Runtime schema validation for API responses |
| `ora` | Terminal spinner for async operations |
| `@toon-format/toon` | Token-optimized output format for AI agents |

## Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@biomejs/biome` | Linting and formatting |
| `@types/bun` | Bun TypeScript types |
| `typescript` | Type checking |

## Key Patterns

### Error Handling
- `CLIError` class for user-facing errors (with optional hints)
- `RaindropError` for API errors (includes status code and hint)
- All errors bubble up to `handleError()` in index.ts

### API Client
- `RaindropAPI` class with automatic retry (3 attempts) and backoff
- Per-request timeout via `AbortController` (60s)
- Zod validation on all API responses via `parseResponse()`
- Dry-run mode for safe testing

### Type Safety
- Types derived from zod schemas (`z.infer<typeof Schema>`)
- Single source of truth: schemas.ts defines structure, types.ts exports types
- No `!` assertions - zod validates all nullable fields

## Bun-Specific

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### Bun APIs Used

- `Bun.file()` for file operations
- `Bun.sleep()` for async delays
- `Bun.env` for environment variables
- `bun:test` for testing

## Commands

```bash
bun run start          # Run CLI
bun run dev            # Watch mode
bun test               # Run tests
bun run lint           # Check with Biome
bun run lint:fix       # Auto-fix lint issues
bun run typecheck      # TypeScript check
bun run build          # Build to dist/
```
