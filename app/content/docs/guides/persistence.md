---
title: 'Persistence'
description: 'Save and restore data across sessions with incremental sync'
---

## Persistence

By default, Ramify DB operates as an **in-memory** database. Data is lost when the page refreshes.
For persistence, sync your store with **IndexedDB** using the event-based pattern below.

### Recommended Pattern: Event-Based Incremental Sync

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

**Observer Events**: Every collection operation emits an event with:

- `type`: Operation type (`'create'`, `'update'`, `'delete'`, `'clear'`)
- `keys`: Array of affected primary keys

**Incremental Sync**: Only changed documents are synced to IndexedDB:

- Single operation: `event.keys` contains 1 key
- Bulk operation: `event.keys` contains all affected keys
- Scales to any dataset size

### Multiple Collections

Sync multiple collections independently:

```typescript
// Users sync
db.users.subscribe(async (event) => {
	/* sync logic */
});

// Posts sync
db.posts.subscribe(async (event) => {
	/* sync logic */
});
```

### Common Pitfalls

- **Not handling storage errors**: IndexedDB operations can fail - use try/catch
- **Forgetting initial hydration**: Load data from IndexedDB on app startup
- **Schema changes**: Version your IndexedDB schema and handle migrations
- **Large bulk operations**: Consider batching very large bulk operations
