# apps/clean — Outdoor Touring App

> Part of the **vrnb** monorepo. See the [root AGENTS.md](../../AGENTS.md) for monorepo build/test commands and environment setup.

## Project Overview

Angular 21 application using standalone components, Vitest for testing, ESLint for linting, Tailwind CSS 4 with DaisyUI 5 for styling, and Leaflet for interactive maps with GPX track rendering.

## Build/Lint/Test Commands

```bash
# Development server (http://localhost:4200)
bun run dev         # or: ng serve

# Build
bun run build       # Production build to dist/

# Unit testing (Vitest via @angular/build:unit-test)
bun run test        # Run all tests in watch mode
ng test --watch=false  # Single run
ng test --include='**/app.spec.ts'  # Single test file

# E2E testing (Playwright — starts own dev server)
bun run e2e         # Run all E2E specs in e2e/

# Linting
bun run lint        # Run ESLint
bun run lint:fix    # Fix auto-fixable issues

# Type checking
bun run check-types # tsc --noEmit

# Data generation
bun run generate:tours  # Generate tour data
bun run generate:pdfs   # Generate PDF files
bun run generate:all    # Generate tours + PDFs
```

## Code Style Guidelines

### General Principles

- Use Angular standalone components (no NgModules unless necessary)
- Prefer functional approaches; use classes only for components, services, and providers
- Enable strict TypeScript mode - no `any` types
- Use `readonly` for immutable data

### Documentation & Research

- Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

### Naming Conventions

| Element          | Convention                                  | Examples                         |
| ---------------- | ------------------------------------------- | -------------------------------- |
| Components       | PascalCase (file) + kebab-case (selector)   | `TourService`, `tours-map`       |
| Services         | PascalCase                                  | `TourService`, `GpxService`      |
| Interfaces       | PascalCase with `Interface` suffix optional | `Tour`, `TourInterface`          |
| Files            | kebab-case                                  | `tour-service.ts`, `app.spec.ts` |
| Directives/Pipes | PascalCase                                  |                                  |
| CSS classes      | kebab-case                                  | `.tour-list-section`             |

All comments must be in English.

### Imports

```typescript
// Angular core imports first
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

// External libraries
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { ArrowLeftIcon } from '@hugeicons/core-free-icons';

// Local imports (relative paths)
import { Tour } from '../tour-service';
```

### Component Structure

```typescript
@Component({
  selector: 'app-component-name',
  imports: [RouterOutlet, HugeiconsIconComponent],
  templateUrl: './component-name.html',
  styleUrl: './component-name.css',
})
export class ComponentName {
  // Use inject() for dependency injection
  private service = inject(ServiceName);

  // Public properties for templates
  readonly tours: Tour[] = [];
  icon = ArrowLeftIcon;

  // Use arrow functions for methods
  handleClick = () => {
    /* ... */
  };
}
```

### TypeScript Guidelines

- Always define return types for functions
- Use interfaces for object shapes
- Use `readonly` for arrays and objects that shouldn't be mutated
- Avoid optional properties (`?:`) when possible; use unions or explicit undefined

```typescript
// Good
readonly vTours: Tour[] = [{ name: 'V1', distance: 1.1 }];

interface Tour {
  name: string;
  distance: number;
}

// Avoid
const tours: any[] = [];
```

### Templates

- Use `@if`, `@for`, `@switch` control flow (Angular 17+)
- Prefer signal-based inputs where applicable
- Use event binding with arrow functions for methods

```html
@if (tours.length > 0) { @for (tour of tours; track tour.name) {
<div>{{ tour.name }}</div>
} }
```

### Error Handling

- Use try/catch for async operations
- Return typed results from services; avoid throwing in most cases
- Use Angular's ErrorHandler for global error handling

### Testing (Vitest)

```typescript
import { TestBed } from '@angular/core/testing';

import { TourService } from './tour-service';

describe('TourService', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourService],
    }).compileComponents();
  });

  it('should create', () => {
    const service = TestBed.inject(TourService);
    expect(service).toBeTruthy();
  });
});
```

- Use `async`/`await` with `whenStable()` for DOM testing
- Use `fixture.nativeElement` for querying DOM
- Name test files: `filename.spec.ts`

### CSS/Styling

- Use Tailwind CSS utility classes in templates
- Use DaisyUI components (e.g., `btn`, `card`, `modal`)
- Custom styles go in component CSS files
- Global styles in `src/styles.css`

```html
<div class="card bg-base-100 shadow-xl">
  <button class="btn btn-primary">Click me</button>
</div>
```

### Git Conventions

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Run `bun run lint` and `bun run check-types` before committing
- No commit without passing tests
- Never commit without my approval first

### File Organization

Use the official Angular project structure guidelines and organize by feature areas,
as recommended in the Angular Style Guide:
https://angular.dev/style-guide#organize-your-project-by-feature-areas

```
src/
├── app/
│   ├── component-name/
│   │   ├── component-name.ts      # Component class
│   │   ├── component-name.html     # Template
│   │   ├── component-name.css      # Styles
│   │   └── component-name.spec.ts  # Tests
│   ├── services/
│   │   └── service-name.ts
│   ├── models/
│   │   └── model.ts
│   └── app.ts                      # Root component
├── styles.css                      # Global styles
└── index.html
```

### Package Manager

- Uses `bun` as package manager (configured in angular.json)
- Run `bun install` for dependencies

### Key Dependencies

- Angular 21 (standalone components)
- Vitest for unit testing, Playwright for E2E
- ESLint + angular-eslint
- Prettier + prettier-plugin-tailwindcss + prettier-plugin-organize-imports
- Tailwind CSS 4 + DaisyUI 5 (`vrnb` / `vrnb-dark` themes only)
- Leaflet + leaflet-arrowheads + leaflet.fullscreen for maps
- HugeIcons for icon components

### Key Files

- `src/app/tours-service.ts` — Core business logic (tour list, filtering)
- `src/app/tours-data.ts` — Tour definitions and static data
- `src/app/tour-storage.service.ts` — Tour persistence (localStorage)
- `src/app/tours-map/` — Leaflet map view with GPX track rendering
- `src/app/tours-list/` — Tour listing view
- `src/app/tour/` — Individual tour detail view
- `public/gpx/` — GPX track files organized by tour ID (P1–P13, V1–V15)
- `scripts/generate-tours.ts` — Data generation script
- `e2e/` — Playwright E2E test specs
