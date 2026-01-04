# @ramifyjs/react-hooks

React hooks for Ramify JS - the reactive, in-memory database.

Seamlessly integrate Ramify JS into your React applications with live query observers that
automatically re-render components when data changes.

[Main Documentation →](https://ramifyjs.pages.dev)

[Benchmark](https://ramifyjs.pages.dev/docs/guides/performance#benchmark)

[Core Package →](https://www.npmjs.com/package/@ramifyjs/core)

## Install

```bash
npm install @ramifyjs/react-hooks @ramifyjs/core
# or
pnpm add @ramifyjs/react-hooks @ramifyjs/core
# or
yarn add @ramifyjs/react-hooks @ramifyjs/core
```

## Usage

```tsx
import { useLiveQuery } from '@ramifyjs/react-hooks';
import { db } from './db'; // Your Ramify instance

function UserList() {
	const users = useLiveQuery(() => db.users.toArray(), { collections: [db.users], others: [] });

	return (
		<ul>
			{users.map((user) => (
				<li key={user.id}>{user.name}</li>
			))}
		</ul>
	);
}
```

## Features

- **Live Queries**: Automatically re-render components on data updates.
- **Type-safe**: Full TypeScript support.
- **Simple API**: Easy to use `useLiveQuery` hook.

## License

[LICENSE](/LICENSE)
