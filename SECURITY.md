# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| Latest  | :white_check_mark: | Currently deployed production version |
| < Latest | :x:               | Please upgrade to latest version |

---

## Reporting a Vulnerability

We take the security of the KDx Portal seriously. If you discover a security vulnerability, please follow these guidelines:

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities privately:

1. **Email:** bryanra@worldpathregulatory.com
2. **Subject:** `[SECURITY] KDx Portal Vulnerability Report`
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
   - Your contact information

### What to Expect

- **Acknowledgment:** Within 24-48 hours
- **Initial Assessment:** Within 1 week
- **Status Updates:** Every 7 days until resolved
- **Resolution Timeline:** Depends on severity (see below)

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **Critical** | Immediate threat to data or system | 24 hours | SQL injection, authentication bypass, RCE |
| **High** | Significant security risk | 7 days | XSS, CSRF, privilege escalation |
| **Medium** | Moderate security risk | 30 days | Information disclosure, weak encryption |
| **Low** | Minor security issue | 90 days | Missing security headers, verbose errors |

### Disclosure Policy

- We follow **coordinated disclosure**
- We will work with you to understand and fix the issue
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We will not take legal action against security researchers who:
  - Report vulnerabilities responsibly
  - Do not exploit vulnerabilities beyond proof-of-concept
  - Do not access or modify user data
  - Do not perform DoS attacks

---

## Security Measures

### Automated Security

✅ **Dependabot Security Updates**
- Automatic scanning for vulnerable dependencies
- Immediate PR creation for security fixes
- Weekly dependency updates

✅ **GitHub Security Advisories**
- Automatic vulnerability detection
- Private security advisory creation
- CVE assignment when applicable

✅ **Code Scanning**
- Static analysis for security issues
- Automated security testing in CI/CD

### Manual Security Practices

✅ **Code Review**
- All changes require peer review
- Security-focused review for sensitive code
- Branch protection enforces review process

✅ **Access Control**
- Principle of least privilege
- Role-based access control (RBAC)
- Multi-factor authentication (MFA) required

✅ **Data Protection**
- Encryption at rest and in transit
- Secure session management
- Regular security audits

---

## Security Best Practices for Contributors

### Code Security

1. **Input Validation**
   - Validate all user input
   - Use parameterized queries
   - Sanitize output

2. **Authentication & Authorization**
   - Never bypass authentication checks
   - Implement proper authorization
   - Use secure session management

3. **Sensitive Data**
   - Never commit secrets (API keys, passwords, tokens)
   - Use environment variables
   - Encrypt sensitive data

4. **Dependencies**
   - Keep dependencies up to date
   - Review Dependabot PRs promptly
   - Audit new dependencies before adding

### Secure Development Workflow

```bash
# 1. Check for vulnerabilities before committing
pnpm audit

# 2. Fix high/critical vulnerabilities
pnpm audit fix

# 3. Review dependency changes
git diff package.json pnpm-lock.yaml

# 4. Test thoroughly
pnpm run type-check
pnpm run test
```

---

## Vulnerability Response Process

### 1. Triage (24-48 hours)

- Acknowledge receipt
- Assign severity level
- Determine if vulnerability is valid

### 2. Investigation (1-7 days)

- Reproduce the vulnerability
- Assess impact and scope
- Identify affected versions

### 3. Fix Development (varies by severity)

- Develop and test fix
- Create security patch
- Prepare security advisory

### 4. Disclosure (coordinated)

- Notify affected users
- Publish security advisory
- Release patched version
- Credit reporter (if desired)

### 5. Post-Mortem

- Document lessons learned
- Update security practices
- Improve detection/prevention

---

## Known Security Considerations

### Authentication

- Uses Manus OAuth for authentication
- Session cookies are HTTP-only and secure
- JWT tokens are signed and validated

### File Uploads

- File type validation implemented
- File size limits enforced
- Files stored in S3 with access control

### Database

- Parameterized queries via Drizzle ORM
- Database credentials stored securely
- Regular backups maintained

### API Security

- tRPC provides type-safe API layer
- Authentication required for protected endpoints
- Rate limiting recommended for production

---

## Security Contacts

**Primary Contact:**  
Bryan Schneider  
Email: bryanra@worldpathregulatory.com

**Emergency Contact:**  
Same as above (24-hour response for critical issues)

---

## Security Updates

Subscribe to security updates:

1. **GitHub Watch:** Click "Watch" → "Custom" → "Security alerts"
2. **Email Notifications:** Enabled automatically for repository collaborators
3. **RSS Feed:** Subscribe to GitHub security advisories

---

## Compliance

This project follows security best practices aligned with:

- OWASP Top 10
- CWE/SANS Top 25
- NIST Cybersecurity Framework

---

## Security Checklist for Releases

Before each release, ensure:

- [ ] All dependencies are up to date
- [ ] No known security vulnerabilities
- [ ] Security tests pass
- [ ] Code review completed
- [ ] Secrets are not committed
- [ ] Environment variables documented
- [ ] Access controls verified
- [ ] Backup and recovery tested

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

**Last Updated:** November 2025  
**Version:** 1.0.0

Thank you for helping keep KDx Portal secure!
