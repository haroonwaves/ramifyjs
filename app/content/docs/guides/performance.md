---
title: 'Ramify JS Performance Guide'
description:
  'Optimize Ramify JS for maximum speed with indexing strategies, batch operations, and live query
  best practices. Includes benchmarks.'
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

---

### Benchmark

> Benchmarked using [Benchmark.js](https://benchmarkjs.com/) for statistically significant results.

#### Environment

- **CPU:** Apple M4 (10 cores)
- **RAM:** 16.00 GB
- **OS:** darwin arm64
- **Runtime:** Node.js v22.19.0
- **Flags:** None

#### Memory Usage

| Scenario                  | Heap Used (MB) |
| ------------------------- | -------------- |
| Empty DB                  | 12.17          |
| After Load (100k records) | 99.00          |

---

#### Results

**Dataset:** 100k messages

| Operation                 |     ms/op |     Ops/sec |     ±% | Samples |
| ------------------------- | --------: | ----------: | -----: | ------: |
| get(id)                   |  0.000034 |  29,174,761 |   0.65 |      96 |
| bulkGet(50 ids)           |  0.004326 |     231,142 |   0.94 |      99 |
| has(id)                   |  0.000003 | 287,643,315 |   4.99 |      82 |
| count()                   |  0.000004 | 285,249,233 |   3.95 |      80 |
| where(criteriaObject)     |  9.691231 |         103 |   5.22 |      69 |
| where(index).equals()     |  9.208464 |         109 |   5.27 |      67 |
| where(index).anyOf()      | 29.178278 |          34 |   5.90 |      58 |
| where(multiEntry).allOf() | 11.292184 |          89 |   2.48 |      78 |
| add(doc)                  |  0.003467 |     288,450 |  12.04 |      70 |
| put(doc)                  |  0.004037 |     247,684 |   4.45 |      91 |
| update(id, changes)       |  0.000031 |  32,547,199 |   0.73 |      98 |
| bulkPut(100 docs)         |  0.421761 |       2,371 |  16.81 |      86 |
| bulkUpdate(50 ids)        |  0.004415 |     226,477 |   0.25 |      92 |
| where(index).modify()     | 28.333660 |          35 |   1.04 |      59 |
| delete(id)                |  0.000035 |  28,208,391 |   1.49 |      88 |
| bulkDelete(100 ids)       |  0.006415 |     155,881 | 101.79 |      93 |

---

_All benchmarks run until achieving statistical significance._
