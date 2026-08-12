# Contributing to Nodsend

Thanks for your interest in contributing to Nodsend! Every contribution helps make human approval infrastructure better for everyone building AI agents.

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL (or use the included `docker-compose.yml`)
- Python 3.10+ (for SDK work only)

### Setup

```bash
# Clone the repo
git clone https://github.com/Foreveryoung2149/Nodsend.git
cd Nodsend

# Install dependencies
npm ci

# Copy environment config
cp .env.example .env

# Start PostgreSQL (via Docker or your own instance)
docker compose up db -d

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Start everything
npm run dev:all
```

- **Web app:** http://localhost:3000
- **API server:** http://localhost:3002
- **Health check:** http://localhost:3002/health

## How to Contribute

### Reporting Bugs

Open an issue using the **Bug Report** template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)

### Suggesting Features

Open an issue using the **Feature Request** template. Describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feat/your-feature`
3. **Make your changes** — follow the existing code style
4. **Test your changes:**
   ```bash
   npm run typecheck
   npm run test:api
   npm run build
   ```
5. **Commit** with a clear message: `feat: add Slack delivery channel`
6. **Push** and open a **Pull Request**

### Commit Message Convention

We use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Formatting, no code change
- `refactor:` — Code restructuring
- `test:` — Adding or updating tests
- `chore:` — Build, tooling, or dependency changes

### Python SDK

The SDK lives in `sdks/python/`. To work on it:

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e "sdks/python[dev]"
pytest sdks/python/tests
```

## Code Style

- **TypeScript/JavaScript:** Follow existing patterns, use `const` over `let`
- **Python:** Follow PEP 8, use type hints
- **CSS:** Use CSS custom properties defined in `globals.css`

## Security

If you find a security vulnerability, **do not open a public issue**. Email [hello@nodsend.com](mailto:hello@nodsend.com) with details and we'll respond within 48 hours.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
