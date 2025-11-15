# Contributing to KDx Portal

Thank you for contributing to the KDx Diagnostics Secure Client Portal! This document provides guidelines for contributing to the project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Pull Request Process](#pull-request-process)
5. [Testing Guidelines](#testing-guidelines)
6. [Commit Message Guidelines](#commit-message-guidelines)

---

## Getting Started

### Prerequisites

- Node.js 22.x
- pnpm 8.x or higher
- Git
- Access to the repository

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/kdx-portal.git
cd kdx-portal

# Install dependencies
pnpm install

# Set up environment variables
cp deployment/config/.env.production.template .env

# Start development server
pnpm dev
```

---

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work. Never commit directly to `main`.

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**
- `feature/` - New features (e.g., `feature/template-preview`)
- `fix/` - Bug fixes (e.g., `fix/upload-validation`)
- `docs/` - Documentation updates (e.g., `docs/api-guide`)
- `refactor/` - Code refactoring (e.g., `refactor/thumbnail-service`)
- `test/` - Test additions (e.g., `test/template-api`)
- `hotfix/` - Critical production fixes (e.g., `hotfix/security-patch`)

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style and patterns
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run type checking
pnpm run type-check

# Run linting
pnpm run lint

# Run tests
pnpm run test

# Build client to verify
cd client && pnpm build
```

### 4. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add template preview feature"
```

See [Commit Message Guidelines](#commit-message-guidelines) below.

### 5. Push to GitHub

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to the repository on GitHub
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Fill out the PR template completely
5. Request review from code owners
6. Wait for CI checks to pass

### 7. Address Review Comments

```bash
# Make requested changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Address review comments"
git push origin feature/your-feature-name
```

### 8. Merge

Once approved and CI passes:
1. Ensure branch is up to date with main
2. Click "Merge pull request" on GitHub
3. Delete the feature branch

---

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper typing
- Export types from shared locations
- Use interfaces for object shapes

**Good:**
```typescript
interface Template {
  id: number;
  name: string;
  category: string;
}

function getTemplate(id: number): Template | null {
  // ...
}
```

**Bad:**
```typescript
function getTemplate(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop typing

**Good:**
```tsx
interface TemplateCardProps {
  template: Template;
  onDownload: (id: number) => void;
}

export function TemplateCard({ template, onDownload }: TemplateCardProps) {
  return (
    <Card>
      <h3>{template.name}</h3>
      <Button onClick={() => onDownload(template.id)}>Download</Button>
    </Card>
  );
}
```

### tRPC Procedures

- Use `protectedProcedure` for authenticated endpoints
- Use `publicProcedure` for public endpoints
- Validate inputs with Zod schemas
- Return typed responses

**Example:**
```typescript
getTemplates: protectedProcedure
  .input(z.object({
    category: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    return await db.getTemplates(ctx.user.id, input.category);
  }),
```

### Styling

- Use Tailwind CSS utility classes
- Follow existing design patterns
- Use shadcn/ui components where possible
- Keep responsive design in mind

### File Organization

```
client/src/
  pages/          - Page components
  components/     - Reusable UI components
  hooks/          - Custom React hooks
  lib/            - Utility functions
  contexts/       - React contexts

server/
  routers.ts      - tRPC API routes
  db.ts           - Database queries
  *.ts            - Feature-specific modules
```

---

## Pull Request Process

### Before Creating PR

- [ ] All tests pass locally
- [ ] Code is properly formatted
- [ ] No TypeScript errors
- [ ] Documentation is updated
- [ ] Commits are clean and descriptive

### PR Requirements

1. **Fill out the PR template completely**
   - Description of changes
   - Type of change
   - Testing performed
   - Checklist items

2. **Ensure CI passes**
   - Type checking
   - Linting
   - Tests
   - Build

3. **Get approval**
   - At least 1 approval required
   - Address all review comments
   - Resolve conversations

4. **Keep branch up to date**
   - Merge or rebase with main if needed
   - Resolve any conflicts

### PR Size Guidelines

- **Small PR:** < 200 lines changed (preferred)
- **Medium PR:** 200-500 lines changed
- **Large PR:** > 500 lines changed (split if possible)

Large PRs are harder to review. Consider splitting into multiple smaller PRs.

---

## Testing Guidelines

### Unit Tests

Write unit tests for:
- Utility functions
- Custom hooks
- Complex business logic

```typescript
import { describe, it, expect } from 'vitest';

describe('calculateFileSize', () => {
  it('should format bytes correctly', () => {
    expect(calculateFileSize(1024)).toBe('1 KB');
    expect(calculateFileSize(1048576)).toBe('1 MB');
  });
});
```

### Integration Tests

Write integration tests for:
- tRPC procedures
- Database operations
- API endpoints

### Manual Testing

Always manually test:
- UI changes in browser
- Different screen sizes (mobile, tablet, desktop)
- Error scenarios
- Edge cases

---

## Commit Message Guidelines

### Format

```
<type>: <subject>

<body>

<footer>
```

### Type

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

### Subject

- Use imperative mood ("Add feature" not "Added feature")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

### Examples

**Good:**
```
feat: add template preview thumbnails

Implemented thumbnail generation for PDF templates using pdf2pic.
Thumbnails are generated in three sizes (small, medium, large) and
stored in S3 with cache headers.

Closes #123
```

**Bad:**
```
Updated files
```

---

## Database Changes

### Schema Modifications

1. Edit `drizzle/schema.ts`
2. Run `pnpm db:push` to generate migration
3. Test migration locally
4. Document breaking changes in PR

### Migration Guidelines

- Ensure migrations are reversible when possible
- Test migrations on a copy of production data
- Document any manual steps required
- Consider backward compatibility

---

## Security Guidelines

### Never Commit

- API keys or secrets
- Passwords or tokens
- Environment variables with sensitive data
- Private keys

### Always

- Validate user input
- Use parameterized queries
- Implement proper authentication/authorization
- Sanitize data before display

---

## Getting Help

- **Documentation:** Check `deployment/docs/` folder
- **Questions:** Open a GitHub Discussion
- **Bugs:** Open a GitHub Issue
- **Contact:** bryanra@worldpathregulatory.com

---

## Code Review Guidelines

### For Authors

- Respond to all comments
- Don't take feedback personally
- Ask questions if unclear
- Thank reviewers for their time

### For Reviewers

- Be constructive and kind
- Explain the "why" behind suggestions
- Approve when ready, request changes if needed
- Review within 24-48 hours when possible

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to KDx Portal!**
