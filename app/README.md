# Ramify DB Documentation

This is the documentation website for Ramify DB, built with Next.js 16, React 19, and Tailwind
CSS 4.

## Features

- 📚 **Comprehensive Documentation** - Complete guides, API reference, and examples
- 🎨 **Beautiful UI** - Modern design with glassmorphism, gradients, and smooth animations
- 🌓 **Dark Mode** - Full dark mode support with system preference detection
- 🔍 **Easy Navigation** - Sidebar navigation with active state highlighting
- 📱 **Responsive** - Works perfectly on all devices
- ⚡ **Fast** - Built with Next.js for optimal performance

## Documentation Structure

The documentation is organized into the following sections:

### Getting Started

- **Introduction** - Learn the basics and get up and running quickly

### Core Concepts

- **API Reference** - Complete reference for all classes, methods, and types
- **Advanced Queries** - Master complex querying patterns and techniques
- **Live Queries** - Build reactive UIs with live query observation

### Guides

- **Best Practices** - Tips and patterns for building efficient applications
- **Examples** - Real-world examples and use cases

## Adding New Documentation

Documentation files are markdown files located in `/content/docs/`. Each file should have
frontmatter:

```markdown
---
title: Your Title
description: Your description
date: 2024-12-10
category: Tutorial | Reference | Guide
---

# Your Content Here
```

The blog-kit system automatically generates routes and navigation from these files.

## Development

The documentation site runs alongside the main Ramify DB development:

```bash
# Start the dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Components

### DocsSidebar

Located in `/src/components/docs-sidebar.tsx`, this component provides the navigation sidebar with
sections and links.

### CodePlayground

Located in `/src/components/code-playground.tsx`, this component allows users to experiment with
code examples interactively.

### ThemeToggle

Located in `/src/components/theme-toggle.tsx`, this component provides dark/light/system theme
switching.

## Styling

The site uses:

- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Custom CSS** - Additional styles in `/src/app/globals.css`

## Blog Kit Integration

The documentation uses `@haroonwaves/blog-kit-core` and `@haroonwaves/blog-kit-react` for:

- Markdown parsing and rendering
- Syntax highlighting with Prism
- Automatic route generation
- Metadata extraction

## License

MIT © Usman Haroon
