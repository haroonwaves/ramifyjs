---
title: 'Performance'
description: 'Optimize Ramify JS for speed and efficiency'
---

## Performance

Ramify DB is designed for speed, operating entirely in-memory. However, as datasets grow, following
performance best practices ensures your application remains buttery smooth.

### Performance Strategies

#### 1. Strategic Indexing

Indexes are the single most important factor for read performance in `where` queries.

- **Always index fields used in `where` clauses** for exact-match filtering (`equals`, `anyOf`,
  `allOf`).
- **Note**: Indexes do NOT improve sorting. Sorting uses JavaScript's `Array.sort()` on the filtered
  results, regardless of whether the field is indexed. Indexes only optimize the initial filtering
  step.
- **Over-indexing Warning**: Each index slows down write operations because every add/update/delete
  must update all indexes. However, memory impact is minimal since indexes store references to
  documents, not copies.

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
- **Selective Subscriptions**: Subscribing to data that rarely changes still consumes cycles. Only
  use Live Queries for data that requires reactive updates.
