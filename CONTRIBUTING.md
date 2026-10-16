# Contributing to AegisGateway

Thank you for your interest in contributing to **AegisGateway**! AegisGateway is built to staff-level engineering standards.

## Code of Conduct
We expect all contributors to maintain respectful and constructive communication.

## Development Workflow
1. Fork the repository and clone your fork.
2. Create a dedicated feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests and type checking:
   ```bash
   npm run test
   npm run typecheck
   npm run lint
   ```
5. Follow **Conventional Commits**:
   - `feat(router): add latency-weighted provider scoring`
   - `fix(circuit): prevent premature half-open probe trip`
   - `docs(adr): update ADR 002 with rolling window bounds`
6. Submit a Pull Request targeting `main`.
