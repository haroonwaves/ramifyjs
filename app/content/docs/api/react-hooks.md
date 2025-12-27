---
title: 'React Hooks'
description: 'React hooks for reactive data access'
---

## React Hooks

Ramify DB exposes a single powerful hook `useLiveQuery` that enables any functional component to
reactively update when database content changes.

---

### `useLiveQuery<T>(callback, dependencies)`

Executes the callback immediately and re-executes it whenever the dependent collections change.

**Example:**

```typescript
import { useLiveQuery } from '@ramify-db/react-hooks';

function MyComponent() {
	const data = useLiveQuery(
		() => {
			// Your query logic here
			return db.users.where('status').equals('active').toArray();
		},
		{
			// Dependencies to watch for database changes
			collections: [db.users],
			// Other React dependencies (like props or state)
			others: [],
		}
	);

	return <div>{data?.length}</div>;
}
```

**Parameters:**

1. **`callback`**: `() => T`
   - A synchronous function that queries the database
   - Runs on mount and whenever dependencies change
   - Should return the query result

2. **`dependencies`**: `{ collections: readonly Subscribable[]; others: readonly unknown[] }`
   - **`collections`**: `readonly Subscribable[]`
     - Array of collections to observe
     - When these collections emit a change (add/update/delete), the hook re-runs the callback
     - Must include all collections queried in the callback
   - **`others`**: `readonly unknown[]`
     - Array of standard React dependencies (like `useEffect` deps)
     - If these change, the hook also re-runs
     - Include props, state, or other values used in the callback

Where `Subscribable` is defined as:

```typescript
type Subscribable = {
	subscribe: (cb: () => void) => () => void;
};
```

**Returns:** `T | null`

- Returns the result of the callback
- Returns `null` during initial mount if the callback hasn't executed yet
- Typically returns synchronously, so `null` is rare in practice

---

### Usage Patterns

#### Reactive Query

Query all documents matching a criteria and reactively update when the collection changes.

```typescript
function ActiveUsers() {
	const activeUsers = useLiveQuery(() => db.users.where({ status: 'active' }).toArray(), {
		collections: [db.users],
		others: [],
	});

	return (
		<div>
			<h2>Active Users: {activeUsers?.length ?? 0}</h2>
			{activeUsers?.map((user) => (
				<div key={user.id}>{user.name}</div>
			))}
		</div>
	);
}
```

---

#### Multiple Collections

Query across multiple collections and subscribe to all of them.

```typescript
function UserMessages({ userId }: { userId: string }) {
	const data = useLiveQuery(
		() => {
			const user = db.users.get(userId);
			const messages = db.messages.where('senderId').equals(userId).toArray();
			return { user, messages };
		},
		{
			collections: [db.users, db.messages], // Subscribe to both collections
			others: [userId],
		}
	);

	return (
		<div>
			<h1>{data?.user?.name}</h1>
			<h2>Messages: {data?.messages?.length ?? 0}</h2>
			{data?.messages?.map((message) => (
				<div key={message.id}>{message.content}</div>
			))}
		</div>
	);
}
```

---

### Common Pitfalls

#### Missing Collections in Dependencies

If you query a collection but don't list it in `collections`, the component won't update when that
collection changes.

```typescript
// ❌ BAD: messages not in collections array
const data = useLiveQuery(() => db.messages.where('senderId').equals(userId).toArray(), {
	collections: [db.users], // Wrong! Should include messages
	others: [userId],
});

// ✅ GOOD: messages included in collections array
const data = useLiveQuery(() => db.messages.where('senderId').equals(userId).toArray(), {
	collections: [db.users, db.messages], // Correct
	others: [userId],
});
```

---

#### Expensive Callbacks

The callback runs on every render _and_ every database change. Keep it fast.

```typescript
// ❌ BAD: Expensive computation in callback
const data = useLiveQuery(
	() => {
		const users = db.users.toArray();
		// Expensive computation
		return users.map((u) => expensiveTransform(u));
	},
	{ collections: [db.users], others: [] }
);

// ✅ GOOD: Move expensive computation outside or memoize
const users = useLiveQuery(() => db.users.toArray(), {
	collections: [db.users],
	others: [],
});
const transformed = useMemo(() => users?.map((u) => expensiveTransform(u)), [users]);
```

---

### Performance Considerations

- **Ramify queries are fast** – Most queries execute in microseconds, so re-running on every change
  is typically not a problem.
- **Batch updates** – Use bulk operations (`bulkAdd`, `bulkPut`, etc.) to minimize the number of
  re-renders.
- **Selective subscriptions** – Only include collections that are actually queried in the callback.
- **Memoization** – For expensive transformations, use `useMemo` on the query result rather than in
  the callback.
