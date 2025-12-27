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
- **Filtering**: Apply constraints (`anyOf(['needsAction'])`).
- **Modification**: Sort or paginate (`orderBy('createdAt')`, `limit(10)`).
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
const highPriorityMessages = db.messages.where('metadata.priority').equals('high').toArray();

// AND condition: using exact match for multiple fields
const special = db.messages
	.where({ channelId: 'h9asa09ajh38' }) // exact match
	.filter((m) => m.metadata.readBy.length > 0) // manual filter for complex AND logic
	.toArray();

// OR condition: using anyOf for single field
const adminsOrMods = db.messages.where('metadata.priority').anyOf(['high', 'normal']).toArray();

// Sorting
const sorted = db.messages.where({ isDeleted: false }).orderBy('createdAt').reverse().toArray();
```

### Common Pitfalls

- **Querying non-indexed fields**: `where(field)` or `where({ field: value })` throws if the field
  is not indexed.
- **Expect chained filters**: The query builder is specific; use `.filter()` for arbitrary logic.
- **Forgeting toArray()**: The query object is not the result; you must execute it.
