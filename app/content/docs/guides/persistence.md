---
title: 'Persistence'
description: 'Save and restore data across sessions'
---

## Persistence

### Overview

By default, Ramify DB operates as an **in-memory** database. This means data is lost when the page
refreshes. However, due to its event-driven nature, it is straightforward to sync your store with
persistent storage mechanisms like `localStorage` or `IndexedDB`.

### Strategies

#### 1. Snapshot Persistence (Simpler)

For smaller datasets, you can simply save the entire collection to `localStorage` whenever it
changes.

- **Save**: Subscribe to collection changes and `JSON.stringify` the data.
- **Load**: On app startup, read from storage and `bulkAdd` into the collection.

#### 2. Incremental Persistence (Robust)

For larger datasets, using `IndexedDB` (via a library like `idb`) is recommended. You can treat
Ramify as a "cache" over IndexedDB, loading only what you need or syncing changes individually.

### Core Concepts

- **Hydration**: The process of populating the in-memory store from cold storage on boot.
- **Serialization**: Converting your objects to a storable format (Ramify records are plain JS
  objects, so this is usually trivial).

### Examples

```typescript
// 1. Define Store (no persistence built-in)
const ramify = new Ramify();
const db = ramify.createStore({
	users: { primaryKey: 'id', indexes: [] },
});

// 2. Persistence Logic (localStorage)
const STORAGE_KEY = 'my-app-users';

// Save to storage
function save() {
	const allUsers = db.users.toArray();
	localStorage.setItem(STORAGE_KEY, JSON.stringify(allUsers));
}

// Load from storage
function load() {
	const json = localStorage.getItem(STORAGE_KEY);
	if (json) {
		const data = JSON.parse(json);
		db.users.bulkAdd(data);
	}
}

// 3. Connect them
// Watch for any changes to the collection
db.users.subscribe((event) => {
	console.log('Data changed:', event.type);
	save();
});

// Initial hydration
load();

// --- IndexedDB Example (Conceptual) ---
// Using a library like 'idb-keyval' is simpler than raw IndexedDB
// async function syncWithIDB() {
//   const stored = await get('users-store');
//   if (stored) db.users.bulkAdd(stored);
//
//   db.users.subscribe(() => {
//     set('users-store', db.users.toArray());
//   });
// }
```

### Common pitfalls

- **Not handling storage errors**: Storage can fail or be full
- **Storing too much data**: Browser storage has limits
- **Not versioning data**: Schema changes can break persisted data
