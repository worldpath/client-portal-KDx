# GitHub Branch Protection Setup Guide

Complete guide for configuring branch protection rules on the `main` branch to enforce code quality and review processes.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Configuration](#step-by-step-configuration)
4. [Recommended Settings](#recommended-settings)
5. [Testing Branch Protection](#testing-branch-protection)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Overview

Branch protection rules enforce quality gates before code can be merged into protected branches. For the KDx Portal, we'll configure the `main` branch to require:

✅ **Pull Request Reviews** - At least one approval before merging  
✅ **Status Checks** - CI workflow must pass  
✅ **Up-to-date Branches** - Branch must be current with main  
✅ **No Direct Pushes** - All changes via pull requests  
✅ **Administrator Enforcement** - Rules apply to everyone  

---

## Prerequisites

Before configuring branch protection, ensure:

- [ ] You have **admin access** to the GitHub repository
- [ ] CI workflow (`.github/workflows/ci.yml`) is committed and working
- [ ] At least one successful CI run has completed
- [ ] Repository has at least one collaborator (for review requirements)

---

## Step-by-Step Configuration

### Step 1: Access Branch Protection Settings

1. **Navigate to your repository** on GitHub
   - URL: `https://github.com/YOUR_USERNAME/kdx-portal`

2. **Click "Settings"** tab (top navigation)
   - If you don't see this tab, you don't have admin access

3. **Click "Branches"** in left sidebar
   - Under "Code and automation" section

4. **Click "Add branch protection rule"**
   - Or click "Edit" if a rule already exists for `main`

### Step 2: Configure Branch Name Pattern

**Branch name pattern:** `main`

This targets only the main branch. You can add separate rules for other branches (e.g., `develop`) later.

### Step 3: Enable Pull Request Requirements

✅ **Check: "Require a pull request before merging"**

This prevents direct pushes to main and forces all changes through PRs.

**Sub-options:**

✅ **Check: "Require approvals"**
- **Required number of approvals before merging:** `1`
- For small teams, 1 approval is sufficient
- For larger teams, consider 2 approvals

✅ **Check: "Dismiss stale pull request approvals when new commits are pushed"**
- Forces re-review after new changes
- Prevents approval of old code

☐ **Uncheck: "Require review from Code Owners"** (optional)
- Only check if you've configured CODEOWNERS file
- See [CODEOWNERS Configuration](#codeowners-configuration) below

✅ **Check: "Require approval of the most recent reviewable push"**
- Ensures the latest code is reviewed
- Prevents last-minute changes without review

☐ **Uncheck: "Require conversation resolution before merging"** (optional)
- Check this if you want all PR comments resolved
- Recommended for teams with active code review culture

### Step 4: Enable Status Check Requirements

✅ **Check: "Require status checks to pass before merging"**

This ensures CI workflow passes before allowing merge.

**Sub-options:**

✅ **Check: "Require branches to be up to date before merging"**
- Forces rebasing/merging main before merge
- Prevents integration issues
- May slow down workflow but increases safety

**Status checks found in the last week for this repository:**

✅ **Select: "Test & Lint"** (or the name of your CI job)
- This is the job name from `.github/workflows/ci.yml`
- If you don't see it, run CI at least once first

### Step 5: Additional Protection Rules

✅ **Check: "Require signed commits"** (optional but recommended)
- Ensures commits are cryptographically signed
- Provides authenticity verification
- Requires developers to set up GPG keys

☐ **Uncheck: "Require linear history"** (optional)
- Forces rebase instead of merge commits
- Creates cleaner git history
- May complicate workflow for some teams

✅ **Check: "Include administrators"**
- **CRITICAL:** Applies rules to repository admins too
- Prevents bypassing protection rules
- Ensures consistent quality standards

✅ **Check: "Allow force pushes"** → **Specify who can force push**
- Select: "Deny to everyone"
- Prevents rewriting history on main branch

✅ **Check: "Allow deletions"** → **Deny**
- Prevents accidental branch deletion

### Step 6: Save Protection Rule

**Click "Create"** (or "Save changes" if editing)

---

## Recommended Settings Summary

Here's a quick reference table of recommended settings:

| Setting | Recommended Value | Reason |
|---------|-------------------|--------|
| **Branch name pattern** | `main` | Protect production branch |
| **Require pull request** | ✅ Enabled | Force code review |
| **Required approvals** | `1` | Minimum peer review |
| **Dismiss stale approvals** | ✅ Enabled | Re-review after changes |
| **Require status checks** | ✅ Enabled | Ensure CI passes |
| **Require up-to-date branch** | ✅ Enabled | Prevent integration issues |
| **Required status check** | `Test & Lint` | CI workflow name |
| **Require signed commits** | ⚠️ Optional | Enhanced security |
| **Require linear history** | ☐ Disabled | Allow merge commits |
| **Include administrators** | ✅ Enabled | Apply to everyone |
| **Allow force pushes** | ❌ Deny | Protect history |
| **Allow deletions** | ❌ Deny | Prevent accidents |

---

## CODEOWNERS Configuration

The `CODEOWNERS` file automatically assigns reviewers based on file paths.

**Location:** `.github/CODEOWNERS`

**Example configuration:**

```
# Default owner for everything
* @bryanra

# Deployment and infrastructure
/deployment/ @bryanra
/.github/ @bryanra

# Database schema
/drizzle/ @bryanra

# Server code
/server/ @bryanra

# Client code
/client/ @bryanra

# Documentation
*.md @bryanra
```

**To use CODEOWNERS:**

1. Create `.github/CODEOWNERS` file (see example above)
2. Commit and push to repository
3. In branch protection settings:
   - ✅ Check "Require review from Code Owners"

**Benefits:**
- Automatic reviewer assignment on PRs
- Ensures domain experts review relevant changes
- Reduces manual reviewer selection

---

## Testing Branch Protection

### Test 1: Direct Push (Should Fail)

```bash
# Try to push directly to main
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "Test direct push"
git push origin main
```

**Expected result:**
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
```

✅ **Success:** Direct push is blocked

### Test 2: Pull Request Without Approval (Should Block Merge)

```bash
# Create feature branch
git checkout -b test-branch-protection
echo "test" >> README.md
git add README.md
git commit -m "Test branch protection"
git push origin test-branch-protection
```

1. Create pull request on GitHub
2. Try to click "Merge pull request"

**Expected result:**
- Merge button is disabled or shows "Merging is blocked"
- Message: "Review required" and "1 approving review required"

✅ **Success:** Merge is blocked until approval

### Test 3: Pull Request Without Passing CI (Should Block Merge)

```bash
# Create branch with failing code
git checkout -b test-ci-failure
echo "const x: string = 123;" >> client/src/test.ts
git add .
git commit -m "Add type error"
git push origin test-ci-failure
```

1. Create pull request
2. Wait for CI to run and fail
3. Try to merge

**Expected result:**
- Merge button disabled
- Message: "Required status check 'Test & Lint' has not run or failed"

✅ **Success:** Merge is blocked until CI passes

### Test 4: Full Workflow (Should Succeed)

```bash
# Create proper feature branch
git checkout -b feature/test-protection
echo "# Test" >> docs/test.md
git add .
git commit -m "Add test documentation"
git push origin feature/test-protection
```

1. Create pull request
2. Wait for CI to pass (green checkmark)
3. Request review from team member
4. Team member approves PR
5. Click "Merge pull request"

**Expected result:**
- Merge succeeds after approval and CI pass

✅ **Success:** Protection works as intended

---

## Troubleshooting

### Issue: Can't See "Settings" Tab

**Cause:** You don't have admin access to the repository

**Solution:**
- Ask repository owner to grant you admin access
- Or ask owner to configure branch protection

### Issue: Status Check Not Appearing

**Cause:** CI workflow hasn't run yet

**Solution:**
1. Ensure `.github/workflows/ci.yml` is committed
2. Push a commit to trigger CI
3. Wait for CI to complete
4. Refresh branch protection settings page
5. Status check should now appear in dropdown

### Issue: "Require branches to be up to date" Slows Down Workflow

**Cause:** Multiple PRs require frequent rebasing

**Solution:**
- **Option 1:** Disable "Require branches to be up to date"
  - Faster workflow but slight risk of integration issues
- **Option 2:** Use merge queue (GitHub Enterprise feature)
- **Option 3:** Coordinate PR merges to reduce conflicts

### Issue: Developers Can't Push to Their Branches

**Cause:** Misunderstanding of branch protection

**Clarification:**
- Branch protection only affects `main` branch
- Developers can freely push to feature branches
- Only merging to `main` requires PR and approval

### Issue: Administrator Can't Bypass Protection

**Cause:** "Include administrators" is enabled

**Solution:**
- This is intentional for consistency
- To bypass (emergency only):
  1. Settings → Branches → Edit rule
  2. Uncheck "Include administrators"
  3. Make emergency change
  4. Re-enable "Include administrators"

---

## Best Practices

### 1. Start with Minimal Protection

For new teams, start with:
- ✅ Require pull requests
- ✅ Require 1 approval
- ✅ Require status checks
- ☐ Don't require up-to-date branches initially

Gradually add stricter rules as team matures.

### 2. Document Your Workflow

Create `CONTRIBUTING.md` explaining:
- How to create feature branches
- How to submit pull requests
- Review expectations
- Merge process

### 3. Communicate Changes

Before enabling branch protection:
- Notify all team members
- Explain the new workflow
- Provide training if needed
- Share this documentation

### 4. Use Pull Request Templates

Create `.github/pull_request_template.md` to standardize PRs:
- Checklist of requirements
- Description format
- Testing notes

### 5. Review Protection Rules Regularly

Every 3-6 months:
- Review current settings
- Adjust based on team feedback
- Add/remove rules as needed

### 6. Monitor Metrics

Track:
- Average time from PR creation to merge
- Number of failed CI checks
- Number of PRs requiring multiple review rounds

Use metrics to optimize process.

### 7. Emergency Procedures

Document how to:
- Temporarily disable protection (critical bugs)
- Hotfix process
- Who has authority to bypass rules

---

## Development Workflow with Branch Protection

### Standard Feature Development

```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes
# ... edit files ...

# 4. Test locally
pnpm run type-check
pnpm run test
cd client && pnpm build

# 5. Commit changes
git add .
git commit -m "Add new feature"

# 6. Push to GitHub
git push origin feature/new-feature

# 7. Create Pull Request on GitHub
# - Add description
# - Request reviewers
# - Link related issues

# 8. Wait for CI to pass

# 9. Address review comments if any
# ... make changes ...
git add .
git commit -m "Address review comments"
git push origin feature/new-feature

# 10. After approval and CI pass, merge via GitHub UI

# 11. Delete feature branch
git checkout main
git pull origin main
git branch -d feature/new-feature
```

### Hotfix Process

For critical production bugs:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the bug
# ... make minimal changes ...

# 3. Test thoroughly
pnpm run type-check
pnpm run test

# 4. Push and create PR
git push origin hotfix/critical-bug

# 5. Request expedited review
# - Mark PR as urgent
# - Notify reviewers directly

# 6. After approval, merge immediately

# 7. Verify deployment
# - Monitor production logs
# - Test affected functionality
```

---

## Configuration Checklist

Use this checklist when setting up branch protection:

### Initial Setup
- [ ] Navigate to Settings → Branches
- [ ] Click "Add branch protection rule"
- [ ] Set branch name pattern to `main`

### Pull Request Requirements
- [ ] Enable "Require a pull request before merging"
- [ ] Set required approvals to `1`
- [ ] Enable "Dismiss stale pull request approvals"
- [ ] Enable "Require approval of most recent push"

### Status Check Requirements
- [ ] Enable "Require status checks to pass"
- [ ] Enable "Require branches to be up to date"
- [ ] Select "Test & Lint" status check

### Additional Rules
- [ ] Enable "Include administrators"
- [ ] Set "Allow force pushes" to "Deny to everyone"
- [ ] Set "Allow deletions" to "Deny"

### Optional Enhancements
- [ ] Create `.github/CODEOWNERS` file
- [ ] Enable "Require review from Code Owners"
- [ ] Create `.github/pull_request_template.md`
- [ ] Enable "Require signed commits" (if team uses GPG)

### Testing
- [ ] Test direct push (should fail)
- [ ] Test PR without approval (should block)
- [ ] Test PR without passing CI (should block)
- [ ] Test full workflow (should succeed)

### Documentation
- [ ] Share this guide with team
- [ ] Create `CONTRIBUTING.md`
- [ ] Document emergency procedures
- [ ] Schedule regular review of rules

---

## Additional Resources

- **GitHub Docs:** [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- **GitHub Docs:** [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- **GitHub Docs:** [Status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)

---

## Support

For branch protection questions:
- Review GitHub documentation linked above
- Contact: bryanra@worldpathregulatory.com
- Check repository Settings → Branches for current configuration

---

**Last Updated:** November 2025  
**Version:** 1.0.0
