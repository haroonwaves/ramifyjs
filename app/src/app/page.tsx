import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-4xl space-y-8">
				{/* Header with Theme Toggle */}
				<header className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Welcome to Ramify DB</h1>
						<p className="text-muted-foreground">shadcn/ui integration with theme switching</p>
					</div>
				</header>

				{/* Demo Cards */}
				<div className="grid gap-6 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Theme Toggle</CardTitle>
							<CardDescription>Click the button in the top-right to switch themes</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								The theme toggle supports light, dark, and system preferences. It uses next-themes
								for seamless theme switching with no flash of unstyled content.
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>shadcn/ui Components</CardTitle>
							<CardDescription>Beautiful, accessible components</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex gap-2">
								<Button>Default</Button>
								<Button variant="secondary">Secondary</Button>
								<Button variant="outline">Outline</Button>
							</div>
							<div className="flex gap-2">
								<Button variant="destructive">Destructive</Button>
								<Button variant="ghost">Ghost</Button>
								<Button variant="link">Link</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
