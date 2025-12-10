import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function ExampleShadcnDemo() {
	return (
		<div className="flex items-center justify-center min-h-screen p-8">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Welcome to shadcn/ui</CardTitle>
					<CardDescription>Your app is now integrated with shadcn/ui components!</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium">
							Email
						</label>
						<Input id="email" type="email" placeholder="Enter your email" />
					</div>
					<div className="space-y-2">
						<label htmlFor="name" className="text-sm font-medium">
							Name
						</label>
						<Input id="name" type="text" placeholder="Enter your name" />
					</div>
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button variant="outline" className="flex-1">
						Cancel
					</Button>
					<Button className="flex-1">Submit</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
