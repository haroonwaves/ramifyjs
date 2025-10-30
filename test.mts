import { Ramify } from './dist/index.js';

type User = { id: number; name: string; tags?: string[] };

const remify = new Ramify().createStore<{ users: User }>({
	users: { primaryKey: 'id', indexes: ['name'], multiEntry: ['tags'] },
});

remify.users.add({ id: 1, name: 'John', tags: ['a', 'b'] });
remify.users.add({ id: 2, name: 'Jane', tags: ['b'] });

// queries
console.log('all:', remify.users.toArray());
console.log('by id:', remify.users.get(1));
console.log('by index:', remify.users.where('name').equals('Jane').first());
