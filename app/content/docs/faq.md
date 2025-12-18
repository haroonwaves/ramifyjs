---
title: FAQ
description: Frequently asked questions about Ramify DB
date: 2024-12-10
category: Guide
---

## Frequently Asked Questions

Common questions and answers about Ramify DB.

### General Questions

#### What is Ramify DB?

Ramify DB is a lightweight, in-memory database designed for client-side applications. It provides:

- Fast querying with indexed collections
- Live query observation for reactive UIs
- Full TypeScript support
- React hooks for seamless integration

#### Ideal Use Cases

Ramify DB shines in scenarios involving **Complex data management**, **Offline-first applications**,
and **Real-time dashboards**. Its synchronous API makes it excellent for prototyping without a
backend.

#### Limitations

Since it is in-memory:

- **Large datasets** (>100k records) may impact browser performance.
- **Data Persistence** requires manual bridging to localStorage or IndexedDB.
- **Server-side usage** is not the primary target.

### Installation & Setup

#### How do I install Ramify DB?

```bash
npm install ramify-db
# or
pnpm add ramify-db
# or
yarn add ramify-db
```

#### Do I need to install anything else?

For React integration, you'll need React 16.8+ (for hooks support). The React hooks are included in
the main package:

```typescript
import { useLiveQuery } from 'ramify-db/react';
```

#### Can I use Ramify DB with TypeScript?

Yes! Ramify DB is written in TypeScript and provides full type safety. All types are automatically
inferred from your schema:

```typescript
const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		indexes: ['email'],
	},
});

// TypeScript knows the types!
const user = db.users.get('1'); // user: User | undefined
```

### Data Management

#### How do I persist data across page reloads?

Ramify DB stores data in memory, which is cleared on page reload. To persist data, you can:

1. **Save to localStorage**:

```typescript
// Save
localStorage.setItem('db-users', JSON.stringify(db.users.toArray()));

// Load
const savedUsers = JSON.parse(localStorage.getItem('db-users') || '[]');
db.users.bulkAdd(savedUsers);
```

2. **Use IndexedDB** (for larger datasets):

```typescript
// You'll need to implement IndexedDB wrapper
// or use a library like idb
```

3. **Sync with backend**:

```typescript
// Periodically sync with your API
async function syncWithBackend() {
	const users = db.users.toArray();
	await fetch('/api/users', {
		method: 'POST',
		body: JSON.stringify(users),
	});
}
```

#### What's the maximum amount of data I can store?

This depends on browser memory limits, but generally:

- **Chrome**: ~2GB of RAM per tab
- **Firefox**: ~2GB of RAM per tab
- **Safari**: ~1GB of RAM per tab

For best performance, keep collections under 10,000 records. For larger datasets, consider:

- Pagination
- Virtual scrolling
- Data pruning (remove old records)

#### How do I handle relationships between collections?

Ramify DB doesn't have built-in relationship management, but you can implement it manually:

```typescript
// Get user with their posts
function getUserWithPosts(userId: string) {
	const user = db.users.get(userId);
	const posts = db.posts.where({ userId }).toArray();

	return { user, posts };
}

// Use in React
const data = useLiveQuery(() => getUserWithPosts('user-123'), {
	collections: [db.users, db.posts],
	others: ['user-123'],
});
```

### Querying

#### Why can't I query on a non-indexed field?

For performance, Ramify DB requires queries to use indexed fields. To query on a field:

1. **Add it to indexes**:

```typescript
const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		indexes: ['name'], // Add name to indexes
	},
});

// Now you can query it
db.users.where('name').equals('Alice');
```

2. **Or use filter()**:

```typescript
// Slower, but works on any field
db.users.filter((u) => u.name === 'Alice').toArray();
```

#### How do I do OR queries?

Use `anyOf()` for OR logic on a single field:

```typescript
// Users with id '1', '2', or '3'
db.users.where('id').anyOf(['1', '2', '3']).toArray();

// Users with 'admin' or 'moderator' role
db.users.where({ role: ['admin', 'moderator'] }).toArray();
```

For OR logic across multiple fields, use `filter()`:

```typescript
db.users.filter((u) => u.role === 'admin' || u.status === 'premium').toArray();
```

#### How do I do complex queries with AND/OR logic?

Combine indexed queries with `filter()`:

```typescript
// Adults who are admins OR have premium status
db.users
	.where('age')
	.aboveOrEqual(18) // Indexed query
	.filter((u) => u.role === 'admin' || u.status === 'premium') // Complex logic
	.toArray();
```

#### Can I query nested fields?

Yes! Ramify DB supports dot notation for nested fields:

```typescript
type User = {
	id: string;
	name: string;
	address: {
		city: string;
		country: string;
	};
};

const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		indexes: ['address.city'], // Index nested field
	},
});

// Query nested field
db.users.where('address.city').equals('New York').toArray();
```

### React Integration

#### Why does my component re-render too often?

Make sure your dependencies are stable:

```typescript
// ❌ Bad - new array every render
const users = useLiveQuery(
	() => db.users.toArray(),
	{ collections: [db.users], others: [{ foo: 'bar' }] } // New object!
);

// ✅ Good - stable reference
const [filter] = useState({ foo: 'bar' });
const users = useLiveQuery(() => db.users.toArray(), { collections: [db.users], others: [filter] });
```

#### Why doesn't my component update when data changes?

Make sure you're watching the right collections:

```typescript
// ❌ Bad - not watching db.users
const users = useLiveQuery(
	() => db.users.toArray(),
	{ collections: [], others: [] } // Missing db.users!
);

// ✅ Good - watching db.users
const users = useLiveQuery(() => db.users.toArray(), { collections: [db.users], others: [] });
```

#### Can I use Ramify DB with other frameworks?

Yes! While we provide React hooks, you can use the core library with any framework:

**Vue 3**:

```typescript
import { ref, watchEffect } from 'vue';

const users = ref([]);

watchEffect(() => {
	const unsubscribe = db.users.subscribe(() => {
		users.value = db.users.toArray();
	});

	users.value = db.users.toArray();

	return unsubscribe;
});
```

**Svelte**:

```typescript
import { writable } from 'svelte/store';

const users = writable([]);

db.users.subscribe(() => {
	users.set(db.users.toArray());
});

users.set(db.users.toArray());
```

### Performance

#### How can I improve query performance?

1. **Use indexes** - Always query on indexed fields
2. **Limit results** - Use `limit()` to reduce data processing
3. **Filter after indexing** - Use indexed queries first, then filter
4. **Batch operations** - Use `bulkAdd()`, `bulkUpdate()`, etc.
5. **Memoize computations** - Use `useMemo` in React

#### Is Ramify DB faster than other solutions?

Ramify DB is optimized for client-side use with:

- **In-memory storage** - No disk I/O
- **Indexed lookups** - O(log n) for indexed queries
- **Efficient updates** - Debounced notifications

It's generally faster than:

- LocalStorage (serialization overhead)
- IndexedDB (async overhead)
- State management libraries (no query optimization)

But slower than:

- Native JavaScript arrays (for small datasets)
- Specialized data structures (for specific use cases)

#### How do I handle large datasets?

For large datasets (>10k records):

1. **Pagination**:

```typescript
const page = db.users
	.orderBy('id')
	.offset(page * pageSize)
	.limit(pageSize)
	.toArray();
```

2. **Virtual scrolling** - Only render visible items

3. **Data pruning** - Remove old/unused records:

```typescript
const oldDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
db.posts.where('createdAt').below(oldDate).delete();
```

4. **Lazy loading** - Load data on demand

### Troubleshooting

#### I'm getting "field is not indexed" error

This means you're trying to query a field that's not in your schema's indexes:

```typescript
// ❌ Error - 'name' is not indexed
db.users.where('name').equals('Alice');

// ✅ Fix 1 - Add to indexes
const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		indexes: ['name'], // Add here
	},
});

// ✅ Fix 2 - Use filter instead
db.users.filter((u) => u.name === 'Alice').toArray();
```

#### My queries return stale data

Make sure you're using `useLiveQuery` correctly:

```typescript
// ✅ Correct - will update automatically
const users = useLiveQuery(() => db.users.toArray(), { collections: [db.users], others: [] });

// ❌ Wrong - won't update
const users = db.users.toArray();
```

#### TypeScript errors with schema

Make sure your types match your schema:

```typescript
type User = {
	id: string;
	name: string;
	email: string;
};

const db = ramify.createStore({
	users: {
		primaryKey: 'id' as const, // Use 'as const'
		indexes: ['email'] as const,
	},
});
```

### Migration & Compatibility

#### Can I migrate from Dexie.js?

While the APIs are different, the concepts are similar. Here's a rough mapping:

**Dexie**:

```typescript
const db = new Dexie('myDatabase');
db.version(1).stores({
	users: 'id, email, age',
});
```

**Ramify DB**:

```typescript
const ramify = new Ramify();
const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'age'],
	},
});
```

#### Is Ramify DB compatible with React 19?

Yes! Ramify DB is fully compatible with React 19 and uses modern React patterns.

#### Does Ramify DB work in Node.js?

Ramify DB is designed for browser environments. While it might work in Node.js, it's not officially
supported or tested.

### Getting Help

#### Where can I get help?

- **Documentation** - Check the [API Reference](/docs/api-reference) and [guides](/docs)
- **GitHub Issues** - [Open an issue](https://github.com/haroonwaves/ramify-db/issues)
- **GitHub Discussions** - [Ask a question](https://github.com/haroonwaves/ramify-db/discussions)

#### How do I report a bug?

Please [open an issue](https://github.com/haroonwaves/ramify-db/issues) with:

- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Code example (if possible)
- Your environment (browser, OS, Ramify DB version)

#### How can I contribute?

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

See the [GitHub repository](https://github.com/haroonwaves/ramify-db) for more details.
