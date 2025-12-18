---
title: 'Performance'
description: 'Optimize Ramify-DB for speed and efficiency'
---

## Performance

### Overview

Ramify DB is designed for speed, operating entirely in-memory. However, as datasets grow, following
performance best practices ensures your application remains buttery smooth.

### Performance Strategies

#### 1. Strategic Indexing

Indexes are the single most important factor for read performance.

- **Always index fields used in `where` clauses.**
- **Index fields used for sorting.** Without an index, Ramify effectively scans the entire
  collection (O(n)), while an index allows O(1) or O(log n) access.

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
// ❌ BAD: No index (hypothetically allowed but slow)
// db.users.where('email').equals('john@example.com');

// ✅ GOOD: Defined in schema
const db = ramify.createStore({
  users: { primaryKey: 'id', indexes: ['email'] }
});
db.users.where('email').equals('john@example.com');

// ❌ BAD: Multiple individual adds (triggers N events)
items.forEach(item => db.todos.add(item));

// ✅ GOOD: Bulk add (triggers 1 event)
db.todos.bulkAdd(items);

// ❌ BAD: Too many separate subscriptions
function Dashboard() {
  const active = useLiveQuery(() => users.where('status').equals('active').toArray(), ...);
  const inactive = useLiveQuery(() => users.where('status').equals('inactive').toArray(), ...);
  // ...
}

// ✅ GOOD: Single subscription, derived state
function Dashboard() {
  const allUsers = useLiveQuery(() => users.toArray(), { collections: [users], others: [] });

  // Memoize derived computations
  const active = useMemo(() => allUsers?.filter(u => u.status === 'active'), [allUsers]);
  const inactive = useMemo(() => allUsers?.filter(u => u.status === 'inactive'), [allUsers]);
}
```

### Common Pitfalls

- **Over-indexing**: Each index slows down write operations.
- **Unnecessary Live Queries**: Subscribing to data that rarely changes still consumes
  memory/cycles.
- **Large Offsets**: `offset(10000)` is slow; use cursor pagination instead.
