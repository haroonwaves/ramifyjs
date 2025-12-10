---
title: API Reference
description: Complete API reference for Ramify DB
date: 2024-12-09
category: Reference
---

# API Reference

Complete reference documentation for Ramify DB.

## Core API

### RamifyDB

The main database class.

#### Constructor

```typescript
new RamifyDB(options: DatabaseOptions)
```

**Parameters:**

- `options.name` (string): Database name
- `options.version` (number): Database version
- `options.storage` (string, optional): Storage type ('memory' | 'indexeddb' | 'localstorage')

**Example:**

```javascript
const db = new RamifyDB({
	name: 'myApp',
	version: 1,
	storage: 'indexeddb',
});
```

### Collection Methods

#### add()

Add a new document to the collection.

```typescript
collection.add(document: object): Promise<string>
```

**Returns:** Document ID

#### find()

Query documents from the collection.

```typescript
collection.find(query?: object): Promise<Document[]>
```

**Parameters:**

- `query` (object, optional): Query filter

**Example:**

```javascript
// Find all documents
const all = await users.find();

// Find with filter
const admins = await users.find({ role: 'admin' });
```

#### update()

Update documents in the collection.

```typescript
collection.update(id: string, updates: object): Promise<void>
```

#### delete()

Delete a document from the collection.

```typescript
collection.delete(id: string): Promise<void>
```

## Advanced Features

### Indexing

Create indexes for faster queries:

```javascript
await collection.createIndex('email', { unique: true });
```

### Transactions

Execute multiple operations atomically:

```javascript
await db.transaction(async (tx) => {
	await tx.collection('users').add({ name: 'Alice' });
	await tx.collection('posts').add({ title: 'Hello' });
});
```

## Events

Listen to database events:

```javascript
db.on('change', (event) => {
	console.log('Database changed:', event);
});
```
