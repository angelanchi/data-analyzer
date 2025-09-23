# Repository Guidelines

## Project Structure & Module Organization
This monorepo separates the React client and Express API. Place UI components in `frontend/src/components`, screen containers in `frontend/src/pages`, shared hooks in `frontend/src/hooks`, and network clients under `frontend/src/services`. Backend route definitions stay in `backend/src/routes`, with controllers in `backend/src/controllers` and business logic in `backend/src/services`. Reuse TypeScript contracts from `shared/types`, utilities from `shared/utils`, and sample fixtures under `shared/data` for local testing.

## Build, Test, and Development Commands
- `npm run install:all` installs dependencies for every package.
- `npm run dev` boots both servers with hot reload; use `npm run frontend:dev` or `npm run backend:dev` for stack-specific work.
- `npm run frontend:build` and `npm run backend:build` produce production bundles, while `npm run start` serves the compiled artifacts.

## Coding Style & Naming Conventions
TypeScript is required end-to-end with strict mode enabled. Follow 2-space indentation, single quotes, and trailing commas as in `frontend/src/App.tsx`. Name components and classes in PascalCase, hooks as `useSomething`, utilities in camelCase, and import shared code through the `@/` alias instead of deep relative paths. Run `cd backend && npm run lint` before review; the frontend relies on the default React Scripts linting.

## Testing Guidelines
Backend tests use Jest with ts-jest (`cd backend && npm test`), while the frontend suite runs via React Testing Library (`cd frontend && npm test`). Place specs alongside implementation files with the `.test.ts` or `.test.tsx` suffix. Aim to cover new endpoints, reducers, and data-cleaning helpers; refresh fixtures in `shared/utils` when contract shapes change.

## Commit & Pull Request Guidelines
Keep commit subjects imperative and under ~72 characters, optionally prefixed with tags such as `feat:` or `fix:`. In pull requests, summarize the problem, outline the solution, list manual or automated test commands, and link tracker tickets. Attach screenshots or GIFs for UI changes and call out migrations or environment updates explicitly.

## Security & Configuration Tips
Do not commit `.env` files or SQLite artifacts from `backend/data`. Configure `FRONTEND_URL`, JWT secrets, and storage paths in `backend/.env` per environment, and rotate credentials before deployment. Uploaded assets in `backend/uploads` are transient; prune oversized fixtures during review to keep diffs manageable.
