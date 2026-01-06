---
title: 'Ramify JS Live Queries'
description:
  'Build reactive applications with Ramify JS live queries that automatically update your UI when
  data changes in real-time.'
---

## Live Queries

**Live Queries** are the foundation of reactive applications built with Ramify JS. Instead of
performing one-off data fetches, Live Queries allow your application to observe specific collections
and automatically react to changes.

### The Mechanism

At its core, Ramify JS uses an observer pattern on every collection. When a write operation (`add`,
`put`, `update`, `delete`, or `clear`) occurs, the collection emits an event containing the affected
primary keys.

Live Query implementations (like React hooks or custom observers) listen to these events to
determine when a result set might have changed, triggering a re-execution of the query.

```typescript
// Users subscription
const unsubscribeUsers = db.users.subscribe((type, keys) => {
	/* handle users update */
});

// Posts subscription
const unsubscribePosts = db.posts.subscribe((type, keys) => {
	/* handle posts update */
});

// Later, to unsubscribe
unsubscribeUsers();
unsubscribePosts();
```

---

### Platform Integration

While the core mechanism is platform-agnostic, most users will interact with Live Queries through
framework-specific integrations.

#### React Integration

For React applications, Ramify JS provides a dedicated package `@ramifyjs/react-hooks` which
includes the `useLiveQuery` hook. This hook handles subscription lifecycle, dependency tracking, and
component re-renders automatically. Visit the [React Hooks API](/docs/api/react-hooks) documentation
for more details.

#### Custom Observers

If you are using Ramify JS without a specialist framework integration, you can use the low-level
[Collection Subscription API](/docs/api/collection#subscriptions) to build your own reactive logic.

---

### Best Practices

- **Stability**: Ensure your query functions are stable (defined outside components or memoized) to
  prevent unnecessary re-subscriptions.
- **Granular Dependencies**: Only subscribe to the collections that are actually being queried to
  minimize overhead.
- **Batching**: Use bulk operations to group multiple changes into a single notification, reducing
  the number of reactive updates.
