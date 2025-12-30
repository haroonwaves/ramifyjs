---
title: 'Indexes'
description: 'Speed up queries with strategic indexing'
---

## Indexes

Indexes in Ramify DB are defined in your **Store Schema**. They enable O(1) lookups and efficient
sorting. Unlike some databases, you define indexes upfront when creating the store.

### Defining Indexes

Indexes are declared in the `createStore` configuration.

> [!NOTE] **Schema-Driven**: Indexes must be defined upfront in the schema. Ramify JS does not
> support dynamic index creation (e.g., via `createIndex`) after the store has been initialized.

```typescript
const db = ramify.createStore<{ users: Schema<User, 'id'> }>({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'active', 'stats.level'], // Single field indexes
		multiEntry: ['roles'], // Multi-entry indexes (arrays)
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

Added via the `indexes` array. Use these for fields you frequently query with `.where()`. Nested
properties are supported using dot notation (e.g., `'stats.level'`).

```typescript
{
	indexes: ['email', 'active', 'stats.level'];
}
```

#### Multi-Entry Indexes (Tags)

Added via the `multiEntry` array. If a field contains an array of values (e.g.,
`roles: ['manager']`), a multi-entry index allows you to query for documents that contain a specific
role. Nested properties are also supported using dot notation.

> [!IMPORTANT] **Multi-Entry vs standard**: Don't put array fields in `indexes` if you want to match
> individual elements; put them in `multiEntry`.

```typescript
// Query: Find users with tag 'developer'
db.users.where('roles').equals(['manager']).toArray();
```

### Best Practices

- **Index what you query**: If you filter by it with `where()`, index it.
- **Understand the trade-off**: Indexes speed up reads but slow down writes (every write must update
  all indexes). Memory impact is minimal since indexes use references, not copies.
