---
title: Advanced Features
description: Explore advanced features and capabilities of Ramify DB
date: 2024-12-08
category: Guide
---

# Advanced Features

Unlock the full potential of Ramify DB with these advanced features.

## Real-time Subscriptions

Subscribe to changes in your collections:

```javascript
const unsubscribe = users.subscribe((changes) => {
	console.log('Users changed:', changes);
});

// Later, unsubscribe
unsubscribe();
```

## Complex Queries

### Operators

Ramify DB supports various query operators:

```javascript
// Greater than
await users.find({ age: { $gt: 18 } });

// Less than or equal
await users.find({ score: { $lte: 100 } });

// In array
await users.find({ role: { $in: ['admin', 'moderator'] } });

// Regular expression
await users.find({ email: { $regex: /@gmail\.com$/ } });
```

### Sorting and Pagination

```javascript
// Sort by name ascending
await users.find({}, { sort: { name: 1 } });

// Sort by age descending
await users.find({}, { sort: { age: -1 } });

// Pagination
await users.find(
	{},
	{
		limit: 10,
		skip: 20,
	}
);
```

## Relationships

Define relationships between collections:

```javascript
const posts = db.collection('posts');
const comments = db.collection('comments');

// Define relationship
posts.hasMany(comments, 'postId');

// Query with populated relationships
const postsWithComments = await posts.find(
	{},
	{
		populate: ['comments'],
	}
);
```

## Validation

Add schema validation to your collections:

```javascript
users.setSchema({
	name: { type: 'string', required: true },
	email: { type: 'string', required: true, pattern: /^.+@.+\..+$/ },
	age: { type: 'number', min: 0, max: 150 },
});

// This will throw an error
await users.add({ name: 'John' }); // Missing required email
```

## Middleware

Add middleware to intercept operations:

```javascript
users.before('add', async (doc) => {
	// Add timestamp
	doc.createdAt = new Date();
	return doc;
});

users.after('update', async (doc) => {
	// Log update
	console.log('Document updated:', doc.id);
});
```

## Backup and Restore

```javascript
// Export database
const backup = await db.export();

// Import database
await db.import(backup);
```

## Performance Optimization

### Batch Operations

```javascript
// Batch insert
await users.addMany([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]);

// Batch update
await users.updateMany({ status: 'pending' }, { status: 'active' });
```

### Caching

Enable query caching for better performance:

```javascript
const db = new RamifyDB({
	name: 'myApp',
	cache: {
		enabled: true,
		ttl: 60000, // 1 minute
	},
});
```
