# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the frontend app (React + TypeScript).
- `src/components/` holds page-level and shared UI components (`TopNav.tsx`, `PostPage.tsx`, `ui/` primitives).
- `src/hooks/` stores custom hooks (for example `useGamepad.ts`), and `src/lib/` contains utility helpers.
- `src/public/` and `public/` store static assets; user-uploaded post images are written to `public/uploads/posts/`.
- `server.ts` is the Express + Redis backend entrypoint used in development and production.
- `version/` tracks release notes; `dist/` is build output (generated, do not edit manually).

## Build, Test, and Development Commands
- `npm run dev`: starts the app server via `tsx server.ts` (serves API + Vite middleware on port `3000`).
- `npm run start`: same as `dev` for runtime startup.
- `npm run build`: builds frontend assets with Vite into `dist/`.
- `npm run preview`: previews the Vite production build locally.
- `npm run lint`: runs `tsc --noEmit` type checks.
- `npm run clean`: removes `dist/` before rebuilding.

## Coding Style & Naming Conventions
- Use TypeScript/TSX with 2-space indentation and semicolons.
- Match surrounding quote style in touched files (the codebase currently mixes single and double quotes by file).
- Components and types: `PascalCase`; hooks: `useCamelCase`; helpers/variables/functions: `camelCase`.
- Keep modules focused: UI in `src/components`, reusable logic in `src/hooks` or `src/lib`.

## Testing Guidelines
- No dedicated test framework is configured yet.
- Minimum gate before PR: `npm run lint` and a manual smoke test of login, post CRUD, comments, and image upload flows.
- When adding tests later, place `*.test.ts(x)` alongside the feature or under a dedicated `tests/` directory.

## Commit & Pull Request Guidelines
- Existing history uses short imperative subjects (for example `new home`, `Delete 1.0.9.md`). Keep commit titles concise and verb-first.
- Prefer format: `<scope>: <action>` (example: `posts: validate guest nickname length`).
- PRs should include: purpose, key changes, manual test steps, linked issue (if any), and screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Redis is expected at `redis://localhost:6379` unless reconfigured.
- Never commit real credentials, tokens, or `.env` secrets; use environment variables for new sensitive settings.
