---
title: 'Performance'
description: 'Optimize Ramify-DB for speed and efficiency'
---

## Performance

Ramify DB is designed for speed, operating entirely in-memory. However, as datasets grow, following
performance best practices ensures your application remains buttery smooth.

### Performance Strategies

#### 1. Strategic Indexing

Indexes are the single most important factor for read performance in `where` queries.

- **Always index fields used in `where` clauses** for exact-match filtering (`equals`, `anyOf`,
  `allOf`).
- **Note**: Indexes do NOT improve sorting or range query performance. Sorting uses JavaScript's
  `Array.sort()` on the filtered results, regardless of whether the field is indexed. Indexes only
  optimize the initial filtering step.

#### 2. Batch Operations

When inserting or updating multiple records, always use bulk methods (`bulkAdd`, `bulkPut`,
`bulkDelete`).

- **Why?** Each individual operation triggers index updates and event emissions (for Live Queries).
  Bulk methods coalesce these into a single event and optimized index build, which is significantly
  faster.

#### 3. Optimize Live Queries

Live Queries are powerful but come with overhead.

- **Granularity**: Subscribe to specific datasets rather than whole collections if possible.
- **Component Design**: Avoid having hundreds of small components each with their own
  `useLiveQuery`. Instead, query data higher up the tree and pass it down via props.

### Examples

```typescript
// ❌ ERROR: Querying non-indexed fields throws an error
// db.users.where('name').equals('john');

// ✅ Try this:
db.users.filter((user) => user.name === 'john').toArray();

// ❌ BAD: Multiple individual adds (triggers N events)
items.forEach((item) => db.todos.add(item));

// ✅ GOOD: Bulk add (triggers 1 event)
db.todos.bulkAdd(items);

// ❌ BAD: Too many separate subscriptions
function Dashboard() {
	const active = useLiveQuery(() => db.users.where('status').equals('active').toArray(), {
		collections: [db.users],
		others: [],
	});
	const inactive = useLiveQuery(() => db.users.where('status').equals('inactive').toArray(), {
		collections: [db.users],
		others: [],
	});
	// ...
}

// ✅ GOOD: Single subscription, derived state
function Dashboard() {
	const allUsers = useLiveQuery(() => db.users.toArray(), { collections: [db.users], others: [] });

	// Memoize derived computations
	const active = useMemo(() => allUsers?.filter((u) => u.status === 'active'), [allUsers]);
	const inactive = useMemo(() => allUsers?.filter((u) => u.status === 'inactive'), [allUsers]);
}
```

### Common Pitfalls

- **Over-indexing**: Each index slows down write operations because every add/update/delete must
  update all indexes. However, memory impact is minimal since indexes store references to documents,
  not copies.
- **Unnecessary Live Queries**: Subscribing to data that rarely changes still consumes cycles.
- **Large Offsets**: `offset(10000)` is slow; use cursor pagination instead.
