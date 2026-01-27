# Zen Hordes Server

Server for the Zen Hordes browser extension. This server acts as a backend to interact with the MyHordes API and provide data to the Zen Hordes extension.

## Features

- ✅ Type-safe API with TypeScript
- ✅ Request validation using Zod
- ✅ MyHordes API integration
- ✅ Express-based REST API
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

## Project Structure

```
zen-hordes-server/
├── .github/              # GitHub configuration (workflows, copilot instructions)
├── scripts/              # Shell scripts for development tasks
├── src/
│   ├── routes/           # API route handlers
│   ├── utils/            # Utility functions and helpers
│   └── index.ts          # Main server file
├── .env.example          # Environment variables template
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
