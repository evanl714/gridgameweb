# Grid Game Web

This is a Claude Code project for a grid-based game web application.

## Project Setup

This project was initialized with Claude Code.

## Development

## Key Files & Architecture

- Document your main game files and their purposes here
- Add architectural decisions as you make them

## Git Workflow

### Branch Structure

- **main**: Production-ready stable code
- **development**: Integration branch for new features
- **feature/**: Feature branches created from development

### Workflow Process

1. Create feature branches from `development`: `git checkout -b feature/feature-name development`
2. Work on features in isolation
3. Merge feature branches back to `development` via pull request
4. Merge `development` to `main` when ready for release
5. Tag releases on `main` branch

### Versioning

- Use the github MCP
- After each task is completed
  - Create a new commit
  - Tag it with the task number and name
  - Push the commit and tag
  - Use semantic versioning (MAJOR.MINOR.PATCH)