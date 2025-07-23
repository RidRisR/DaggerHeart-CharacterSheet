# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based character sheet generator for the DaggerHeart tabletop RPG system by Critical Role. The application allows users to create, edit, and manage DaggerHeart characters with an interactive digital character sheet interface.

## Development Commands

```bash
# Development server
pnpm dev

# Build for production (GitHub Pages)
pnpm build

# Build for local deployment
pnpm build:local

# Start production server
pnpm start

# Linting
pnpm lint

# Testing
pnpm test          # Run tests in watch mode
pnpm test:run      # Run tests once
pnpm test:ui       # Run tests with UI
pnpm test:coverage # Run tests with coverage
pnpm test:unit     # Run only unit tests
pnpm test:integration # Run only integration tests
```

## Key Architecture Components

### State Management
- **Zustand stores** for state management:
  - `lib/sheet-store.ts` - Main character sheet data and actions
  - `card/stores/unified-card-store.ts` - Unified card management system
  - `lib/multi-character-storage.ts` - Multiple character persistence
  - `lib/pinned-cards-store.ts` - Card pinning functionality

### Card System
- **Card types** defined in `card/card-types.ts`:
  - Standard card types: Profession, Ancestry, Community, Subclass, Domain
  - Variant cards for custom content
  - Card validation and processing utilities
- **Card converters** in `card/*/convert.ts` files transform raw card data into StandardCard format
- **Unified card system** manages both built-in and custom imported cards

### Component Structure
- **Character Sheet sections** in `components/character-sheet-sections/` for different parts of the sheet
- **Modals** in `components/modals/` for card selection and character management
- **UI components** in `components/ui/` using Radix UI primitives with Tailwind CSS
- **Print system** with dedicated print context and components

### Data Management
- **Local storage** for character data persistence
- **Import/Export system** for custom card batches in JSON format
- **Character data validation** with Zod schemas
- **Default data** structures in `lib/default-sheet-data.ts`

## Build Configuration

- **Next.js** with static export (`output: 'export'`)
- **Multiple deployment targets**:
  - GitHub Pages (with `assetPrefix` and `basePath`)
  - Local builds (relative paths)
- **TypeScript and ESLint** errors ignored during builds for rapid development

## Testing Setup

- **Vitest** for unit and integration testing
- **Testing Library** for React component testing
- **Happy DOM** for browser environment simulation
- Test files organized in `tests/unit/` and `tests/integration/`

## Important Notes

- The application supports both Chinese and English content
- Custom card imports are handled through the unified card store
- Character sheet has special card slot protections (first 5 slots in focused deck)
- Print functionality includes image loading optimization
- The project uses PNPM as the package manager