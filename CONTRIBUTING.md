# Release Please and Commit Message Enforcement

This project uses:
- **[Release Please](https://github.com/googleapis/release-please)** for automated releases
- **[Commitlint](https://commitlint.js.org/)** for commit message validation
- **[Husky](https://typicode.github.io/husky/)** for git hooks

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or dependencies
- **revert**: Reverts a previous commit

### Examples

```bash
feat: add user authentication
fix: resolve memory leak in API client
docs: update README with setup instructions
chore: update dependencies
```

### Breaking Changes

For breaking changes, add `!` after the type or add `BREAKING CHANGE:` in the footer:

```bash
feat!: redesign API structure

BREAKING CHANGE: The API endpoint structure has been completely redesigned.
```

## Release Process

Release Please will automatically:
1. Create a release PR when commits are pushed to `main`
2. Update the CHANGELOG
3. Bump the version number
4. Create a GitHub release when the PR is merged
