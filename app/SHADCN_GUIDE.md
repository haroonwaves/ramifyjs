# shadcn/ui Integration Guide

## ✅ Installation Complete

shadcn/ui has been successfully integrated into your Next.js app!

## 📦 What Was Installed

### Dependencies Added

- `@radix-ui/react-slot` - Radix UI primitive for composition
- `class-variance-authority` - CVA for variant management
- `clsx` - Utility for constructing className strings
- `tailwind-merge` - Merge Tailwind CSS classes without conflicts
- `tw-animate-css` - Animation utilities for Tailwind

### Files Created

- `components.json` - shadcn/ui configuration
- `src/lib/utils.ts` - Utility functions (includes `cn()` helper)
- `src/components/ui/button.tsx` - Button component
- `src/components/ui/card.tsx` - Card component
- `src/components/ui/input.tsx` - Input component
- `src/components/example-shadcn-demo.tsx` - Example usage demo

### CSS Variables Added

Your `src/app/globals.css` now includes:

- Complete color system with light/dark mode support
- Border radius tokens
- Sidebar color tokens
- Chart color tokens

## 🎨 Configuration

**Style**: New York  
**Base Color**: Neutral  
**CSS Variables**: Enabled  
**Icon Library**: lucide-react (already installed)

## 🚀 Adding More Components

To add additional shadcn/ui components:

```bash
pnpm dlx shadcn@latest add [component-name]
```

### Popular Components to Add

```bash
# Forms
pnpm dlx shadcn@latest add form label textarea select checkbox radio-group

# Navigation
pnpm dlx shadcn@latest add navigation-menu tabs breadcrumb

# Feedback
pnpm dlx shadcn@latest add toast alert dialog sheet

# Data Display
pnpm dlx shadcn@latest add table badge avatar

# Layout
pnpm dlx shadcn@latest add separator scroll-area

# All at once
pnpm dlx shadcn@latest add form label textarea select checkbox navigation-menu tabs toast alert dialog table badge avatar
```

## 💡 Usage Example

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function MyComponent() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>My Card</CardTitle>
			</CardHeader>
			<CardContent>
				<Input placeholder="Enter text..." />
				<Button>Submit</Button>
			</CardContent>
		</Card>
	);
}
```

See `src/components/example-shadcn-demo.tsx` for a complete working example.

## 🎯 Key Features

1. **Fully Customizable** - Components are copied to your project, not installed as a dependency
2. **TypeScript Support** - Full type safety out of the box
3. **Accessible** - Built on Radix UI primitives
4. **Dark Mode Ready** - CSS variables configured for light/dark themes
5. **Tailwind v4 Compatible** - Works with your existing Tailwind setup

## 📚 Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Component Examples](https://ui.shadcn.com/examples)
- [Radix UI Primitives](https://www.radix-ui.com)

## 🔧 Utility Function

The `cn()` utility function in `src/lib/utils.ts` helps merge Tailwind classes:

```tsx
import { cn } from '@/lib/utils';

<Button className={cn('bg-blue-500', isActive && 'bg-green-500')} />;
```

## 🎨 Theming

To customize colors, edit the CSS variables in `src/app/globals.css`:

```css
:root {
	--primary: oklch(0.205 0 0);
	--primary-foreground: oklch(0.985 0 0);
	/* ... more variables */
}
```

Or use the [shadcn/ui theme generator](https://ui.shadcn.com/themes) to create custom themes.
