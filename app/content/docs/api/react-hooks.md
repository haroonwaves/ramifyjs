---
title: 'React Hooks'
description: 'React hooks for reactive data access'
---

## React Hooks

Ramify DB exposes a single powerful hook `useLiveQuery` that enables any functional component to
reactively update when database content changes.

### `useLiveQuery<T>(callback, deps)`

Executes the callback immediately and re-executes it whenever the dependent collections change.

```typescript
import { useLiveQuery } from 'ramify-db/react';

function MyComponent() {
  const data = useLiveQuery(
    () => {
      // Your query logic here
      return users.where('age').above(18).toArray();
    },
    {
      // Dependencies to watch for database changes
      collections: [users],
      // Other React dependencies (like props or state)
      others: []
    }
  );

  return <div>{data?.length}</div>;
}
```

#### Parameters

1. **`callback`**: `() => T` A synchronous function that queries the database. It runs on mount and
   on every update.
2. **`dependencies`**: `{ collections: Subscribable[], others: unknown[] }`
   - `collections`: Array of collections to observe. When these collections emit a change
     (add/update/delete), the hook re-runs the callback.
   - `others`: Array of standard React dependencies (like `useEffect` deps). If these change, the
     hook also re-runs.

#### Returns

`T | null` (returns `null` during initial mount if not synchronous, though typically it runs
synchronously).

### Patterns

#### Reactive Query

```tsx
const activeUsers = useLiveQuery(() => users.where({ status: 'active' }).toArray(), {
	collections: [users],
	others: [],
});
```

#### Single Document Subscription

```tsx
const user = useLiveQuery(() => users.get(props.userId), {
	collections: [users],
	others: [props.userId],
});
```

#### Count Subscription

```tsx
const count = useLiveQuery(() => users.where('age').above(18).count(), {
	collections: [users],
	others: [],
});
```

### Common Pitfalls

- **Missing Collections in Deps**: If you query `posts` but only list `users` in `collections`, the
  component won't update when a post is added.
- **Expensive Callbacks**: The callback runs on every render _and_ every db change. Keep it fast
  (Ramify queries are generally very fast).
- **Infinite Loops**: Avoid creating new collection instances inside the component body. Use the
  global store instance.
