import Link from 'next/link';
import { docSections } from '@/config/docs';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
	title: 'Documentation',
	description:
		'Complete documentation for Ramify JS - Learn how to use the lightweight, reactive in-memory database for JavaScript.',
	alternates: {
		canonical: '/docs',
	},
	openGraph: {
		title: 'Documentation | Ramify JS',
		description:
			'Complete documentation for Ramify JS - Learn how to use the lightweight, reactive in-memory database for JavaScript.',
		type: 'website',
		url: 'https://ramifyjs.haroonwaves.com/docs',
	},
	twitter: {
		card: 'summary',
		title: 'Documentation | Ramify JS',
		description:
			'Complete documentation for Ramify JS - Learn how to use the lightweight, reactive in-memory database for JavaScript.',
	},
};

export default function DocsPage() {
	return (
		<div className="mx-auto max-w-5xl">
			{/* Hero Section */}
			<div className="mb-16 text-center">
				<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
					<BookOpen className="h-4 w-4" />
					<span>Documentation</span>
				</div>
				<h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
					<span className="bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
						Ramify JS Docs
					</span>
				</h1>
				<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
					Everything you need to build fast, reactive applications with Ramify JS. From quick start
					guides to advanced patterns.
				</p>
			</div>

			{/* Quick Start CTA */}
			<div className="mb-16 overflow-hidden rounded-2xl border border-border/60 bg-linear-to-br from-blue-500/5 to-purple-500/5 p-8 backdrop-blur-sm">
				<div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
					<div>
						<h2 className="mb-2 text-2xl font-bold">New to Ramify JS?</h2>
						<p className="text-muted-foreground">
							Start with our getting started guide to learn the basics in minutes.
						</p>
					</div>
					<Link href="/docs/getting-started">
						<Button size="lg" className="group gap-2 bg-foreground text-background hover:scale-105">
							Get Started
							<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
			</div>

			{/* Documentation Sections */}
			<div className="space-y-12">
				{docSections.map((section, sectionIndex) => (
					<div key={sectionIndex}>
						<div className="mb-6 flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-background shadow-sm">
								<section.icon className="h-5 w-5" />
							</div>
							<h2 className="text-2xl font-bold">{section.title}</h2>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							{section.items.map((item, itemIndex) => (
								<Link
									key={itemIndex}
									href={item.href}
									className="group relative overflow-hidden rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur-sm transition-all hover:border-foreground/20 hover:bg-background/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.06)]"
								>
									<div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-foreground/5 blur-2xl transition-all group-hover:bg-foreground/10" />
									<div className="relative flex items-center justify-between">
										<h3 className="text-lg font-semibold">{item.title}</h3>
										<ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-foreground" />
									</div>
								</Link>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Footer CTA */}
			<div className="mt-16 rounded-2xl border border-border/60 bg-background/50 p-8 text-center backdrop-blur-sm">
				<h2 className="mb-3 text-2xl font-bold">Need Help?</h2>
				<p className="mb-6 text-muted-foreground">
					Can&apos;t find what you&apos;re looking for? Check out our GitHub repository or open an
					issue.
				</p>
				<Link href="https://github.com/haroonwaves/ramifyjs" target="_blank">
					<Button variant="outline" className="gap-2">
						View on GitHub
						<ArrowRight className="h-4 w-4" />
					</Button>
				</Link>
			</div>
		</div>
	);
}
