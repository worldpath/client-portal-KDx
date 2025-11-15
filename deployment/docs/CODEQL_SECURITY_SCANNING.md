# CodeQL Security Scanning Guide

Complete guide for using GitHub Advanced Security with CodeQL to detect and fix security vulnerabilities in the KDx Portal.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Understanding CodeQL Results](#understanding-codeql-results)
4. [Vulnerability Remediation](#vulnerability-remediation)
5. [Common Vulnerabilities](#common-vulnerabilities)
6. [False Positives](#false-positives)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is CodeQL?

CodeQL is GitHub's semantic code analysis engine that treats code as data, allowing you to query it for security vulnerabilities and coding errors.

### What Does CodeQL Detect?

✅ **Injection Attacks:** SQL injection, command injection, code injection  
✅ **Cross-Site Scripting (XSS):** Reflected, stored, and DOM-based XSS  
✅ **Authentication Issues:** Bypass, broken auth, weak sessions  
✅ **Authorization Issues:** Missing checks, privilege escalation  
✅ **Data Exposure:** Sensitive data leaks, cleartext storage  
✅ **Path Traversal:** Directory traversal, arbitrary file access  
✅ **Cryptography Issues:** Weak algorithms, hardcoded credentials  
✅ **SSRF:** Server-side request forgery  
✅ **Deserialization:** Insecure deserialization  
✅ **ReDoS:** Regular expression denial of service  
✅ **Prototype Pollution:** Object injection vulnerabilities  
✅ **XXE:** XML external entity injection  
✅ **CSRF:** Cross-site request forgery  

### Scan Schedule

| Trigger | Frequency | Purpose |
|---------|-----------|---------|
| **Push to main/develop** | Every push | Catch issues before deployment |
| **Pull requests** | Every PR | Review security before merge |
| **Scheduled** | Weekly (Mondays 6 AM UTC) | Periodic full scan |
| **Manual** | On-demand | Ad-hoc security review |

---

## Setup Instructions

### Step 1: Enable GitHub Advanced Security

**For Private Repositories:**

1. Go to repository **Settings**
2. Navigate to **Security & analysis**
3. Click **Enable** for "GitHub Advanced Security"
4. Click **Enable** for "Code scanning"

**For Public Repositories:**

GitHub Advanced Security is enabled by default.

### Step 2: Verify Workflow

The CodeQL workflow is already configured in `.github/workflows/codeql-analysis.yml`.

Verify it's active:

1. Go to **Actions** tab
2. Look for "CodeQL Security Analysis" workflow
3. Should show green checkmark if enabled

### Step 3: Run Initial Scan

Trigger the first scan:

**Option A: Push to main**
```bash
git push origin main
```

**Option B: Manual trigger**
1. Go to **Actions** tab
2. Select "CodeQL Security Analysis"
3. Click **Run workflow**
4. Select branch and run

### Step 4: Review Results

After scan completes (5-15 minutes):

1. Go to **Security** tab
2. Click **Code scanning**
3. Review any alerts

---

## Understanding CodeQL Results

### Alert Severity

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| **Critical** | Exploitable vulnerability | Fix immediately |
| **High** | Serious security issue | Fix within 7 days |
| **Medium** | Moderate risk | Fix within 30 days |
| **Low** | Minor issue | Fix when convenient |
| **Note** | Informational | Review and consider |

### Alert Components

Each alert includes:

1. **Title:** Brief description of the issue
2. **Severity:** Risk level (Critical/High/Medium/Low)
3. **CWE:** Common Weakness Enumeration ID
4. **Location:** File, line number, and code snippet
5. **Data Flow:** How untrusted data reaches vulnerable sink
6. **Recommendation:** How to fix the issue
7. **References:** Links to documentation

### Example Alert

```
SQL Injection
Severity: High
CWE-89: Improper Neutralization of Special Elements used in an SQL Command

Location: server/db.ts:45

Untrusted user input flows to SQL query without sanitization.

Data Flow:
1. User input: req.body.search
2. Flows to: db.query()
3. Used in: SQL query construction

Recommendation:
Use parameterized queries or an ORM to prevent SQL injection.
```

---

## Vulnerability Remediation

### General Remediation Process

1. **Understand the Alert**
   - Read the description
   - Review the data flow
   - Understand the exploit scenario

2. **Verify the Issue**
   - Check if it's a true positive
   - Assess actual exploitability
   - Consider the context

3. **Fix the Vulnerability**
   - Follow the recommendation
   - Test the fix locally
   - Verify the fix works

4. **Create Pull Request**
   - Branch: `security/fix-cwe-xxx`
   - Include alert reference
   - Document the fix

5. **Verify Fix**
   - CodeQL should clear the alert
   - Manual security testing
   - Code review

### Remediation Timeline

| Severity | Timeline | Escalation |
|----------|----------|------------|
| Critical | 24 hours | Immediate notification |
| High | 7 days | Email reminder at day 5 |
| Medium | 30 days | Email reminder at day 21 |
| Low | 90 days | Quarterly review |

---

## Common Vulnerabilities

### 1. SQL Injection

**Problem:**
```typescript
// ❌ Vulnerable
const userId = req.body.userId;
const query = `SELECT * FROM users WHERE id = ${userId}`;
await db.query(query);
```

**Solution:**
```typescript
// ✅ Safe - Using Drizzle ORM
import { eq } from 'drizzle-orm';
import { users } from '../drizzle/schema';

const userId = req.body.userId;
const result = await db.select().from(users).where(eq(users.id, userId));
```

**Why It Works:**
- Drizzle ORM uses parameterized queries
- User input is properly escaped
- SQL injection is prevented

### 2. Cross-Site Scripting (XSS)

**Problem:**
```tsx
// ❌ Vulnerable
function UserProfile({ bio }: { bio: string }) {
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
}
```

**Solution:**
```tsx
// ✅ Safe - React escapes by default
function UserProfile({ bio }: { bio: string }) {
  return <div>{bio}</div>;
}

// ✅ Safe - Using markdown library with sanitization
import { Streamdown } from 'streamdown';

function UserProfile({ bio }: { bio: string }) {
  return <Streamdown>{bio}</Streamdown>;
}
```

**Why It Works:**
- React automatically escapes HTML
- Markdown library sanitizes input
- XSS attacks are prevented

### 3. Path Traversal

**Problem:**
```typescript
// ❌ Vulnerable
const filename = req.query.file;
const filePath = path.join('/uploads', filename);
res.sendFile(filePath);
```

**Solution:**
```typescript
// ✅ Safe - Validate and sanitize
import path from 'path';

const filename = req.query.file;
const safeFilename = path.basename(filename); // Remove directory traversal
const uploadsDir = path.resolve('/uploads');
const filePath = path.join(uploadsDir, safeFilename);

// Verify file is within uploads directory
if (!filePath.startsWith(uploadsDir)) {
  throw new Error('Invalid file path');
}

res.sendFile(filePath);
```

**Why It Works:**
- `path.basename()` removes directory components
- Path validation ensures file is in allowed directory
- Directory traversal is prevented

### 4. Authentication Bypass

**Problem:**
```typescript
// ❌ Vulnerable
app.get('/admin', (req, res) => {
  // Missing authentication check
  res.send('Admin panel');
});
```

**Solution:**
```typescript
// ✅ Safe - Using protectedProcedure
import { protectedProcedure } from './_core/trpc';

const adminRouter = router({
  getAdminData: protectedProcedure.query(({ ctx }) => {
    // ctx.user is guaranteed to exist
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return getAdminData();
  }),
});
```

**Why It Works:**
- `protectedProcedure` enforces authentication
- Role check prevents unauthorized access
- Authentication bypass is prevented

### 5. Hardcoded Credentials

**Problem:**
```typescript
// ❌ Vulnerable
const API_KEY = 'sk_live_abc123xyz';
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});
```

**Solution:**
```typescript
// ✅ Safe - Using environment variables
import { ENV } from './_core/env';

const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${ENV.apiKey}` }
});
```

**Why It Works:**
- Credentials stored in environment variables
- Not committed to version control
- Secure credential management

### 6. Weak Cryptography

**Problem:**
```typescript
// ❌ Vulnerable
import crypto from 'crypto';
const hash = crypto.createHash('md5').update(password).digest('hex');
```

**Solution:**
```typescript
// ✅ Safe - Using bcrypt
import bcrypt from 'bcrypt';

const saltRounds = 10;
const hash = await bcrypt.hash(password, saltRounds);

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

**Why It Works:**
- bcrypt is designed for password hashing
- Includes salt automatically
- Resistant to brute force attacks

### 7. Server-Side Request Forgery (SSRF)

**Problem:**
```typescript
// ❌ Vulnerable
const url = req.body.url;
const response = await fetch(url);
```

**Solution:**
```typescript
// ✅ Safe - Validate URL
function isAllowedUrl(url: string): boolean {
  const allowedDomains = ['api.example.com', 'cdn.example.com'];
  const parsed = new URL(url);
  
  // Check protocol
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false;
  }
  
  // Check domain
  if (!allowedDomains.includes(parsed.hostname)) {
    return false;
  }
  
  // Prevent private IPs
  if (parsed.hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
    return false;
  }
  
  return true;
}

const url = req.body.url;
if (!isAllowedUrl(url)) {
  throw new Error('Invalid URL');
}
const response = await fetch(url);
```

**Why It Works:**
- URL validation prevents malicious requests
- Whitelist approach for allowed domains
- Private IP blocking prevents internal network access

---

## False Positives

### Identifying False Positives

A false positive occurs when CodeQL flags code as vulnerable when it's actually safe.

**Common Scenarios:**

1. **Input is already validated**
   - CodeQL may not recognize custom validation
   - Data flow analysis misses validation step

2. **Context makes it safe**
   - Admin-only endpoints
   - Internal APIs with trusted input

3. **Framework protection**
   - Framework handles sanitization
   - CodeQL doesn't recognize framework pattern

### Handling False Positives

**Option 1: Dismiss in GitHub UI**

1. Go to **Security** → **Code scanning**
2. Click on the alert
3. Click **Dismiss alert**
4. Select reason:
   - Won't fix
   - False positive
   - Used in tests
5. Add comment explaining why

**Option 2: Suppress with Comment**

```typescript
// codeql[javascript/sql-injection]
const query = buildSafeQuery(input); // Input is validated by buildSafeQuery
```

**Option 3: Configure in codeql-config.yml**

```yaml
query-filters:
  - exclude:
      id: js/specific-query-id
```

### Best Practices for False Positives

- **Document why it's safe** in code comments
- **Keep suppression minimal** - only suppress when necessary
- **Review periodically** - false positives may become real issues
- **Prefer code changes** over suppressions when possible

---

## Best Practices

### 1. Review Alerts Promptly

- Check Security tab weekly
- Address critical/high alerts immediately
- Don't let alerts accumulate

### 2. Fix Root Causes

- Don't just fix the specific instance
- Look for similar patterns in codebase
- Update coding standards

### 3. Test Fixes Thoroughly

- Verify fix resolves the issue
- Ensure no functionality breaks
- Test edge cases

### 4. Learn from Alerts

- Understand why the code was vulnerable
- Share knowledge with team
- Update development practices

### 5. Integrate into Development

- Run CodeQL locally (optional)
- Review alerts before merging PRs
- Include security in code reviews

### 6. Keep Queries Updated

- CodeQL queries are updated regularly
- New vulnerability patterns added
- Existing queries improved

### 7. Monitor Trends

- Track alert count over time
- Identify common vulnerability types
- Focus training on problem areas

---

## Troubleshooting

### Issue: CodeQL Workflow Fails

**Symptoms:**
- Workflow shows red X
- Error in Actions log

**Solutions:**

1. **Check workflow syntax**
   ```bash
   # Validate YAML
   yamllint .github/workflows/codeql-analysis.yml
   ```

2. **Review error logs**
   - Go to Actions → Failed workflow
   - Click on failed step
   - Read error message

3. **Common errors:**
   - Missing dependencies
   - Build failures
   - Timeout (increase in workflow)

### Issue: No Results Showing

**Symptoms:**
- Workflow succeeds but no alerts
- Security tab shows "No alerts"

**Solutions:**

1. **Verify scan completed**
   - Check Actions tab
   - Confirm workflow finished

2. **Check configuration**
   - Review `.github/codeql/codeql-config.yml`
   - Ensure paths are included

3. **Wait for processing**
   - Results may take a few minutes to appear
   - Refresh Security tab

### Issue: Too Many False Positives

**Symptoms:**
- Many alerts that aren't real issues
- High noise-to-signal ratio

**Solutions:**

1. **Adjust query suite**
   - Use `security-extended` instead of `security-and-quality`
   - More precise, fewer false positives

2. **Exclude test files**
   - Add to `paths-ignore` in config
   - Test files often have intentional vulnerabilities

3. **Improve code patterns**
   - Use framework features
   - Follow security best practices

### Issue: Scan Takes Too Long

**Symptoms:**
- Workflow times out
- Takes > 30 minutes

**Solutions:**

1. **Exclude more paths**
   ```yaml
   paths-ignore:
     - '**/node_modules'
     - '**/dist'
     - '**/build'
   ```

2. **Increase timeout**
   ```yaml
   jobs:
     analyze:
       timeout-minutes: 60
   ```

3. **Split into multiple jobs**
   - Separate jobs for client/server
   - Run in parallel

---

## CodeQL CLI (Optional)

For local testing, you can use CodeQL CLI:

### Installation

```bash
# Download CodeQL CLI
wget https://github.com/github/codeql-cli-binaries/releases/latest/download/codeql-linux64.zip
unzip codeql-linux64.zip
export PATH=$PATH:$(pwd)/codeql

# Download queries
git clone https://github.com/github/codeql.git codeql-queries
```

### Run Local Analysis

```bash
# Create database
codeql database create kdx-db --language=javascript

# Run queries
codeql database analyze kdx-db \
  --format=sarif-latest \
  --output=results.sarif \
  codeql-queries/javascript/ql/src/codeql-suites/javascript-security-extended.qls

# View results
codeql bqrs decode results.sarif
```

---

## Additional Resources

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [CodeQL Query Help](https://codeql.github.com/codeql-query-help/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

## Security Contacts

**For security vulnerabilities:**  
Email: bryanra@worldpathregulatory.com

**For CodeQL questions:**  
See CONTRIBUTING.md

---

**Last Updated:** November 2025  
**Version:** 1.0.0
