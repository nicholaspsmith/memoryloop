# Code Style and Conventions

## TypeScript

- **Strict mode enabled**: All code must pass strict TypeScript checks
- **Prefer interfaces** over type aliases for object shapes
- **Use explicit return types** for exported functions
- **No `any`**: Use `unknown` or proper typing

## Naming Conventions

- **Files**: kebab-case (e.g., `flashcard-generator.ts`)
- **Components**: PascalCase (e.g., `FlashcardCard.tsx`)
- **Functions**: camelCase (e.g., `generateFlashcards`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Database columns**: snake_case in SQL, camelCase in TypeScript

## React/Next.js

- Use **App Router** patterns (not Pages Router)
- **Server Components by default**, 'use client' only when needed
- Keep components **small and focused**
- Use **React hooks** for state management

## Database (Drizzle ORM)

- Schema defined in `lib/db/drizzle-schema.ts`
- Operations in `lib/db/operations/[entity].ts`
- Use **typed queries** with Drizzle's type inference

## API Routes

- Located in `app/api/`
- Use **NextResponse.json()** for responses
- Always validate input with **Zod**
- Include proper **error handling** and status codes

## Imports

- Use **absolute imports** with `@/` prefix
- Group imports: external → internal → types
- No circular dependencies

## Documentation

- **JSDoc comments** for exported functions
- **README** updates for new features
- **Spec files** in `specs/` for feature planning
