---
title: 'Ramify JS Collection API'
description: 'Complete API reference for Ramify JS collections including CRUD operations.'
---

## Collection API

The **Collection API** provides CRUD operations and query entry points for a specific collection.
Access collections via the object returned by `ramify.createStore()`.

---

### CRUD Methods

#### `add(document)`

Adds a document to the collection.

> [!IMPORTANT] Throws an error if a document with the same primary key already exists. Use `put()`
> if you want upsert behavior.

**Example:**

```typescript
// Throws if ID '1' exists
const userId = db.users.add({ id: '1', name: 'Alice', email: 'alice@example.com', ... });
```

**Parameters:**

- **`document`**: `T` - The document to add to the collection

**Returns:** `T[Pk]` - The primary key of the added document

---

#### `put(document)`

Adds or updates a document in the collection. Overwrites if a document with the same primary key
exists.

**Example:**

```typescript
// Overwrites if ID '1' exists
const userId = db.users.put({ id: '1', name: 'Alice Updated', email: 'alice@example.com', ... });
```

**Parameters:**

- **`document`**: `T` - The document to add or update

**Returns:** `T[Pk]` - The primary key of the document

---

#### `get(key)`

Retrieves a document by its primary key.

**Example:**

```typescript
const user = db.users.get('1');
if (user) {
	console.log(user.name);
}
```

**Parameters:**

- **`key`**: `T[Pk]` - The primary key value of the document to retrieve

**Returns:** `T | undefined` - The document if found, otherwise `undefined`

---

#### `toArray()`

Returns all documents in the collection as an array.

**Example:**

```typescript
const allUsers = db.users.toArray();
console.log(`Total users: ${allUsers.length}`);
```

**Parameters:** None

**Returns:** `T[]` - Array of all documents in the collection

---

#### `update(key, changes)`

Partially updates a document by merging the changes with the existing document.

**Example:**

```typescript
const updated = db.users.update('1', { age: 31 });
if (updated) {
	console.log('User updated');
}
```

**Parameters:**

- **`key`**: `T[Pk]` - The primary key of the document to update
- **`changes`**: `Partial<T>` - An object containing the fields to update

**Returns:** `T[Pk] | undefined` - The primary key if updated, `undefined` if not found

---

#### `delete(key)`

Removes a document by its primary key.

**Example:**

```typescript
const deleted = db.users.delete('1');
if (deleted) {
	console.log('User deleted');
}
```

**Parameters:**

- **`key`**: `T[Pk]` - The primary key of the document to delete

**Returns:** `T[Pk] | undefined` - The primary key of the deleted document, or `undefined` if not
found

---

#### `clear()`

Removes all documents from the collection.

**Example:**

```typescript
db.users.clear();
```

**Parameters:** None

**Returns:** `void`

---

### Bulk Operations

> [!NOTE] **Performance & Notifications**: Bulk operations batch notifications, so subscribers
> receive a single notification with all affected keys. Each individual operation in a bulk method
> triggers index updates but coalesce event emissions for optimized performance.

#### `bulkAdd(docs)`

Adds multiple documents to the collection. Throws if any document with the same primary key exists.

**Example:**

```typescript
const userIds = db.users.bulkAdd([
	{ id: '1', name: 'Alice' },
	{ id: '2', name: 'Bob' },
]);
```

**Parameters:**

- **`documents`**: `T[]` - Array of documents to add

**Returns:** `T[Pk][]` - Array of primary keys of the added documents

---

#### `bulkPut(docs)`

Adds or updates multiple documents in the collection.

**Example:**

```typescript
const userIds = db.users.bulkPut([
	{ id: '1', name: 'Alice Updated' },
	{ id: '2', name: 'Bob Updated' },
]);
```

**Parameters:**

- **`documents`**: `T[]` - Array of documents to add or update

**Returns:** `T[Pk][]` - Array of primary keys of the documents

---

#### `bulkGet(keys)`

Retrieves multiple documents by their primary keys.

**Example:**

```typescript
const users = db.users.bulkGet(['1', '2', '3']);
```

**Parameters:**

- **`keys`**: `Array<T[Pk]>` - Array of primary keys to retrieve

**Returns:** `Array<T | undefined>` - Array of documents (or `undefined` for not found)

---

#### `bulkUpdate(keys, changes)`

Updates multiple documents with their respective changes.

**Example:**

```typescript
const updated = db.users.bulkUpdate(['1', '2', '3'], { status: 'inactive' });
```

**Parameters:**

- **`keys`**: `Array<T[Pk]>` - Array of primary keys to update
- **`changes`**: `Partial<T>` - An object containing the fields to update

**Returns:** `Array<T[Pk] | undefined>` - Array of primary keys (or `undefined` for not found)

---

#### `bulkDelete(keys)`

Deletes multiple documents by their primary keys.

**Example:**

```typescript
const deleted = db.users.bulkDelete(['1', '2', '3']);
```

**Parameters:**

- **`keys`**: `Array<T[Pk]>` - Array of primary keys to delete

**Returns:** `Array<T[Pk] | undefined>` - Array of deleted primary keys (or `undefined` for not
found)

---

### Utility Methods

#### `count()`

Returns the number of documents in the collection.

**Example:**

```typescript
const totalUsers = db.users.count();
```

**Parameters:** None

**Returns:** `number` - The count of documents

---

#### `keys()`

Returns all primary keys in the collection.

**Example:**

```typescript
const userIds = db.users.keys();
```

**Parameters:** None

**Returns:** `Array<T[Pk]>` - Array of all primary keys

---

#### `has(key)`

Checks if a document with the given primary key exists.

**Example:**

```typescript
if (db.users.has('1')) {
	console.log('User exists');
}
```

**Parameters:**

- **`key`**: `T[Pk]` - The primary key to check

**Returns:** `boolean` - `true` if exists, `false` otherwise

---

#### `each(callback)`

Iterates over all documents in the collection.

**Example:**

```typescript
db.users.each((user) => {
	console.log(user.name);
});
```

**Parameters:**

- **`callback`**: `(document: T) => void` - Function to execute for each document

**Returns:** `void`

---

### Query Entry Points

> [!TIP] **No `find()`?**: Ramify JS uses `where()` for indexed queries and `filter()` for arbitrary
> logic. There is no explicit `find()` method.

#### `where(field)`

Starts a query execution chain targeting a specific field.

**Example:**

```typescript
// Property match
db.users.where('age').equals(18);
```

**Parameters:**

- **`field`**: `K extends keyof T` - The field name to query

**Returns:** `WhereStage<T, K>` - A query stage with filtering operators

---

#### `where(criteria)`

Starts a query execution chain with object criteria for equality matching.

**Example:**

```typescript
// Object criteria
db.users.where({ age: 18, role: 'admin' });

// Array values act as IN operator
db.users.where({ status: ['active', 'pending'] });
```

**Parameters:**

- **`criteria`**: `Criteria<T>` - An object with field-value pairs to match

**Returns:** `ExecutableStage<T>` - An executable query stage

---

#### `filter(callback)`

Filters documents using a JavaScript callback function. This loops through all documents and is
slower than indexed queries.

**Example:**

```typescript
db.users.filter((u) => u.name.startsWith('A'));
```

**Parameters:**

- **`callback`**: `(document: T) => boolean` - Predicate function to filter documents

**Returns:** `ExecutableStage<T>` - An executable query stage

---

#### `sortBy(field)`

Returns a query ordered by the specified field, this performs Js sorting under the hood.

**Example:**

```typescript
db.users.sortBy('name').toArray();
```

**Parameters:**

- **`field`**: `keyof T` - The field to order by

**Returns:** `OrderableStage<T>` - An orderable query stage

---

#### `limit(n)`

Returns a query with a limit applied.

**Example:**

```typescript
db.users.limit(10).toArray();
```

**Parameters:**

- **`count`**: `number` - Maximum number of results to return

**Returns:** `LimitedStage<T>` - A limited query stage

---

#### `offset(n)`

Returns a query with an offset applied.

**Example:**

```typescript
db.users.limit(10).offset(5).toArray();
```

**Parameters:**

- **`count`**: `number` - Number of results to skip

**Returns:** `LimitedStage<T>` - A limited query stage

---

### Subscriptions

#### `subscribe(callback)`

Subscribes to changes in the collection. The callback is invoked whenever documents are added,
updated, deleted, or the collection is cleared.

**Example:**

```typescript
const unsubscribe = db.users.subscribe((operation, keys) => {
	console.log(`Collection changed: ${operation}`, keys);
});

// Later, to unsubscribe
unsubscribe();
```

**Parameters:**

- **`cb`**: `Observer<T[Pk] | undefined>` - Callback function invoked on collection changes

Where `Observer` is defined as:

```typescript
export type Observer<Pk = any> = (type: CollectionOperation, keys: Pk[]) => void | Promise<void>;
type CollectionOperation = 'create' | 'update' | 'delete' | 'clear';
```

**Returns:** `() => void` - An unsubscribe function to stop listening to changes.

> [!WARNING] **Memory Management**: Memory leaks can occur if you forget to unsubscribe from event
> listeners when they are no longer needed.

---

#### `unsubscribe(callback)`

Unsubscribes a callback from collection changes.

**Example:**

```typescript
const callback = (operation, keys) => {
	console.log('Changed:', operation, keys);
};

db.users.subscribe(callback);
// Later
db.users.unsubscribe(callback);
```

**Parameters:**

- **`cb`**: `Observer<T[Pk] | undefined>` - The callback to unsubscribe

**Returns:** `void`

---

### Properties

#### `collectionName`

**Type:** `string`

The name of the collection.

---

#### `primaryKey`

**Type:** `Pk`

The primary key field name.

---

#### `indexes`

**Type:** `Array<NestedKeyOf<T>>`

Array of indexed field names (excluding multi-entry indexes).

---
