import { DocsSidebar } from '@/components/docs-sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { ScrollToTop } from '@/components/scroll-to-top';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ScrollToTop />
			<MobileNav />
			<div className="flex min-h-[calc(100vh-4rem)]">
				<DocsSidebar />
				<div className="flex flex-1 overflow-x-hidden">
					<div className="mx-auto w-full max-w-7xl">
						<main className="mx-auto max-w-7xl px-4 lg:px-8 py-10 lg:py-5">
							<div>{children}</div>
						</main>
					</div>
				</div>
			</div>
		</>
	);
}
