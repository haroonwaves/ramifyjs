'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Heading {
	id: string;
	text: string;
	level: number;
}

export function TableOfContents() {
	const [headings, setHeadings] = useState<Heading[]>([]);
	const [activeId, setActiveId] = useState<string>('');

	useEffect(() => {
		const article = document.querySelector('article');
		if (!article) return;

		const elements = article.querySelectorAll('h2, h3');
		const headingData: Heading[] = Array.from(elements).map((element) => ({
			id: element.id,
			text: element.textContent || '',
			level: parseInt(element.tagName.charAt(1)),
		}));

		setHeadings(headingData);

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				});
			},
			{ rootMargin: '-80px 0px -80% 0px' }
		);

		elements.forEach((element) => observer.observe(element));

		return () => observer.disconnect();
	}, []);

	if (headings.length === 0) return null;

	return (
		<nav className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto xl:block">
			<div className="space-y-4">
				<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
					On this page
				</p>
				<ul className="space-y-2 border-l border-border/40">
					{headings.map((heading) => (
						<li key={heading.id} className={cn(heading.level === 3 && 'ml-4')}>
							<a
								href={`#${heading.id}`}
								className={cn(
									'block border-l-2 py-1 pl-3 text-sm transition-colors',
									activeId === heading.id
										? 'border-foreground text-foreground'
										: 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
								)}
							>
								{heading.text}
							</a>
						</li>
					))}
				</ul>
			</div>
		</nav>
	);
}
