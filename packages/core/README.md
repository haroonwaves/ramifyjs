## ramify js

Lightweight in-memory data utilities with querying and live query observation.

### Install

```bash
npm install @ramifyjs/core
# or
pnpm add @ramifyjs/core
# or
yarn add @ramifyjs/core
```

### Usage

```ts
import /* your exported APIs */ '@ramifyjs/core';

// Example (replace with your actual API):
// const db = createRamify();
// const results = query(db, q => q.where(...));
```

Exports are available from the root entrypoint; see source files like `ramify.ts`, `query.ts`,
`table.ts`, `observer.ts`, and `useLiveQuery.ts` for details until full API docs are added.

### TypeScript

- ESM build with bundled type declarations.
- Target Node 18+ and modern bundlers.

### Development

- Build: `npm run build`
- Entry: `index.ts` re-exports from local modules.

### License

MIT © Usman Haroon

### SCRATCHPAD

store └── collection └── document
