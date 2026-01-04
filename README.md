# Ramify JS

Reactive, in-memory database for in-process JavaScript applications.

Ramify JS is environment-agnostic—built for the browser, Node.js, and Edge runtimes. It provides a
lightweight, type-safe data store with live query observation for building reactive applications.

> [!IMPORTANT] **Ramify JS is not a durable database.** It is designed for in-process data
> management, request-scoped caching, and transient state. Data is lost when the process or page is
> terminated.

## Documentation

[ramifyjs.pages.dev](https://ramifyjs.pages.dev) - Main documentation

[Benchmark](https://ramifyjs.pages.dev/docs/guides/performance#benchmark) - Benchmark results

## Development

This is a monorepo managed with pnpm workspaces.

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Format code
pnpm format

# Run benchmarks (default: 100,000 records)
pnpm benchmark
```

# Contributing

Fork the Project

## Branching Strategy

- Feature branches: `feature/*`
  ```bash
  git checkout -b feature/YOUR-BRANCH-NAME
  ```
- Bug fix branches: `fix/*`
  ```bash
  git checkout -b fix/YOUR-BRANCH-NAME
  ```

## Commit Message Format

All commits MUST follow this format:

```
<gitmoji> type(scope): subject

[optional body]
```

### Examples

```bash
✨ feat(core): support for reactive queries
🐛 fix(react): infinite loop in useLiveQuery
📝 docs(app): update query api documentation
```

## Development Workflow

1. Create your Feature Branch `git checkout -b feature/YOUR-BRANCH-NAME` from the `main` branch
2. Push to the Branch `git push origin feature/YOUR-BRANCH-NAME`
3. Open a Pull Request against the `main` branch

## License

[LICENSE](/LICENSE)
