---
title: 'Pagination & Sorting'
description: 'Handle large datasets with pagination and sorting'
---

## Pagination & Sorting

Efficiently handle large datasets with Ramify DB's built-in pagination and sorting capabilities.

### Sorting

You can sort results in ascending or descending order using `orderBy()` and `reverse()`.

```typescript
// Sort by any field (ascending)
const sorted = db.users.orderBy('age').toArray();

// Sort in descending order
const reversed = db.users.orderBy('age').reverse().toArray();

// Combine with where queries
const managers = db.users.where('roles').anyOf(['manager']).orderBy('name').toArray();
```

> [!NOTE] You can sort by any field. Sorting uses JavaScript's `Array.sort()` and is not optimized
> by indexes. However, indexing fields used in `where()` queries will improve the filtering
> performance before sorting is applied.

### Offset Pagination

The most common pagination method, using `limit()` and `offset()`. Perfect for data tables and
traditional page-based UIs.

```typescript
// First page (10 items)
const page1 = db.users.orderBy('id').limit(10).offset(0).toArray();

// Second page
const page2 = db.users.orderBy('id').limit(10).offset(10).toArray();

// With filtering
const activePage1 = db.users
	.where({ status: 'active' })
	.orderBy('createdAt')
	.limit(20)
	.offset(0)
	.toArray();
```

### Cursor-Based Pagination

Alternatively you can use cursor pagination if you are data is likely to change often.

```typescript
const firstPageByDate = db.users.orderBy('createdAt').limit(10).toArray();
const lastTimestamp = firstPageByDate[firstPageByDate.length - 1].createdAt;

// Get IDs where createdAt > lastTimestamp, then fetch those records
const usersAfter = db.users
	.filter((u) => u.createdAt > lastTimestamp)
	.orderBy('createdAt')
	.limit(10)
	.toArray();
```

### Common Pitfalls

- **Large offsets**: Avoid `offset(10000)` on huge datasets—use cursor pagination instead
- **Missing indexes**: Index fields used in `where()` queries for better performance
- **Inconsistent ordering**: Always sort by a unique field (like `id`) for stable pagination
