'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, Lightbulb, Rocket, Github, Package } from 'lucide-react';

interface DocSection {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	items: {
		title: string;
		href: string;
	}[];
}

const docSections: DocSection[] = [
	{
		title: 'Getting Started',
		icon: Rocket,
		items: [{ title: 'Introduction', href: '/docs/getting-started' }],
	},
	{
		title: 'Core Concepts',
		icon: Book,
		items: [
			{ title: 'API Reference', href: '/docs/api-reference' },
			{ title: 'Advanced Queries', href: '/docs/advanced-queries' },
			{ title: 'Live Queries', href: '/docs/live-queries' },
		],
	},
	{
		title: 'Guides',
		icon: Lightbulb,
		items: [
			{ title: 'Best Practices', href: '/docs/best-practices' },
			{ title: 'Examples', href: '/docs/examples' },
			{ title: 'Comparison', href: '/docs/comparison' },
			{ title: 'FAQ', href: '/docs/faq' },
		],
	},
];

export function MobileNav() {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const pathname = usePathname();

	const filteredSections = docSections.map((section) => ({
		...section,
		items: section.items.filter((item) =>
			item.title.toLowerCase().includes(searchQuery.toLowerCase())
		),
	}));

	return (
		<>
			{/* Mobile Menu Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background shadow-lg transition-colors hover:bg-foreground/5 lg:hidden"
				aria-label="Toggle menu"
			>
				{isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
			</button>

			{/* Mobile Sidebar Overlay */}
			{isOpen && (
				<div
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Mobile Sidebar */}
			<aside
				className={cn(
					'fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto border-r border-border/40 bg-background transition-transform duration-200 lg:hidden',
					isOpen ? 'translate-x-0' : '-translate-x-full'
				)}
			>
				<div className="flex h-full flex-col gap-8 p-6 pt-20">
					{/* Search */}
					<div className="relative">
						<input
							type="text"
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-foreground/10"
						/>
					</div>

					{/* Navigation */}
					<nav className="flex-1 space-y-8 overflow-y-auto">
						{filteredSections.map((section) => {
							if (section.items.length === 0) return null;
							const Icon = section.icon;

							return (
								<div key={section.title} className="space-y-3">
									<div className="flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
										<Icon className="h-3.5 w-3.5" />
										{section.title}
									</div>
									<ul className="space-y-0.5">
										{section.items.map((item) => {
											const isActive = pathname === item.href;
											return (
												<li key={item.href}>
													<Link
														href={item.href}
														onClick={() => setIsOpen(false)}
														className={cn(
															'block rounded-md px-2 py-1.5 text-sm transition-colors',
															isActive
																? 'bg-foreground/5 font-medium text-foreground'
																: 'text-muted-foreground hover:bg-foreground/3 hover:text-foreground'
														)}
													>
														{item.title}
													</Link>
												</li>
											);
										})}
									</ul>
								</div>
							);
						})}
					</nav>

					{/* Quick Links */}
					<div className="space-y-2 border-t border-border/40 pt-6">
						<a
							href="https://github.com/haroonwaves/ramify-db"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/3 hover:text-foreground"
						>
							<Github className="h-4 w-4" />
							<span>GitHub</span>
						</a>
						<a
							href="https://www.npmjs.com/package/ramify-db"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/3 hover:text-foreground"
						>
							<Package className="h-4 w-4" />
							<span>npm</span>
						</a>
					</div>
				</div>
			</aside>
		</>
	);
}
