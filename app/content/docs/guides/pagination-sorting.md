---
title: 'Pagination & Sorting'
description: 'Handle large datasets with pagination and sorting'
---

## Pagination & Sorting

Efficiently handle large datasets with Ramify JS's built-in pagination and sorting capabilities.

### Sorting

You can sort results in ascending or descending order using `sortBy()` and `reverse()`.

```typescript
// Sort by any field (ascending)
const sorted = db.users.sortBy('age').toArray();

// Sort in descending order
const reversed = db.users.sortBy('age').reverse().toArray();

// Combine with where queries
const managers = db.users.where('roles').anyOf(['manager']).sortBy('name').toArray();
```

> [!TIP] **Inconsistent Ordering**: Always sort by a unique field (like `id`) for stable pagination,
> especially if the secondary sort field (like `age`) contains duplicate values.

> [!NOTE] You can sort by any field. Sorting uses JavaScript's `Array.sort()` and is not optimized
> by indexes. However, indexing fields used in `where()` queries will improve the filtering
> performance before sorting is applied.

### Offset Pagination

The most common pagination method, using `limit()` and `offset()`. Perfect for data tables and
traditional page-based UIs.

```typescript
// First page (10 items)
const page1 = db.users.sortBy('id').limit(10).offset(0).toArray();

// Second page
const page2 = db.users.sortBy('id').limit(10).offset(10).toArray();

// With filtering
const activePage1 = db.users
	.where({ status: 'active' })
	.sortBy('createdAt')
	.limit(20)
	.offset(0)
	.toArray();
```

> [!CAUTION] **Large Offsets**: Avoid using `offset(10000)` or larger on huge datasets. Ramify JS
> must iterate through all offset records, which can impact performance. Use cursor-based pagination
> for deep pagination.

### Cursor-Based Pagination

Alternatively you can use cursor pagination if you are data is likely to change often.

```typescript
const firstPageByDate = db.users.sortBy('createdAt').limit(10).toArray();
const lastTimestamp = firstPageByDate[firstPageByDate.length - 1].createdAt;

// Get IDs where createdAt > lastTimestamp, then fetch those records
const usersAfter = db.users
	.filter((u) => u.createdAt > lastTimestamp)
	.sortBy('createdAt')
	.limit(10)
	.toArray();
```
