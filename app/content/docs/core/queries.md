---
title: 'Queries'
description: 'Find and filter data with powerful query syntax'
---

## Queries

Queries allow you to retrieve subsets of data from your collections based on specific criteria.
Ramify DB uses a **fluent interface** (method chaining) to build queries, making them intuitive to
read and write.

Unlike simple array filters, Ramify queries leverage **indexes** to maintain high performance even
as your datasets grow.

### Query Mechanics

#### Fluent API

Queries start with `.where()` and proceed through a chain of operations.

- **Selection**: Target a field or criteria (`where('tags')`).
- **Filtering**: Apply constraints (`anyOf(['developer', 'manager'])`).
- **Modification**: Sort or paginate (`orderBy('name')`, `limit(10)`).
- **Execution**: Run the query (`toArray()`).

#### Index Usage

For a query to be performant, it generally needs to use an index. Ramify enforces this for queries:
you can only call `.where('field')` or `.where({ field: value })` if `field` is indexed. This
"fail-fast" design prevents accidental full-collection scans in production.

#### Execution Model

Queries in Ramify are synchronous and return "lazy" proxy objects by default to prevent accidental
mutation of the store.

### Examples

```typescript
// Simple equality
const developers = db.users.where('tags').equals('developer').toArray();

// AND condition: using exact match for multiple fields
const special = db.users
	.where({ role: 'admin' }) // exact match
	.filter((u) => u.verified === true) // manual filter for complex AND logic
	.toArray();

// OR condition: using anyOf for single field
const adminsOrMods = db.users.where('role').anyOf(['admin', 'moderator']).toArray();

// Sorting
const sorted = db.users.where({ status: 'active' }).orderBy('createdAt').reverse().toArray();
```

### Common Pitfalls

- **Querying non-indexed fields**: `where(field)` or `where({ field: value })` throws if the field
  is not indexed.
- **Expect chained filters**: The query builder is specific; use `.filter()` for arbitrary logic.
- **Forgeting toArray()**: The query object is not the result; you must execute it.
