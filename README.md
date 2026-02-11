# Zen Hordes Server

Server for the Zen Hordes browser extension. This server acts as a backend to interact with the MyHordes API and provide data to the Zen Hordes extension.

## Features

- ✅ Type-safe API with TypeScript
- ✅ Request validation using Zod
- ✅ Auto-generated OpenAPI/Swagger documentation from Zod schemas
- ✅ MyHordes API integration with generated types
- ✅ Express-based REST API
- ✅ ESLint + Prettier with pre-commit hooks
- ✅ Automated releases with Release Please
- ✅ Conventional commit enforcement

## Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (v10.12.4 or higher)

## Installation

```bash
# Clone the repository
git clone https://github.com/zenoo/zen-hordes-server.git
cd zen-hordes-server

# Install dependencies
pnpm install
```

## Configuration

1. Copy the environment variables example:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your MyHordes API credentials:
   ```
   API_APPKEY=your_app_key_here
   PORT=3000
   ```

## Development

### Start the development server

```bash
pnpm dev
```

The server will start on `http://localhost:3000` with hot-reload enabled.

### Available Scripts

- `pnpm dev` - Start development server with hot-reload
- `pnpm build` - Build the project for production
- `pnpm start` - Start the production server
- `pnpm test:update` - Test the `/update` endpoint
- `pnpm lint` - Run ESLint to check code quality
- `pnpm lint:fix` - Auto-fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm mh-api:generate` - Regenerate MyHordes API types
- `pnpm openapi:generate` - Generate OpenAPI specification file

## API Documentation

Interactive API documentation is available at `/swagger` when the server is running.

Visit `http://localhost:3000/swagger` to explore the API endpoints, request/response schemas, and test the API directly from your browser.

You can also generate an `openapi.json` file:

```bash
pnpm openapi:generate
```

## Testing the API

1. Copy the test body example:

   ```bash
   cp scripts/update-body.json.example scripts/update-body.json
   ```

2. Edit `scripts/update-body.json` with your userkey

3. Run the test script:
   ```bash
   pnpm test:update
   ```

## Production Deployment

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.12.4 or higher)
- PostgreSQL database

### Deployment Steps

1. **Install Dependencies**

   ```bash
   pnpm install --frozen-lockfile
   ```

   Note: Dev dependencies are required for the build step.

2. **Set Environment Variables**

   Create a `.env` file or set these environment variables:

   ```bash
   NODE_ENV=production
   API_APPKEY=your_myhordes_api_key
   PORT=3000
   DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
   ```

3. **Run Database Migrations**

   ```bash
   pnpm db:sync:production
   ```

   This runs `prisma migrate deploy` (applies migrations without creating new ones).

4. **Build the Application**

   ```bash
   pnpm build
   ```

   This compiles TypeScript to JavaScript in the `build/` directory.

5. **Start the Server**

   ```bash
   pnpm start
   ```

## Project Structure

```
zen-hordes-server/
├── .github/
│   ├── workflows/        # GitHub Actions (Release Please)
│   └── copilot-instructions.md
├── .husky/               # Git hooks (commit-msg, pre-commit)
├── scripts/              # Shell scripts for development tasks
├── src/
│   ├── routes/           # API route handlers
│   ├── utils/            # Utility functions and helpers
│   └── index.ts          # Main server file
├── .vscode/              # VS Code settings (format on save)
├── .env.example          # Environment variables template
├── commitlint.config.mjs # Commit message linting config
├── eslint.config.mjs     # ESLint configuration
├── .prettierrc           # Prettier configuration
├── CONTRIBUTING.md       # Contribution guidelines
└── README.md             # This file
```

## Code Style

This project follows strict TypeScript and code style guidelines:

- ✅ Named exports only (no default exports)
- ✅ Arrow functions with `const` (no function declarations)
- ✅ Full type safety (no `any` types)
- ✅ Conventional Commits for commit messages
- ✅ Optimized for high concurrent request loads

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed guidelines.

## Contributing

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. All commits must follow this format:

```
<type>(<optional scope>): <description>
```

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## Releases

This project uses [Release Please](https://github.com/googleapis/release-please) for automated releases. When commits are merged to `main`, Release Please will:

1. Create/update a release PR
2. Generate the CHANGELOG
3. Bump version numbers
4. Create GitHub releases

## License

[MIT](LICENSE)

## Author

**Zenoo**

- GitHub: [@Zenoo](https://github.com/Zenoo)
- Repository: [zen-hordes-server](https://github.com/zenoo/zen-hordes-server)
