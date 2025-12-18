---
title: 'Indexes'
description: 'Speed up queries with strategic indexing'
---

## Indexes

Indexes in Ramify DB are defined in your **Store Schema**. They enable O(1) lookups and efficient
sorting. Unlike some databases, you define indexes upfront when creating the store.

### Defining Indexes

Indexes are declared in the `createStore` configuration.

```typescript
const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		// Single-field indexes
		indexes: ['email', 'username', 'age'],
		// Multi-entry indexes (arrays)
		multiEntry: ['tags', 'roles'],
	},
});
```

### Types of Indexes

#### Primary Key

Every collection has exactly one primary key. It is always indexed and must be unique.

```typescript
{
	primaryKey: 'id';
}
```

#### Secondary Indexes

Added via the `indexes` array. Use these for fields you frequently query with `.equals()`,
`.above()`, etc., or use in `.orderBy()`.

```typescript
{
	indexes: ['status', 'createdAt'];
}
```

#### Multi-Entry Indexes (Tags)

Added via the `multiEntry` array. If a field contains an array of values (e.g., `tags: ['a', 'b']`),
a multi-entry index allows you to query for documents that contain a specific tag.

```typescript
// Query: Find users with tag 'developer'
db.users.where('tags').equals('developer').toArray();
```

### Querying with Indexes

Ramify will automatically use an index if your `.where()` clause targets an indexed field.

```typescript
// Uses index 'email'
db.users.where('email').equals('alice@example.com');

// Uses index 'age' for range and sort
db.users.where('age').above(21).orderBy('age');
```

If you query a non-indexed field, Ramify may have to scan the entire collection (though currently
Ramify enforces using indexed fields for `where(string)` queries to prevent accidental performance
cliffs).

### Best Practices

- **Index what you query**: If you filter by it, index it.
- **Index what you sort**: Sorting is much faster on indexed fields.
- **Keep it lean**: Indexes consume memory. Don't index everything "just in case".

### Common Pitfalls

- **Trying to create indexes dynamically**: `users.createIndex` does not exist. Indexes must be in
  schema.
- **Indexing boolean fields**: Often not useful if cardinality is very low (true/false), though
  harmless.
- **Multi-entry vs standard**: Don't put array fields in `indexes` if you want to match individual
  elements; put them in `multiEntry`.

```

```
