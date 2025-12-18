---
title: 'Collection API'
description: 'Complete API reference for the Collection class'
---

## Collection API

The **Collection API** provides CRUD operations and query entry points for a specific collection.
Access collections via the object returned by `ramify.createStore()`.

### Core Methods

#### `add(document)` / `put(document)`

Adds a document to the collection. `add` checks for existence and throws if present; `put`
overwrites.

```typescript
// Throws if ID '1' exists
users.add({ id: '1', name: 'Alice' });

// Overwrites if ID '1' exists
users.put({ id: '1', name: 'Alice' });
```

**Returns:** The primary key of the document.

#### `get(id)`

Retrieves a document by its primary key.

```typescript
const user = users.get('1');
```

**Returns:** `T | undefined`.

#### `toArray()`

Returns all documents in the collection as an array.

```typescript
const allUsers = users.toArray();
```

**Returns:** `T[]`.

#### `update(id, changes)`

Partially updates a document.

```typescript
users.update('1', { age: 31 });
```

**Returns:** `1` if updated, `0` if not found.

#### `delete(id)`

Removes a document by its primary key.

```typescript
users.delete('1');
```

**Returns:** The primary key of the deleted document, or `undefined`.

#### `clear()`

Removes all documents from the collection.

```typescript
users.clear();
```

### Bulk Operations

- **`bulkAdd(docs)`**
- **`bulkPut(docs)`**
- **`bulkGet(ids)`**
- **`bulkUpdate([{ key, changes }])`**
- **`bulkDelete(ids)`**

All bulk operations handle batch notifications to observers for better performance.

### Query Entry Points

#### `where(field | criteria)`

Starts a query execution chain.

```typescript
// Property match
users.where('age').above(18);

// Object criteria
users.where({ age: 18, role: 'admin' });
```

**Returns:** `Query<T>` instance.

#### `filter(callback)`

Filters documents using a JS callback (slower than indexed queries).

```typescript
users.filter((u) => u.name.startsWith('A'));
```

#### `orderBy(field)`

Returns a query ordered by the specified field.

```typescript
users.orderBy('name');
```

#### `limit(n)` / `offset(n)`

Returns a query with limit/offset applied.

```typescript
users.limit(10).offset(5);
```

### Subscriptions

#### `subscribe(callback)`

Subscribes to changes in the collection.

```typescript
const unsubscribe = users.subscribe((event) => {
	console.log('Collection changed:', event);
});
```

**Returns:** An unsubscribe function.

### Properties

- **`collectionName`**: String name.
- **`primaryKey`**: The primary key field name.
- **`indexes`**: Array of indexed fields.

### Common Pitfalls

- **Using `add` on existing ID** – Use `put` if you want upsert behavior.
- **Expecting `find()`** – Use `where()` or `toArray()`/`filter()` instead.
- **Mutating results** – Returned objects are proxies; treat them as immutable or use them with
  care.
- **Forgetting to unsubscribe**: Memory leaks from event listeners
