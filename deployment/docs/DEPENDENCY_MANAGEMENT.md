# Dependency Management Guide

Complete guide for managing dependencies, handling Dependabot updates, and maintaining security in the KDx Portal.

---

## Table of Contents

1. [Overview](#overview)
2. [Dependabot Configuration](#dependabot-configuration)
3. [Handling Dependabot PRs](#handling-dependabot-prs)
4. [Security Vulnerability Management](#security-vulnerability-management)
5. [Manual Dependency Updates](#manual-dependency-updates)
6. [Dependency Audit](#dependency-audit)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The KDx Portal uses automated dependency management to:

✅ **Keep dependencies up to date** - Weekly automated updates  
✅ **Detect security vulnerabilities** - Immediate security alerts  
✅ **Reduce maintenance burden** - Automated PR creation  
✅ **Ensure compatibility** - Grouped updates and CI testing  
✅ **Maintain security** - Rapid response to CVEs  

### Tools Used

- **Dependabot:** Automated dependency updates and security scanning
- **npm audit:** Manual vulnerability scanning
- **GitHub Security Advisories:** Vulnerability tracking
- **CI/CD Pipeline:** Automated testing of updates

---

## Dependabot Configuration

### Configuration File

Location: `.github/dependabot.yml`

### Update Schedule

| Ecosystem | Directory | Day | Time | Max PRs |
|-----------|-----------|-----|------|---------|
| npm (root) | `/` | Monday | 9:00 AM ET | 5 |
| npm (client) | `/client` | Monday | 9:00 AM ET | 3 |
| GitHub Actions | `/` | Monday | 10:00 AM ET | 3 |

**Total:** Up to 11 PRs per week

### Grouping Strategy

Dependabot groups related updates to reduce PR noise:

**Production Dependencies:**
- Minor and patch updates grouped together
- Major updates create individual PRs

**Development Dependencies:**
- Minor and patch updates grouped together
- Major updates create individual PRs

**Ecosystem Groups:**
- **React ecosystem:** `react`, `react-dom`, `@types/react*`
- **tRPC ecosystem:** `@trpc/*`, `@tanstack/react-query`
- **Radix UI:** `@radix-ui/*`
- **Build tools:** `vite`, `esbuild`, `typescript`, `tsx`
- **GitHub Actions:** All actions grouped together

### Security Updates

**Security updates bypass the weekly schedule** and create PRs immediately when vulnerabilities are detected.

---

## Handling Dependabot PRs

### Step 1: Review the PR

When Dependabot creates a PR, review:

1. **PR Title and Description**
   - What package(s) are being updated?
   - What versions (from → to)?
   - Is this a security update?

2. **Changelog**
   - Click "Release notes" link in PR description
   - Review breaking changes
   - Check for deprecations

3. **Compatibility Score**
   - Dependabot shows compatibility percentage
   - Green (>90%): Usually safe
   - Yellow (70-90%): Review carefully
   - Red (<70%): High risk of breaking changes

### Step 2: Check CI Status

Wait for CI workflow to complete:

- ✅ **Green:** Tests pass, likely safe to merge
- ❌ **Red:** Tests fail, needs investigation

**If CI fails:**
1. Click "Details" to view logs
2. Identify failing tests
3. Determine if failure is related to update
4. Fix issues or close PR if incompatible

### Step 3: Review Changes

For major updates or security fixes:

```bash
# Checkout the PR locally
gh pr checkout PR_NUMBER

# Install dependencies
pnpm install

# Run tests
pnpm run type-check
pnpm run test

# Test manually
pnpm dev
# Navigate to affected features and test

# Build to verify
cd client && pnpm build
```

### Step 4: Approve and Merge

If everything looks good:

1. **Approve the PR**
   - Click "Review changes" → "Approve"
   - Add comment if needed

2. **Merge the PR**
   - Click "Merge pull request"
   - Use "Squash and merge" for cleaner history
   - Delete branch after merge

3. **Monitor Deployment**
   - CD workflow deploys automatically
   - Check deployment logs
   - Verify production site

### Step 5: Rollback if Needed

If issues are discovered after deployment:

1. **Trigger rollback workflow**
   - GitHub → Actions → Rollback Deployment
   - Run workflow

2. **Investigate issue**
   - Review error logs
   - Identify root cause

3. **Fix or revert**
   - Create fix PR if simple
   - Or revert the dependency update

---

## Security Vulnerability Management

### Severity Levels

| Severity | Response Time | Action |
|----------|---------------|--------|
| **Critical** | Immediate | Merge ASAP, deploy immediately |
| **High** | 24 hours | Review and merge within 1 day |
| **Moderate** | 1 week | Review and merge within 7 days |
| **Low** | 1 month | Review and merge within 30 days |

### Security Update Process

1. **Alert Received**
   - GitHub sends email notification
   - Dependabot creates PR automatically
   - PR is labeled "security"

2. **Immediate Review**
   - Read vulnerability description
   - Understand impact on project
   - Check if vulnerability is exploitable

3. **Testing**
   - Wait for CI to pass
   - Test locally if critical
   - Verify fix resolves vulnerability

4. **Merge and Deploy**
   - Approve and merge PR
   - Monitor deployment
   - Verify production is secure

5. **Verify Fix**
   ```bash
   # Run security audit
   pnpm audit
   
   # Should show no vulnerabilities
   ```

### Vulnerability Triage

**Exploitable in our code:**
- Merge immediately
- Deploy ASAP
- Monitor for issues

**Not exploitable (transitive dependency):**
- Merge during normal cycle
- Document why not urgent
- Monitor for updates

**False positive:**
- Document reason
- Close PR with explanation
- Monitor for re-occurrence

---

## Manual Dependency Updates

### When to Update Manually

- Dependabot is disabled
- Need specific version
- Testing new features
- Major version upgrades

### Update Single Package

```bash
# Update to latest version
pnpm update package-name

# Update to specific version
pnpm add package-name@1.2.3

# Update dev dependency
pnpm add -D package-name@latest
```

### Update All Packages

```bash
# Update all to latest within semver range
pnpm update

# Update all to absolute latest (breaking changes possible)
pnpm update --latest

# Interactive update (choose which to update)
pnpm update --interactive
```

### Update Process

1. **Create feature branch**
   ```bash
   git checkout -b deps/manual-update
   ```

2. **Update dependencies**
   ```bash
   pnpm update --latest
   ```

3. **Test thoroughly**
   ```bash
   pnpm run type-check
   pnpm run test
   cd client && pnpm build
   pnpm dev  # Manual testing
   ```

4. **Commit and push**
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "deps: update dependencies to latest versions"
   git push origin deps/manual-update
   ```

5. **Create PR and follow normal review process**

---

## Dependency Audit

### Run Security Audit

```bash
# Check for vulnerabilities
pnpm audit

# Show detailed report
pnpm audit --json

# Check production dependencies only
pnpm audit --production
```

### Audit Output

```
found 3 vulnerabilities (1 moderate, 2 high)
```

### Fix Vulnerabilities

```bash
# Automatically fix vulnerabilities
pnpm audit fix

# Fix only production dependencies
pnpm audit fix --production

# Force fix (may introduce breaking changes)
pnpm audit fix --force
```

### Review Audit Results

**Moderate/Low severity:**
- Review during normal update cycle
- Not urgent unless exploitable

**High/Critical severity:**
- Fix immediately
- Test and deploy ASAP

### Audit Reports

Generate audit report for compliance:

```bash
# JSON format
pnpm audit --json > audit-report.json

# Human-readable format
pnpm audit > audit-report.txt
```

---

## Best Practices

### 1. Review Dependabot PRs Promptly

- Check PRs within 24-48 hours
- Don't let PRs accumulate
- Security updates take priority

### 2. Test Before Merging

- Always wait for CI to pass
- Test locally for major updates
- Verify affected features work

### 3. Merge Regularly

- Merge weekly dependency updates
- Don't skip updates
- Smaller updates are safer

### 4. Monitor After Deployment

- Check deployment logs
- Test production site
- Monitor error tracking

### 5. Keep Documentation Updated

- Document breaking changes
- Update migration guides
- Note deprecated features

### 6. Use Semantic Versioning

- Understand semver: `MAJOR.MINOR.PATCH`
- Patch: Bug fixes (safe)
- Minor: New features (usually safe)
- Major: Breaking changes (review carefully)

### 7. Pin Critical Dependencies

For critical dependencies, consider pinning exact versions:

```json
{
  "dependencies": {
    "critical-package": "1.2.3"  // Exact version
  }
}
```

### 8. Regular Dependency Cleanup

Periodically review and remove unused dependencies:

```bash
# Find unused dependencies
pnpm dlx depcheck

# Remove unused package
pnpm remove unused-package
```

---

## Troubleshooting

### Issue: Too Many Dependabot PRs

**Cause:** Multiple updates available

**Solution:**
1. Adjust `open-pull-requests-limit` in `dependabot.yml`
2. Merge existing PRs to allow new ones
3. Consider more aggressive grouping

### Issue: Dependabot PR Conflicts

**Cause:** Multiple PRs updating same dependencies

**Solution:**
1. Merge one PR
2. Dependabot will automatically rebase others
3. Wait for rebase to complete

### Issue: CI Fails on Dependabot PR

**Cause:** Breaking changes in update

**Solution:**
1. Review CI logs
2. Identify breaking change
3. Options:
   - Fix code to accommodate change
   - Close PR and wait for next version
   - Pin to previous version temporarily

### Issue: Security Alert Not Creating PR

**Cause:** Dependabot security updates not enabled

**Solution:**
1. Go to repository Settings
2. Security → Dependabot security updates
3. Enable "Dependabot security updates"

### Issue: Dependabot Not Running

**Cause:** Configuration error or GitHub issue

**Solution:**
1. Check `.github/dependabot.yml` syntax
2. View Dependabot logs:
   - Insights → Dependency graph → Dependabot
3. Manually trigger update:
   - Insights → Dependency graph → Dependabot
   - Click "Check for updates"

### Issue: Merge Conflicts in Dependabot PR

**Cause:** Manual changes to `package.json` or `pnpm-lock.yaml`

**Solution:**
1. Close Dependabot PR
2. Dependabot will recreate with latest base
3. Or manually resolve conflicts:
   ```bash
   gh pr checkout PR_NUMBER
   git merge main
   # Resolve conflicts
   git push
   ```

---

## Dependency Update Workflow

### Weekly Routine

**Monday Morning:**

1. **Review Dependabot PRs**
   - Check all new PRs
   - Prioritize security updates

2. **Merge Safe Updates**
   - Patch updates (usually safe)
   - Grouped minor updates
   - Updates with green CI

3. **Review Major Updates**
   - Read changelogs
   - Check for breaking changes
   - Test locally if needed

4. **Monitor Deployments**
   - Watch CD workflow
   - Check production logs
   - Verify site functionality

**Throughout Week:**

- Monitor for security alerts
- Respond to critical vulnerabilities within 24 hours
- Keep PR queue manageable (< 5 open PRs)

---

## Dependency Categories

### Critical Dependencies

Require careful review:
- `react`, `react-dom`
- `@trpc/server`, `@trpc/client`
- `drizzle-orm`
- `express`
- Authentication/security packages

### Build Dependencies

Usually safe to update:
- `vite`, `esbuild`
- `typescript`
- `prettier`, `eslint`
- Build tools and linters

### UI Dependencies

Test visually after updating:
- `@radix-ui/*`
- `tailwindcss`
- UI component libraries

### Development Dependencies

Low risk:
- `@types/*`
- Testing libraries
- Development tools

---

## Metrics to Track

Monitor these metrics for dependency health:

- **Update Frequency:** How often dependencies are updated
- **PR Merge Time:** Time from PR creation to merge
- **Security Response Time:** Time to fix vulnerabilities
- **Failed Updates:** Number of updates that break CI
- **Dependency Age:** How outdated dependencies are

---

## Additional Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [npm Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Semantic Versioning](https://semver.org/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

---

**Last Updated:** November 2025  
**Version:** 1.0.0
