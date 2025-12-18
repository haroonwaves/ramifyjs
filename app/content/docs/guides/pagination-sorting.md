---
title: 'Pagination & Sorting'
description: 'Handle large datasets with pagination and sorting'
---

## Pagination & Sorting

### Overview

Efficiently handling large datasets is crucial for performance and user experience. Ramify DB
supports both **Sort** operations and **Pagination** (Offset-based or Cursor-based) directly in the
query chain.

### Concepts

#### Sorting

Sorting requires an index on the field being sorted. This ensures that ordering operations are fast
and do not require loading the entire collection into memory to sort. You can sort in ascending
(`orderBy`) or descending (`reverse`) order.

#### Offset Pagination

The most common form of pagination, using `limit()` and `offset()`. It is suitable for most UI
components like data tables.

- **Pros**: Easy to implement.
- **Cons**: Performance degrades if `offset` becomes very large (e.g., skipping 10,000 records
  requires scanning them).

#### Cursor-Based Pagination

For very large datasets or infinite scroll, cursor-pagination is preferred. Instead of skipping
records, you query for records _after_ the last record of the previous page.

- **Pros**: Constant time performance regardless of dataset size.
- **Cons**: Requires a slightly more complex query setup.

### Examples

```typescript
// SORTING
// Sort by indexed field
const sorted = users.where('name').orderBy('name').toArray();
const reverse = users.where('createdAt').orderBy('createdAt').reverse().toArray();

// OFFSET PAGINATION
const page1 = users.limit(10).offset(0).toArray();
const page2 = users.limit(10).offset(10).toArray();

// CURSOR PAGINATION
// 1. Get first page
const firstPage = users.limit(10).orderBy('id').toArray();
const lastId = firstPage[firstPage.length - 1].id;

// 2. Get next page starting after lastId
const nextPage = users.where('id').above(lastId).limit(10).toArray();
```

### Common pitfalls

- **Using skip for large offsets**: Slow on big datasets, use cursor pagination
- **Not indexing sort fields**: Sorting without indexes is slow
- **Inconsistent ordering**: Always include a unique field in sort for stability
