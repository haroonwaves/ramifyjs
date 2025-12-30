---
title: 'Persistence'
description: 'Save and restore data across sessions with incremental sync'
---

## Persistence

Ramify DB is **in-memory by design**. Data exists only while your application is running. This is
intentional—it keeps Ramify DB fast, lightweight, and environment-agnostic.

However, you can add persistence by syncing Ramify DB with external storage using the built-in
observer pattern.

### Event-Based Incremental Sync (Ex: IndexedDB)

Ramify DB emits events with the primary keys of changed documents, enabling efficient incremental
sync to IndexedDB.

```typescript
import { openDB } from 'idb';
import { Ramify } from '@ramify-db/core';

// 1. Setup IndexedDB
const idb = await openDB('mydb', 1, {
	upgrade(db) {
		db.createObjectStore('users', { keyPath: 'id' });
		db.createObjectStore('posts', { keyPath: 'id' });
	},
});

// 2. Setup Ramify DB
const ramify = new Ramify();
const db = ramify.createStore<{
	users: Schema<User, 'id'>;
	posts: Schema<Post, 'id'>;
}>({
	users: { primaryKey: 'id', indexes: ['email'] },
	posts: { primaryKey: 'id', indexes: ['userId'] },
});

// 3. Event-Based Incremental Sync
db.users.subscribe(async (type, keys) => {
	switch (type) {
		case 'create':
		case 'update':
			// Fetch only the changed documents
			const docs = db.users.where('id').anyOf(keys).toArray();
			await idb.bulkPut('users', docs);
			break;
		case 'delete':
			// Delete only the removed documents
			await idb.bulkDelete('users', keys);
			break;
		case 'clear':
			await idb.clear('users');
			break;
	}
});

// 4. Initial Hydration
const storedUsers = await idb.getAll('users');
db.users.bulkAdd(storedUsers);

// Now use Ramify DB normally - persistence happens automatically!
db.users.add({ id: '1', name: 'Alice', email: 'alice@example.com' }); // Auto-synced
db.users.update('1', { name: 'Alice Smith' }); // Auto-synced
db.users.delete('1'); // Auto-synced
```

### How It Works

> [!TIP] **Hydration & Errors**: Load data from IndexedDB on app startup to hydrate Ramify DB.
> Ensure you wrap IndexedDB operations in try/catch blocks to handle potential storage errors.

> [!NOTE] **Schema Evolution**: Version your IndexedDB schema and handle migrations appropriately as
> your document structures change. For very large datasets, consider batching bulk operations during
> initial hydration.

**Observer Events**: Every collection operation emits an event with:

- `type`: Operation type (`'create'`, `'update'`, `'delete'`, `'clear'`)
- `keys`: Array of affected primary keys

### Multiple Collections

Sync multiple collections independently:

```typescript
// Users sync
db.users.subscribe(async (type, keys) => {
	/* sync logic */
});

// Posts sync
db.posts.subscribe(async (type, keys) => {
	/* sync logic */
});
```
