# CI/CD Pipeline Setup Guide

Complete guide for setting up automated testing and deployment with GitHub Actions for the KDx Portal.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Workflow Descriptions](#workflow-descriptions)
5. [Initial Setup](#initial-setup)
6. [Usage Guide](#usage-guide)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The CI/CD pipeline automates the following processes:

**Continuous Integration (CI):**
- TypeScript type checking
- Code linting
- Automated testing
- Client application build
- Build artifact validation

**Continuous Deployment (CD):**
- Automated deployment to DigitalOcean on push to `main`
- Database migrations
- PM2 application restart
- Health check verification
- Email notifications

**Rollback:**
- Manual rollback to previous commit
- Rollback to specific commit SHA
- Automated health verification

---

## Prerequisites

Before setting up CI/CD, ensure you have:

- [ ] GitHub repository with your code
- [ ] DigitalOcean droplet deployed and running
- [ ] SSH access to droplet configured
- [ ] Application already deployed manually at least once
- [ ] PM2 process named `kdx-portal` running
- [ ] Git repository initialized on droplet at `/var/www/kdx-portal`

---

## GitHub Secrets Configuration

GitHub Secrets store sensitive credentials securely. Configure these in your repository:

### Step 1: Access GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Add Required Secrets

Add the following secrets one by one:

#### DEPLOY_SSH_KEY

**Description:** Private SSH key for accessing your droplet

**How to generate:**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/kdx-deploy

# Copy the PRIVATE key content
cat ~/.ssh/kdx-deploy
```

**Value:** Paste the entire private key including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

**Then add public key to droplet:**

```bash
# Copy public key
cat ~/.ssh/kdx-deploy.pub

# SSH to droplet and add to authorized_keys
ssh root@YOUR_DROPLET_IP
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

#### DEPLOY_HOST

**Description:** IP address or hostname of your DigitalOcean droplet

**Value:** `YOUR_DROPLET_IP` (e.g., `159.65.123.45`)

#### DEPLOY_USER

**Description:** SSH user for deployment

**Value:** `root` (or your deployment user)

#### DEPLOY_PATH

**Description:** Application directory on droplet

**Value:** `/var/www/kdx-portal`

#### SMTP_HOST (Optional - for email notifications)

**Description:** SMTP server for sending deployment notifications

**Value:** `smtp.sendgrid.net` (or your SMTP provider)

#### SMTP_PORT (Optional)

**Description:** SMTP server port

**Value:** `587`

#### SMTP_USER (Optional)

**Description:** SMTP username

**Value:** Your SMTP username (e.g., `apikey` for SendGrid)

#### SMTP_PASS (Optional)

**Description:** SMTP password or API key

**Value:** Your SMTP password or API key

### Secrets Summary Table

| Secret Name | Required | Example Value | Description |
|-------------|----------|---------------|-------------|
| `DEPLOY_SSH_KEY` | ✅ Yes | `-----BEGIN OPENSSH...` | Private SSH key |
| `DEPLOY_HOST` | ✅ Yes | `159.65.123.45` | Droplet IP address |
| `DEPLOY_USER` | ✅ Yes | `root` | SSH username |
| `DEPLOY_PATH` | ✅ Yes | `/var/www/kdx-portal` | App directory |
| `SMTP_HOST` | ⚠️ Optional | `smtp.sendgrid.net` | Email server |
| `SMTP_PORT` | ⚠️ Optional | `587` | Email port |
| `SMTP_USER` | ⚠️ Optional | `apikey` | Email username |
| `SMTP_PASS` | ⚠️ Optional | `SG.xxx...` | Email password |

---

## Workflow Descriptions

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Steps:**
1. Checkout code
2. Setup Node.js 22.x and pnpm
3. Install dependencies (with caching)
4. Run TypeScript type check
5. Run linting
6. Run tests
7. Build client application
8. Upload build artifacts

**Duration:** ~3-5 minutes

### 2. CD Workflow (`.github/workflows/cd.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub Actions UI

**Steps:**
1. Checkout code
2. Setup SSH connection to droplet
3. Pull latest changes on droplet
4. Install dependencies
5. Build client application
6. Run database migrations
7. Restart PM2 application
8. Verify health endpoint
9. Send deployment notification email

**Duration:** ~2-3 minutes

**Environment:** `production` (can add approval requirements)

### 3. Rollback Workflow (`.github/workflows/rollback.yml`)

**Triggers:**
- Manual trigger only (workflow_dispatch)

**Inputs:**
- `commit_sha`: Optional commit SHA to rollback to (defaults to previous commit)

**Steps:**
1. Setup SSH connection
2. Reset git repository to target commit
3. Install dependencies
4. Build client application
5. Restart PM2 application
6. Verify health endpoint
7. Send rollback notification email

**Duration:** ~2-3 minutes

---

## Initial Setup

### Step 1: Prepare Droplet for CI/CD

Ensure your droplet is configured for automated deployments:

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Verify git repository is initialized
cd /var/www/kdx-portal
git status

# If not initialized, set up git
git init
git remote add origin YOUR_GITHUB_REPO_URL
git fetch origin
git checkout main

# Ensure PM2 is running
pm2 list
pm2 save

# Test manual deployment script
./deployment/scripts/deploy-production.sh
```

### Step 2: Configure GitHub Secrets

Follow the [GitHub Secrets Configuration](#github-secrets-configuration) section above.

### Step 3: Push Workflows to Repository

```bash
# On your local machine
cd /path/to/kdx-portal

# Ensure workflows are committed
git add .github/workflows/
git commit -m "Add CI/CD workflows"
git push origin main
```

### Step 4: Verify CI Workflow

1. Go to GitHub → **Actions** tab
2. You should see "CI - Test & Lint" workflow running
3. Wait for it to complete (green checkmark)

### Step 5: Test CD Workflow

The CD workflow will run automatically after CI passes on push to `main`.

**To manually trigger:**
1. GitHub → **Actions** → **CD - Deploy to Production**
2. Click **Run workflow** → **Run workflow**
3. Monitor deployment progress

### Step 6: Verify Deployment

```bash
# Check production site
curl https://worldpathregulatory.world/health

# SSH to droplet and check logs
ssh root@YOUR_DROPLET_IP
pm2 logs kdx-portal --lines 50
```

---

## Usage Guide

### Normal Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"

# 3. Push to GitHub
git push origin feature/new-feature

# 4. Create Pull Request
# CI workflow runs automatically on PR

# 5. After PR approval, merge to main
# CD workflow deploys automatically
```

### Manual Deployment

If you need to deploy without pushing code:

1. GitHub → **Actions** → **CD - Deploy to Production**
2. Click **Run workflow**
3. Select branch: `main`
4. Click **Run workflow**

### Viewing Deployment Logs

**In GitHub:**
1. Go to **Actions** tab
2. Click on the workflow run
3. Click on the job (e.g., "Deploy to DigitalOcean")
4. Expand steps to view logs

**On Droplet:**
```bash
# Application logs
pm2 logs kdx-portal

# Deployment logs
tail -f /var/log/kdx-portal/deployments.log

# PM2 logs
tail -f /var/log/kdx-portal/pm2-out.log
tail -f /var/log/kdx-portal/pm2-error.log
```

### Email Notifications

If SMTP secrets are configured, you'll receive emails for:
- ✅ Successful deployments
- ❌ Failed deployments
- 🔄 Rollbacks

Email includes:
- Deployment status
- Repository and branch
- Commit SHA and author
- Link to workflow run

---

## Rollback Procedures

### Rollback to Previous Commit

**Via GitHub Actions:**

1. GitHub → **Actions** → **Rollback Deployment**
2. Click **Run workflow**
3. Leave `commit_sha` empty (defaults to previous commit)
4. Click **Run workflow**

**Via SSH (Emergency):**

```bash
ssh root@YOUR_DROPLET_IP
cd /var/www/kdx-portal

# View recent commits
git log --oneline -10

# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild and restart
pnpm install
cd client && pnpm build && cd ..
pm2 restart kdx-portal

# Verify
curl http://localhost:3000/health
```

### Rollback to Specific Commit

**Via GitHub Actions:**

1. Find the commit SHA you want to rollback to:
   - GitHub → **Code** → **Commits**
   - Copy the commit SHA (e.g., `a1b2c3d4`)

2. Trigger rollback:
   - **Actions** → **Rollback Deployment**
   - **Run workflow**
   - Enter commit SHA: `a1b2c3d4`
   - **Run workflow**

**Via SSH:**

```bash
ssh root@YOUR_DROPLET_IP
cd /var/www/kdx-portal

# Rollback to specific commit
git reset --hard a1b2c3d4

# Rebuild and restart
pnpm install
cd client && pnpm build && cd ..
pm2 restart kdx-portal
```

### Verify Rollback

```bash
# Check current commit
git log -1 --oneline

# Test health endpoint
curl https://worldpathregulatory.world/health

# Check PM2 status
pm2 list
```

---

## Troubleshooting

### CI Workflow Fails

**Issue: "Type check failed"**

```bash
# Run locally to see errors
pnpm run type-check

# Fix TypeScript errors and commit
git add .
git commit -m "Fix type errors"
git push
```

**Issue: "Build failed"**

```bash
# Test build locally
cd client
pnpm build

# Check for errors and fix
# Commit and push
```

### CD Workflow Fails

**Issue: "SSH connection failed"**

- Verify `DEPLOY_SSH_KEY` secret is correct
- Ensure public key is in droplet's `~/.ssh/authorized_keys`
- Check `DEPLOY_HOST` secret matches droplet IP

**Issue: "Health check failed"**

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Check PM2 status
pm2 list
pm2 logs kdx-portal --lines 100

# Check if port 3000 is listening
netstat -tlnp | grep 3000

# Restart manually
pm2 restart kdx-portal
```

**Issue: "Database migration failed"**

```bash
# SSH to droplet
cd /var/www/kdx-portal

# Run migrations manually
pnpm db:push

# Check database connection
mysql -h DB_HOST -u USER -p
```

### Deployment Stuck

**If deployment hangs:**

1. Cancel the GitHub Actions workflow
2. SSH to droplet and check status:
   ```bash
   pm2 list
   pm2 logs kdx-portal
   ```
3. Manually restart:
   ```bash
   pm2 restart kdx-portal
   ```

### Rollback Fails

**If rollback fails:**

1. SSH to droplet immediately
2. Check current state:
   ```bash
   cd /var/www/kdx-portal
   git status
   git log -1
   ```
3. Manual rollback:
   ```bash
   git reset --hard KNOWN_GOOD_COMMIT
   pnpm install
   cd client && pnpm build && cd ..
   pm2 restart kdx-portal
   ```

---

## Best Practices

### 1. Always Use Feature Branches

```bash
# Don't commit directly to main
git checkout -b feature/my-feature

# Make changes, test locally
pnpm run type-check
pnpm run test
cd client && pnpm build

# Push and create PR
git push origin feature/my-feature
```

### 2. Review CI Results Before Merging

- Wait for CI to pass (green checkmark)
- Review build artifacts
- Test locally if CI fails

### 3. Monitor Deployments

- Watch the deployment workflow in real-time
- Check email notifications
- Verify production site after deployment

### 4. Keep Deployment Logs

Deployment logs are stored in:
- `/var/log/kdx-portal/deployments.log`
- GitHub Actions workflow history (90 days)

### 5. Test Rollback Procedure

Periodically test rollback to ensure it works:
```bash
# Deploy current version
# Trigger rollback to previous commit
# Verify application works
# Deploy current version again
```

---

## Security Considerations

1. **Protect Secrets:**
   - Never commit secrets to repository
   - Rotate SSH keys periodically
   - Use environment-specific secrets

2. **Limit SSH Access:**
   - Use dedicated deployment SSH key
   - Consider using a deployment user (not root)
   - Restrict SSH key to specific IP (GitHub Actions IPs)

3. **Enable Branch Protection:**
   - GitHub → Settings → Branches
   - Add rule for `main` branch:
     * Require pull request reviews
     * Require status checks (CI) to pass
     * Require branches to be up to date

4. **Use Deployment Environments:**
   - GitHub → Settings → Environments
   - Create `production` environment
   - Add required reviewers for manual approval

---

## Advanced Configuration

### Add Staging Environment

Create `.github/workflows/cd-staging.yml`:

```yaml
name: CD - Deploy to Staging

on:
  push:
    branches: [ develop ]

jobs:
  deploy:
    # Similar to production CD workflow
    # Use different secrets: STAGING_DEPLOY_HOST, etc.
```

### Add Slack Notifications

Replace email notification step with:

```yaml
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Deployment ${{ job.status }}: KDx Portal"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Add Automated Tests

Create test files and update CI workflow:

```yaml
- name: Run unit tests
  run: pnpm run test:unit

- name: Run integration tests
  run: pnpm run test:integration
```

---

## Support

For CI/CD issues:
- Check GitHub Actions logs
- Review deployment logs on droplet
- Email: bryanra@worldpathregulatory.com

---

**Last Updated:** November 2025  
**Version:** 1.0.0
