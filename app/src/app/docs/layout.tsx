import { DocsSidebar } from '@/components/docs-sidebar';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { MobileNav } from '@/components/mobile-nav';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<MobileNav />
			<div className="flex min-h-[calc(100vh-4rem)]">
				<DocsSidebar />
				<div className="flex flex-1 overflow-x-hidden">
					<div className="mx-auto w-full max-w-7xl">
						<div className="px-6 pt-6 pb-3 lg:px-8">
							<DocsBreadcrumb />
						</div>
						<main className="px-6 pb-20 lg:px-8">
							<div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-h1:text-3xl prose-h1:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2 prose-h3:text-xl prose-h3:mt-8 prose-p:leading-7 prose-a:font-normal prose-a:text-foreground prose-a:underline prose-a:decoration-border/60 prose-a:underline-offset-2 hover:prose-a:decoration-foreground prose-pre:border prose-pre:border-border/40 prose-pre:bg-muted/30 prose-code:text-foreground prose-code:before:content-[''] prose-code:after:content-[''] prose-strong:font-semibold">
								{children}
							</div>
						</main>
					</div>
				</div>
			</div>
		</>
	);
}
