---
title: 'Ramify JS Performance Guide'
description:
  'Optimize Ramify JS for maximum speed with indexing strategies, batch operations, and live query
  best practices. Includes benchmarks.'
---

# Performance

Ramify DB is designed for speed, operating entirely in-memory. However, as datasets grow, following
performance best practices ensures your application remains buttery smooth.

## Performance Strategies

### 1. Strategic Indexing

Indexes are the single most important factor for read performance in `where` queries.

- **Always index fields used in `where` clauses** for exact-match filtering (`equals`, `anyOf`,
  `allOf`).
- **Note**: Indexes do NOT improve sorting. Sorting uses JavaScript's `Array.sort()` on the filtered
  results, regardless of whether the field is indexed. Indexes only optimize the initial filtering
  step.
- **Over-indexing Warning**: Each index slows down write operations because every add/update/delete
  must update all indexes. However, memory impact is minimal since indexes store references to
  documents, not copies.

### 2. Batch Operations

When inserting or updating multiple records, always use bulk methods (`bulkAdd`, `bulkPut`,
`bulkDelete`).

- **Why?** Each individual operation triggers index updates and event emissions (for Live Queries).
  Bulk methods coalesce these into a single event and optimized index build, which is significantly
  faster.

### 3. Optimize Live Queries

Live Queries are powerful but come with overhead.

- **Granularity**: Subscribe to specific datasets rather than whole collections if possible.
- **Component Design**: Avoid having hundreds of small components each with their own
  `useLiveQuery`. Instead, query data higher up the tree and pass it down via props.
- **Selective Subscriptions**: Subscribing to data that rarely changes still consumes cycles. Only
  use Live Queries for data that requires reactive updates.

---

## Benchmark

> Benchmarked using [Benchmark.js](https://benchmarkjs.com/) for statistically significant results.

### Environment

- **CPU:** Apple M4 (10 cores)
- **RAM:** 16.00 GB
- **OS:** darwin arm64
- **Runtime:** Node.js v22.19.0
- **Flags:** None

### Memory Usage

| Scenario                  | Heap Used (MB) |
| ------------------------- | -------------- |
| Empty DB                  | 12.17          |
| After Load (100k records) | 99.00          |

---

### Results

**Dataset:** 100k messages

| Operation                 |     ms/op |     Ops/sec |    ±% | Samples |
| ------------------------- | --------: | ----------: | ----: | ------: |
| get(id)                   |  0.000054 |  18,675,870 |  0.37 |      99 |
| bulkGet(50 ids)           |  0.005611 |     178,207 |  0.13 |      99 |
| has(id)                   |  0.000004 | 248,710,748 |  6.10 |      71 |
| count()                   |  0.000004 | 253,988,630 |  7.31 |      72 |
| where(criteriaObject)     | 11.045351 |          91 |  4.86 |      68 |
| where(index).equals()     | 11.032157 |          91 |  5.44 |      68 |
| where(index).anyOf()      | 33.308149 |          30 |  5.26 |      55 |
| where(multiEntry).allOf() | 14.298829 |          70 |  1.72 |      74 |
| add(doc)                  |  0.003268 |     305,978 |  4.55 |      75 |
| put(doc)                  |  0.004364 |     229,135 | 14.55 |      83 |
| update(id, changes)       |  0.000208 |   4,808,064 |  0.22 |      98 |
| bulkPut(100 docs)         |  0.411308 |       2,431 | 14.37 |      81 |
| bulkUpdate(50 ids)        |  0.013104 |      76,314 |  0.19 |      99 |
| where(index).modify()     | 30.720711 |          33 |  0.72 |      53 |
| delete(id)                |  0.000036 |  27,511,534 |  2.33 |      87 |
| bulkDelete(100 ids)       |  0.003403 |     293,837 |  0.76 |      93 |

---

_All benchmarks run until achieving statistical significance._
