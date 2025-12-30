'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docSections } from '@/config/docs';

export function MobileNav() {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();

	return (
		<>
			{/* Mobile Menu Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-2 left-2 z-50 flex h-12 w-12 items-center justify-center hover:bg-foreground/5 lg:hidden!"
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
				<div className="flex h-full flex-col gap-8 pt-20">
					{/* Navigation */}
					<nav className="flex-1 space-y-8 overflow-y-auto p-6">
						{docSections.map((section) => {
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
				</div>
			</aside>
		</>
	);
}
