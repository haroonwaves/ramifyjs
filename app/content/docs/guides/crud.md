---
title: 'CRUD Patterns'
description: 'Create, Read, Update, and Delete operations in Ramify-DB'
---

## CRUD Patterns

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
- **All**: `collection.toArray()` (use with caution on large datasets)
- **Query**: `collection.where(...).toArray()`

#### Update

Updates are partial and immutable by default (they replace the internal record).

- **Single**: `collection.update(id, changes)`
- **Bulk**: `collection.bulkUpdate([{ key, changes }])`
- **Query**: `collection.where(...).modify(changes)`

#### Delete

Removing records is permanent.

- **Single**: `collection.delete(id)`
- **Bulk**: `collection.bulkDelete(ids)`
- **Query**: `collection.where(...).delete()`

### Examples

```typescript
// CREATE
db.users.add({
	id: '1',
	name: 'John Doe',
	email: 'john@example.com',
	age: 30,
});
db.users.bulkAdd([user1, user2]);

// READ
const user = db.users.get('1');
const allUsers = db.users.toArray();
const adults = db.users.where('status').equals('active').toArray();

// UPDATE
db.users.update('1', { age: 31 });
db.users.bulkUpdate([{ id: '1', changes: { age: 32 } }]);
db.users.where({ status: 'inactive' }).modify({ status: 'active' });

// DELETE
db.users.delete('1');
db.users.bulkDelete(['1', '2']);
db.users.where({ status: 'inactive' }).delete();

// Clear all
db.users.clear();
```

### Common pitfalls

- **Not handling missing records**: Always check if `get()` returns undefined
- **Forgetting IDs**: Every record needs a unique ID
