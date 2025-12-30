---
title: 'Persistence'
description: 'Save and restore data across sessions with incremental sync'
---

## Persistence

Ramify JS is **in-memory by design**. Data exists only while your application is running. This is
intentional—it keeps Ramify JS fast, lightweight, and environment-agnostic.

However, you can add persistence by syncing Ramify JS with external storage using the built-in
observer pattern.

### Implementing Custom Persistence

Ramify JS emits events with the primary keys of changed documents, enabling efficient incremental
sync to any external storage (e.g., IndexedDB, LocalStorage, or a remote API).

```typescript
import { Ramify, Schema } from '@ramifyjs/core';

// 1. Setup Ramify JS
const ramify = new Ramify();
const db = ramify.createStore<{
	users: Schema<User, 'id'>;
}>({
	users: { primaryKey: 'id', indexes: ['email'] },
});

// 2. Incremental Sync Logic
db.users.subscribe(async (type, keys) => {
	try {
		switch (type) {
			case 'create':
			case 'update':
				const docs = db.users.where('id').anyOf(keys).toArray();
				await myExternalDB.bulkPut('users', docs);
				break;
			case 'delete':
				await myExternalDB.bulkDelete('users', keys);
				break;
			case 'clear':
				await myExternalDB.clear('users');
				break;
		}
	} catch (error) {
		console.error('Persistence failed:', error);
		// IMPORTANT: If persistence fails, you may need to update/revert
		// the stale data in Ramify JS to keep it in sync with your storage.
	}
});

// 3. Initial Hydration (Do it as batch if dataset is large)
const storedUsers = await myExternalDB.getAll('users');
db.users.bulkAdd(storedUsers);
```

### How It Works

> [!TIP] **Hydration & Errors**: Load data from external storage on app startup to hydrate Ramify
> DB. Always wrap persistence operations in try/catch blocks. If an external save fails, remember to
> handle the stale data in Ramify JS to prevent UI/State inconsistencies.

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
