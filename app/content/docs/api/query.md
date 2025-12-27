---
title: 'Query API'
description: 'Complete query syntax and operators reference'
---

## Query API

Queries in Ramify DB are built using a **fluent interface**. You start a query with `.where()`,
chain operators, and execute it with a termination method (like `toArray()` or `first()`).

---

### Starting a Query

#### `where(field)`

Target a specific field for filtering operations.

**Example:**

```typescript
db.users.where('email').equals('alice@example.com');
```

**Parameters:**

- **`field`**: `K extends keyof T` - The field name to query

**Returns:** `WhereStage<T, K>` - A query stage with filtering operators

---

#### `where(criteria)`

Match fields by equality (or inclusion for array values).

**Example:**

```typescript
// Exact match
db.users.where({ status: 'active', roles: ['admin'] });
```

**Parameters:**

- **`criteria`**: `Criteria<T>` - An object with field-value pairs to match

Where `Criteria<T>` is defined as:

```typescript
export type Criteria<T> = {
	[K in keyof T]?: T[K];
} & {
	[K in NestedKeyOf<T>]?: K extends keyof T ? T[K] : GetNestedType<T, K>;
};
```

**Returns:** `ExecutableStage<T>` - An executable query stage

---

### Filtering Methods

Available after `where(field)`.

#### `equals(value)`

Exact match for the specified field.

**Example:**

```typescript
db.users.where('status').equals('active').toArray();

// Same as
// db.users.where({ status: 'active' }).toArray();
```

**Parameters:**

- **`value`**: `T[K]` - The value to match

**Returns:** `ExecutableStage<T>` - An executable query stage

---

#### `anyOf(values)`

Match any value in the provided array.

**Example:**

```typescript
db.users.where('status').anyOf(['inactive', 'banned']).toArray();
```

**Parameters:**

- **`values`**: Array of values - Match documents where the field equals any of these values

**Returns:** `ExecutableStage<T>` - An executable query stage

---

#### `allOf(values)`

Match all values in the provided array (for multi-entry indexes).

**Example:**

```typescript
// Assuming 'roles' is a multi-entry index
db.users.where('roles').allOf(['admin', 'moderator']).toArray();
```

**Parameters:**

- **`values`**: Array of values - Match documents where the field contains all of these values

**Returns:** `ExecutableStage<T>` - An executable query stage

**Note:** This is primarily useful for multi-entry indexed array fields.

---

### Modifiers

Chain these to sort, paginate, or apply additional filtering.

#### `orderBy(field)`

Sort results by the specified field in ascending order.

**Example:**

```typescript
db.users.where('status').equals('active').orderBy('name').toArray();
```

**Parameters:**

- **`field`**: `keyof T` - The field to sort by

**Returns:** `OrderableStage<T>` - An orderable query stage (supports `.reverse()`)

---

#### `reverse()`

Reverse the sort order (only available after `orderBy()`).

**Example:**

```typescript
db.users.where('status').equals('active').orderBy('name').reverse().toArray(); // Descending order
```

**Parameters:** None

**Returns:** `OrderableStage<T>` - An orderable query stage

---

#### `limit(n)`

Take the first N results.

**Example:**

```typescript
db.users.where('status').equals('active').limit(10).toArray();
```

**Parameters:**

- **`count`**: `number` - Maximum number of results to return

**Returns:** `LimitedStage<T>` - A limited query stage

---

#### `offset(n)`

Skip the first N results.

**Example:**

```typescript
db.users.where('status').equals('active').limit(10).offset(10).toArray();
```

**Parameters:**

- **`count`**: `number` - Number of results to skip

**Returns:** `LimitedStage<T>` - A limited query stage

---

#### `filter(callback)`

Apply an arbitrary JavaScript filter. This runs **after** index queries.

**Example:**

```typescript
db.users
	.where({ status: 'active' })
	.filter((u) => u.name.startsWith('A'))
	.toArray();
```

**Parameters:**

- **`callback`**: `(document: T) => boolean` - Predicate function to filter documents

**Returns:** `ExecutableStage<T>` - An executable query stage

---

### Execution Methods

Terminate the query chain and get results.

#### `toArray()`

Returns all matching documents as an array.

**Example:**

```typescript
const activeUsers = db.users.where({ status: 'active' }).toArray();
```

**Parameters:** None

**Returns:** `T[]` - Array of matching documents

---

#### `first()`

Returns the first matching document.

**Example:**

```typescript
const firstAdmin = db.users.where('roles').anyOf(['admin']).first();
```

**Parameters:** None

**Returns:** `T | undefined` - The first matching document, or `undefined` if no matches

---

#### `last()`

Returns the last matching document.

**Example:**

```typescript
const lastUser = db.users.where({ status: 'active' }).orderBy('createdAt').last();
```

**Parameters:** None

**Returns:** `T | undefined` - The last matching document, or `undefined` if no matches

---

#### `count()`

Returns the number of matching documents.

**Example:**

```typescript
const activeCount = db.users.where({ status: 'active' }).count();
```

**Parameters:** None

**Returns:** `number` - The count of matching documents

---

#### `delete()`

Deletes all matching documents.

**Example:**

```typescript
const deleted = db.users.where('status').anyOf(['inactive', 'banned']).delete();
console.log(`Deleted userIds:`, deleted.filter(Boolean));
```

**Parameters:** None

**Returns:** `Array<T[Pk] | undefined>` - Array of deleted primary keys

---

#### `modify(changes)`

Updates all matching documents with the specified changes.

**Example:**

```typescript
const modified = db.users.where('status').equals('pending').modify({ status: 'active' });
console.log(`Modified userIds:`, modified.filter(Boolean));
```

**Parameters:**

- **`changes`**: `Partial<T>` - An object containing the fields to update

**Returns:** `Array<T[Pk] | undefined>` - Array of modified primary keys

---

### Query Stages

The query API uses a type-safe fluent interface with different stages:

#### `WhereStage<T, K>`

Available after `where(field)`. Provides filtering operators:

- `equals(value)`
- `anyOf(values)`
- `allOf(values)`

#### `ExecutableStage<T>`

Available after applying a filter or using `where(criteria)`. Provides:

- Modifiers: `orderBy()`, `limit()`, `offset()`, `filter()`
- Execution: `toArray()`, `first()`, `last()`, `count()`, `delete()`, `modify()`

#### `OrderableStage<T>`

Available after `orderBy()`. Extends `ExecutableStage<T>` with:

- `reverse()`

#### `LimitedStage<T>`

Available after `limit()` or `offset()`. Extends `ExecutableStage<T>`.

---

### Performance Tips

- **Use indexed queries** – Queries on indexed fields are significantly faster than `filter()`.
- **Order matters** – Apply indexed filters first, then use `filter()` for additional criteria.
- **Limit early** – Use `limit()` to reduce the number of documents processed.
- **Multi-entry indexes** – Use `allOf()` for array fields with multi-entry indexes.
