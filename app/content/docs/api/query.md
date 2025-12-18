---
title: 'Query API'
description: 'Complete query syntax and operators reference'
---

## Query API

Queries in Ramify DB are built using a **fluent Interface**. You start a query with `.where()`,
chain operators, and execute it with a termination method (like `toArray()` or `first()`).

### Starting a Query

#### `where(field)`

Target a specific field for range or comparison operations.

```typescript
users.where('age').above(18);
```

#### `where(criteria)`

Match fields by equality (or inclusion).

```typescript
users.where({
	role: 'admin',
	status: ['active', 'pending'], // acts as IN
});
```

### Comparison Methods

Available after `where(field)`.

- **`equals(value)`**: Exact match.
- **`notEquals(value)`**: Not match.
- **`anyOf(values)`**: Match any value in the array.
- **`above(value)`**: `>`
- **`aboveOrEqual(value)`**: `>=`
- **`below(value)`**: `<`
- **`belowOrEqual(value)`**: `<=`
- **`between(lower, upper)`**: Inclusive range `[lower, upper]`.

### Modifiers

Chain these to sort or paginate.

- **`orderBy(field)`**: Sort results.
- **`reverse()`**: Reverse sort order.
- **`limit(n)`**: Take first N results.
- **`offset(n)`**: Skip first N results.
- **`filter(cb)`**: Apply arbitrary JS filter (runs after index queries).

### Execution Methods

Terminate the chain and get results.

- **`toArray()`**: Returns all matching documents.
- **`first()`**: Returns the first match or undefined.
- **`last()`**: Returns the last match or undefined.
- **`count()`**: Returns the number of matches.
- **`delete()`**: Deletes all matching documents.
- **`modify(changes)`**: Updates all matching documents.

### Examples

```typescript
// Range Query
users.where('age').between(18, 65).toArray();

// Complex Sort & Limit
users.where('status').equals('active').orderBy('lastName').offset(10).limit(5).toArray();

// Delete by Query
users
	.where('lastLogin')
	.below(Date.now() - 10000)
	.delete();
```
