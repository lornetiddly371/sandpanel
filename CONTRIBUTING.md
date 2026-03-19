# Contributing to SandPanel

Thanks for your interest in improving SandPanel!

## Getting Started

1. Fork the repo and clone your fork
2. Copy `.env.example` to `.env` and adjust for your setup
3. Run `docker compose up --build`
4. Make your changes and test locally

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning. Prefix your commit messages:

- `feat:` — new feature (bumps minor version)
- `fix:` — bug fix (bumps patch version)
- `feat!:` or `BREAKING CHANGE` in body — breaking change (bumps major version)
- `docs:`, `chore:`, `refactor:`, `test:`, `ci:` — other (bumps patch)

Examples:
```
feat: add map rotation editor
fix: RCON connection timeout on slow networks
feat!: restructure profile config format
docs: update mod.io auth instructions
```

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a description of what changed and why
- Test with `docker compose up --build` before submitting
- Screenshots for UI changes are appreciated

## Reporting Bugs

Use the [bug report template](https://github.com/jocxfin/sandpanel/issues/new?template=bug_report.yml). Include:
- Steps to reproduce
- Backend logs (`docker logs sandpanel-backend`)
- Your environment (OS, Docker version, browser)

## License

By contributing, you agree that your work will be licensed under the project's [MIT License](LICENSE) with the attribution clause intact.
