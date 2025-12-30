'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { docSections } from '@/config/docs';

export function DocsSidebar() {
	const pathname = usePathname();

	return (
		<aside className="sticky hidden top-16 overflow-y-auto h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border/40 bg-background lg:block">
			<div className="flex h-full flex-col gap-8 p-6">
				{/* Navigation */}
				<nav className="flex-1 space-y-8 ">
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
	);
}
