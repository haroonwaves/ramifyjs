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
			return users.where('status').equals('active').toArray();
		},
		{
			// Dependencies to watch for database changes
			collections: [users],
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
	const activeUsers = useLiveQuery(() => users.where({ status: 'active' }).toArray(), {
		collections: [users],
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

#### Single Document Subscription

Subscribe to a single document and update when it changes.

```typescript
interface UserProfileProps {
	userId: string;
}

function UserProfile({ userId }: UserProfileProps) {
	const user = useLiveQuery(() => users.get(userId), {
		collections: [users],
		others: [userId], // Re-run when userId prop changes
	});

	if (!user) return <div>User not found</div>;

	return (
		<div>
			<h1>{user.name}</h1>
			<p>{user.email}</p>
		</div>
	);
}
```

---

#### Count Subscription

Subscribe to a count query and update reactively.

```typescript
function UserStats() {
	const activeCount = useLiveQuery(() => users.where('status').equals('active').count(), {
		collections: [users],
		others: [],
	});

	const totalCount = useLiveQuery(() => users.count(), {
		collections: [users],
		others: [],
	});

	return (
		<div>
			<p>Active Users: {activeCount ?? 0}</p>
			<p>Total Users: {totalCount ?? 0}</p>
		</div>
	);
}
```

---

#### Multiple Collections

Query across multiple collections and subscribe to all of them.

```typescript
function UserPosts({ userId }: { userId: string }) {
	const data = useLiveQuery(
		() => {
			const user = users.get(userId);
			const userPosts = posts.where('userId').equals(userId).toArray();
			return { user, posts: userPosts };
		},
		{
			collections: [users, posts], // Subscribe to both collections
			others: [userId],
		}
	);

	return (
		<div>
			<h1>{data?.user?.name}</h1>
			<h2>Posts: {data?.posts?.length ?? 0}</h2>
			{data?.posts?.map((post) => (
				<div key={post.id}>{post.title}</div>
			))}
		</div>
	);
}
```

---

#### Complex Query with Filtering

Combine indexed queries with additional filtering.

```typescript
function SearchUsers({ searchTerm }: { searchTerm: string }) {
	const results = useLiveQuery(
		() => {
			if (!searchTerm) return [];
			return users
				.where('status')
				.equals('active')
				.filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
				.toArray();
		},
		{
			collections: [users],
			others: [searchTerm], // Re-run when search term changes
		}
	);

	return (
		<div>
			<h2>Search Results: {results?.length ?? 0}</h2>
			{results?.map((user) => (
				<div key={user.id}>{user.name}</div>
			))}
		</div>
	);
}
```

---

#### Conditional Queries

Handle conditional logic in the callback.

```typescript
function ConditionalData({ showActive }: { showActive: boolean }) {
	const users = useLiveQuery(
		() => {
			if (showActive) {
				return db.users.where('status').equals('active').toArray();
			} else {
				return db.users.toArray();
			}
		},
		{
			collections: [db.users],
			others: [showActive], // Re-run when condition changes
		}
	);

	return <div>Users: {users?.length ?? 0}</div>;
}
```

---

### Common Pitfalls

#### Missing Collections in Dependencies

If you query a collection but don't list it in `collections`, the component won't update when that
collection changes.

```typescript
// ❌ BAD: posts not in collections array
const data = useLiveQuery(() => posts.where('userId').equals(userId).toArray(), {
	collections: [users], // Wrong! Should include posts
	others: [userId],
});

// ✅ GOOD: posts included in collections array
const data = useLiveQuery(() => posts.where('userId').equals(userId).toArray(), {
	collections: [posts], // Correct
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

#### Infinite Loops

Avoid creating new collection instances inside the component body. Use the global store instance.

```typescript
// ❌ BAD: Creating new Ramify instance in component
function MyComponent() {
	const ramify = new Ramify(); // New instance every render!
	const db = ramify.createStore(schema);

	const data = useLiveQuery(() => db.users.toArray(), {
		collections: [db.users],
		others: [],
	});
}

// ✅ GOOD: Use global store instance
const db = ramify.createStore(schema); // Outside component

function MyComponent() {
	const data = useLiveQuery(() => db.users.toArray(), {
		collections: [db.users],
		others: [],
	});
}
```

---

#### Not Including Other Dependencies

If your callback uses props or state, include them in `others`.

```typescript
// ❌ BAD: userId not in others array
function UserProfile({ userId }: { userId: string }) {
	const user = useLiveQuery(() => users.get(userId), {
		collections: [users],
		others: [], // Wrong! Should include userId
	});
}

// ✅ GOOD: userId included in others array
function UserProfile({ userId }: { userId: string }) {
	const user = useLiveQuery(() => users.get(userId), {
		collections: [users],
		others: [userId], // Correct
	});
}
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

---

### Type Safety

The hook is fully type-safe. The return type is inferred from the callback:

```typescript
interface User {
	id: string;
	name: string;
	email: string;
}

// Type is inferred as User | undefined | null
const user = useLiveQuery(() => users.get('1'), {
	collections: [users],
	others: [],
});

// Type is inferred as User[] | null
const allUsers = useLiveQuery(() => users.toArray(), {
	collections: [users],
	others: [],
});

// Type is inferred as number | null
const count = useLiveQuery(() => users.count(), {
	collections: [users],
	others: [],
});
```
