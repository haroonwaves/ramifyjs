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

- **Selection**: Target a field or criteria (`where('age')`).
- **Filtering**: Apply constraints (`above(18)`).
- **Modification**: Sort or paginate (`orderBy('age')`, `limit(10)`).
- **Execution**: Run the query (`toArray()`).

#### Index Usage

For a query to be performant, it generally needs to use an index. Ramify enforces this for range
queries: you can only call `.where('field')` if `field` is indexed. This "fail-fast" design prevents
accidental full-collection scans in production.

#### Execution Model

Queries in Ramify are synchronous and return "lazy" proxy objects by default to prevent accidental
mutation of the store.

### Examples

```typescript
// Simple equality
const adults = users.where('age').aboveOrEqual(18).toArray();

// Multiple conditions (using indexed 'status' and 'age')
// Note: Compound queries usually require compound indexes or client-side filtering
const activeAdults = users
	.where('age')
	.aboveOrEqual(18)
	.filter((u) => u.status === 'active')
	.toArray();

// OR conditions
const special = users
	.where({ role: 'admin' }) // partial match
	.filter((u) => u.verified === true) // manual filter for complex OR logic
	.toArray();
// OR: using anyOf for single field
const adminsOrMods = users.where('role').anyOf(['admin', 'moderator']).toArray();

// Sorting
const sorted = users.where('createdAt').above(0).orderBy('createdAt').reverse().toArray();
```

### Common Pitfalls

- **Querying non-indexed fields**: `where(field)` throws if the field is not indexed.
- **Expect chained filters**: The query builder is specific; use `.filter()` for arbitrary logic.
- **Forgeting toArray()**: The query object is not the result; you must execute it.
