# Senior React Developer Standards & Skill Set

This document defines the professional coding standards and architectural principles for the `quan-li-lop-hoc` project. As an AI Agent, I will adhere to these rules for every task.

## 1. Architecture & Organization

### Feature-Sliced Design (Lite)

Organize the `src` directory by business domains to ensure high cohesion and low coupling.

- `src/features/[feature-name]`: Contains components, hooks, types, and logic specific to a domain (e.g., `attendance`, `schedule`, `billing`).
- `src/components`: Shared UI components (Atomic components like Button, Input).
- `src/hooks`: Shared utility hooks.
- `src/services` or `src/api`: Centralized API clients and data fetching logic.

## 2. State Management Strategy

### Server State (The Gold Standard)

- Use **TanStack Query** for all remote data.
- Patterns:
  - Use `useQuery` for fetching.
  - Use `useMutation` for updates with proper cache invalidation via `queryClient.invalidateQueries`.
  - Implement "Optimistic Updates" for highly interactive UI elements.

### Form Management

- Use **React Hook Form** for all forms.
- Use **Zod** for schema-based validation.
- Standard: Always infer types from Zod schemas: `type FormValues = z.infer<typeof schema>`.

## 3. TypeScript & Data Integrity

- **Strict Mode**: No `any`. Use `unknown` if types are truly unknown and refine them.
- **Type Safety**: Use Discriminated Unions for complex states (e.g., `Loading | Success | Error`).
- **Validation**: Validate API responses with Zod at the edge (API service layer) to prevent runtime crashes.

## 4. UI & Styling (Tailwind 4)

- **Compound Components**: Build complex UI (like Modals or Boards) using the Compound Component pattern for maximum flexibility.
- **Utility First**: Avoid inline styles. Use Tailwind classes.
- **Design Tokens**: Define shared constants for colors, spacing, and animations in `index.css` using CSS variables.

## 5. Performance & Optimization

- **Memoization**: Use `memo`, `useMemo`, and `useCallback` judiciously based on profiling, not prematurely.
- **Code Splitting**: Lazy load routes and large components using `React.lazy`.
- **Lists**: Use virtualization (e.g., `react-window`) for lists with >100 items.

## 6. Security & RBAC

- **Principle of Least Privilege**: Always check user roles before rendering sensitive UI components.
- **usePermission Hook**: Centralize permission logic.
- **Input Sanitization**: Never trust user input; validate all data before sending to the backend.

## 7. Commits & Documentation

- **Conventional Commits**: Use `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- **Self-Documenting Code**: Focus on clear naming over excessive commenting. Use JSDoc for complex utility functions.
