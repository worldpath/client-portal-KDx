# CI/CD Quick Reference

Fast reference for common CI/CD operations.

---

## GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `DEPLOY_SSH_KEY` | Private SSH key for droplet access |
| `DEPLOY_HOST` | Droplet IP (e.g., `159.65.123.45`) |
| `DEPLOY_USER` | SSH user (e.g., `root`) |
| `DEPLOY_PATH` | App directory (`/var/www/kdx-portal`) |

**Optional (for email notifications):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

## Workflows

### CI - Test & Lint
**Triggers:** Push/PR to `main` or `develop`  
**Duration:** ~3-5 minutes  
**Steps:** Type check → Lint → Test → Build

### CD - Deploy to Production
**Triggers:** Push to `main` (auto) or manual  
**Duration:** ~2-3 minutes  
**Steps:** Deploy → Migrate → Restart → Verify

### Rollback Deployment
**Triggers:** Manual only  
**Input:** `commit_sha` (optional)  
**Steps:** Reset → Build → Restart → Verify

---

## Common Commands

### Generate SSH Key for Deployment

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/kdx-deploy
cat ~/.ssh/kdx-deploy      # Copy private key to DEPLOY_SSH_KEY secret
cat ~/.ssh/kdx-deploy.pub  # Add public key to droplet
```

### Add Public Key to Droplet

```bash
ssh root@DROPLET_IP
echo "PASTE_PUBLIC_KEY" >> ~/.ssh/authorized_keys
```

### Manual Deployment (SSH)

```bash
ssh root@DROPLET_IP
cd /var/www/kdx-portal
git pull origin main
pnpm install
cd client && pnpm build && cd ..
pm2 restart kdx-portal
```

### Rollback to Previous Commit

```bash
ssh root@DROPLET_IP
cd /var/www/kdx-portal
git reset --hard HEAD~1
pnpm install
cd client && pnpm build && cd ..
pm2 restart kdx-portal
```

### Check Deployment Status

```bash
# View PM2 status
pm2 list

# View application logs
pm2 logs kdx-portal --lines 50

# View deployment log
tail -f /var/log/kdx-portal/deployments.log

# Test health endpoint
curl http://localhost:3000/health
curl https://worldpathregulatory.world/health
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SSH connection failed | Check `DEPLOY_SSH_KEY` and public key on droplet |
| Health check failed | Check `pm2 logs kdx-portal` for errors |
| Build failed | Run `pnpm run type-check` locally |
| Migration failed | Run `pnpm db:push` manually on droplet |
| Deployment stuck | Cancel workflow, SSH to droplet, `pm2 restart` |

---

## Workflow URLs

**View Workflows:**  
`https://github.com/YOUR_USERNAME/kdx-portal/actions`

**Trigger Manual Deployment:**  
Actions → CD - Deploy to Production → Run workflow

**Trigger Rollback:**  
Actions → Rollback Deployment → Run workflow

---

## Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Test locally
pnpm run type-check
pnpm run test
cd client && pnpm build

# 4. Commit and push
git add .
git commit -m "Add feature"
git push origin feature/my-feature

# 5. Create PR (CI runs automatically)

# 6. Merge to main (CD deploys automatically)
```

---

## Emergency Procedures

### Production is Down

1. Check GitHub Actions for failed deployment
2. SSH to droplet: `ssh root@DROPLET_IP`
3. Check PM2: `pm2 list` and `pm2 logs kdx-portal`
4. Restart if needed: `pm2 restart kdx-portal`
5. If still down, rollback via GitHub Actions

### Rollback Failed

1. SSH to droplet immediately
2. Check status: `git status` and `pm2 list`
3. Manual rollback:
   ```bash
   git reset --hard KNOWN_GOOD_COMMIT
   pnpm install
   cd client && pnpm build && cd ..
   pm2 restart kdx-portal
   ```

### Database Migration Issue

1. SSH to droplet
2. Check migration logs: `pnpm db:push`
3. If failed, restore database backup:
   ```bash
   /var/www/kdx-portal/deployment/scripts/backup-database.sh
   # Restore from /var/backups/kdx-portal/database/
   ```

---

For detailed documentation, see: `deployment/docs/CICD_SETUP.md`
