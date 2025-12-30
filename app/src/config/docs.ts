import { Book, Lightbulb, Rocket, Package } from 'lucide-react';

export interface DocItem {
	title: string;
	href: string;
}

export interface DocSection {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	items: DocItem[];
}

export const docSections: DocSection[] = [
	{
		title: 'Introduction',
		icon: Rocket,
		items: [{ title: 'Getting Started', href: '/docs/getting-started' }],
	},
	{
		title: 'Core Concepts',
		icon: Book,
		items: [
			{ title: 'Store & Collections', href: '/docs/core/store-and-collections' },
			{ title: 'Indexes', href: '/docs/core/indexes' },
			{ title: 'Queries', href: '/docs/core/queries' },
			{ title: 'Live Queries', href: '/docs/core/live-queries' },
		],
	},
	{
		title: 'Guides',
		icon: Lightbulb,
		items: [
			{ title: 'CRUD Patterns', href: '/docs/guides/crud' },
			{ title: 'Pagination & Sorting', href: '/docs/guides/pagination-sorting' },
			{ title: 'Search', href: '/docs/guides/search' },
			{ title: 'Persistence', href: '/docs/guides/persistence' },
			{ title: 'Performance', href: '/docs/guides/performance' },
		],
	},
	{
		title: 'API Reference',
		icon: Package,
		items: [
			{ title: 'Store API', href: '/docs/api/store' },
			{ title: 'Collection API', href: '/docs/api/collection' },
			{ title: 'Query API', href: '/docs/api/query' },
			{ title: 'React Hooks', href: '/docs/api/react-hooks' },
		],
	},
];

export const pageOrder: DocItem[] = docSections.flatMap((section) => section.items);
