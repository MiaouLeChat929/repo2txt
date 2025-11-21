# Project Context for Jules Agent
Project: Repo2Txt (GitHub/Local to Text Converter)

## Tech Stack
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (using `@theme` variables in CSS)
- **UI Library:** Shadcn UI (Radix Primitives). Located in `src/components/ui`.
- **Icons:** Lucide React
- **State Management:** React Hooks (`useRepoController` is the main orchestration hook).
- **Testing:** Vitest + React Testing Library.

## Architecture
- **src/components/ui/**: Reusable, dumb UI components (Shadcn). Do not modify logic here unless requested.
- **src/components/features/**: Domain-specific components (e.g., `file-tree`, `github`, `local`).
- **src/lib/**: Core logic.
  - `core/`: Smart filtering, heuristics, and statistics logic.
  - `github.ts`: GitHub API interaction.
  - `local.ts`: Local file system & Zip handling.
- **src/hooks/**: Contains `useRepoController.ts` which manages the global application state.

## Conventions
- Use Functional Components with Hooks.
- Use `toast` from `sonner` for notifications.
- When adding UI elements, prioritize existing Shadcn components in `src/components/ui`.
- Do NOT use `npm run dev` or start servers. Use `npm test` to verify logic.

## Key Logic
- **Smart Filtering:** Logic resides in `src/lib/core/heuristics.ts` and `smart-filter.ts`. When adding language support, modify `heuristics.ts`.
- **Token Counting:** Uses `gpt-tokenizer`.
