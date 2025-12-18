---
title: 'CRUD Patterns'
description: 'Create, Read, Update, and Delete operations in Ramify-DB'
---

## CRUD Patterns

### Overview

**CRUD** (Create, Read, Update, Delete) represents the four basic functions usage in persistent
storage. Ramify DB provides a simple, synchronous API for these operations, ensuring type safety
throughout the process.

### Operations

#### Create

Adding records is done via `add()` (which ensures uniqueness) or `put()` (which handles upserts).

- **Single**: `collection.add(doc)`
- **Bulk**: `collection.bulkAdd([doc1, doc2])`

#### Read

Data can be retrieved by primary key or via queries.

- **By ID**: `collection.get(id)`
- **All**: `collection.toArray()`
- **Query**: `collection.where(...).toArray()`

#### Update

Updates are partial and immutable by default (they replace the internal record).

- **Single**: `collection.update(id, changes)`
- **Bulk**: `collection.modify(changes)` on a query.

#### Delete

Removing records is permanent.

- **Single**: `collection.delete(id)`
- **Bulk**: `collection.delete()` on a query result.

### Examples

```typescript
// CREATE
users.add({
	id: '1',
	name: 'John Doe',
	email: 'john@example.com',
	age: 30,
});
// or bulk
users.bulkAdd([user1, user2]);

// READ
const user = users.get('1');
const allUsers = users.toArray();
const adults = users.where('age').aboveOrEqual(18).toArray();

// UPDATE
users.update('1', { age: 31 });

// DELETE
users.delete('1');

// Delete by query
users.where({ status: 'inactive' }).delete();

// Clear all
users.clear();
```

### Common pitfalls

- **Not handling missing records**: Always check if `get()` returns undefined
- **Forgetting IDs**: Every record needs a unique ID
- **Mutating returned objects**: Always use `update()` to modify data
