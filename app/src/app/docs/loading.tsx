export default function DocsLoading() {
	return (
		<div className="space-y-8 animate-pulse">
			<div className="space-y-4">
				<div className="h-10 w-3/4 rounded-lg bg-foreground/5" />
				<div className="h-4 w-1/4 rounded bg-foreground/5" />
			</div>
			<div className="space-y-6">
				<div className="h-4 w-full rounded bg-foreground/5" />
				<div className="h-4 w-full rounded bg-foreground/5" />
				<div className="h-4 w-5/6 rounded bg-foreground/5" />
			</div>
			<div className="aspect-video w-full rounded-xl bg-foreground/5" />
			<div className="space-y-6">
				<div className="h-4 w-full rounded bg-foreground/5" />
				<div className="h-4 w-4/5 rounded bg-foreground/5" />
			</div>
		</div>
	);
}
