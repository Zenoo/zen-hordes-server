# Copilot Instructions

## Code Style and Best Practices

### Exports

- **Never use default exports**. Always use named exports with `export const`.
- This prevents naming inconsistencies across imports and makes refactoring safer.

### Function Declarations

- **Never use function declarations**. Always use `const` with arrow functions.
- Use `export const myFunction = () => {}` instead of `export function myFunction() {}`.

### Type Safety

- **Never use the `any` type**. All code must be fully type-safe.
- Use proper TypeScript types, interfaces, or type inference.
- If the type is complex or unknown, use `unknown` and perform type guards/validation.
- **Never use non-null assertions (`!`)**. Use proper null checks or optional chaining instead.
- Prefer explicit type guards and validation over type assertions.

### Performance

- **Optimize for high concurrent request loads**.
- Avoid blocking operations in request handlers.
- Use efficient data structures and algorithms.
- Minimize memory allocations and object creation in hot paths.
- Consider caching strategies where appropriate.
