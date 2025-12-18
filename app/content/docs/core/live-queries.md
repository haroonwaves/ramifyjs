---
title: 'Live Queries (React)'
description: 'Reactive queries that automatically update your UI'
---

## Live Queries (React)

Live Queries allow your React components to stay in sync with your Ramify database automatically.
Instead of manually subscribing to events and managing state, you use the `useLiveQuery` hook.

### How It Works

The `useLiveQuery` hook observes a set of specified collections. Whenever a write operation
(add/update/delete) occurs on those collections, the hook re-runs your query function and triggers a
re-render with the new data.

### The `useLiveQuery` Hook

```tsx
import { useLiveQuery } from 'ramify-db/react';

function UserList() {
	const users = useLiveQuery(
		// 1. Query Function
		() => db.users.where('age').above(18).toArray(),
		// 2. Dependencies
		{
			collections: [db.users],
			others: [],
		}
	);

	return (
		<ul>
			{users?.map((u) => (
				<li key={u.id}>{u.name}</li>
			))}
		</ul>
	);
}
```

### Dependency Tracking

The second argument to `useLiveQuery` is critical.

- **`collections`**: Must include every collection you query. If you forget one, updates to that
  collection won't trigger a re-render.
- **`others`**: Functions like React's dependency array. Use it for component props or state
  variables used inside your query function.

### Best Practices

- **Global Store**: Import your store instance from a module rather than creating it inside the
  component.
- **Stability**: Ensure the query function and dependency arrays are stable (or use the hook's
  naturally stable behavior) to avoid infinite loops, though `useLiveQuery` handles inline function
  definition well.

### Comparison to Other Libraries

Unlike libraries that require wrapping your app in a Provider or using higher-order components,
Ramify's approach is more direct and similar to `dexie-react-hooks`.

### Common pitfalls

- **Not memoizing query objects**: Causes unnecessary re-subscriptions
- **Using in non-React contexts**: Use observers instead
- **Too many live queries**: Each subscription has overhead
