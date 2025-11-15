# KDx Diagnostics Secure Client Portal

A secure, web-based file repository and collaboration hub for sharing project files with medical device clients and regulatory affairs team. Features role-based access control, comprehensive audit trails, and a modern Apple-inspired interface optimized for desktop and mobile.

## Features

### Security & Access Control
- **Role-Based Authentication**: Admin and Client roles with distinct permissions
- **Granular Folder Permissions**: Control view, upload, edit, and delete access per folder per user
- **Comprehensive Audit Logs**: Track all file operations, user actions, and permission changes
- **Secure File Storage**: Files stored in S3 with non-enumerable paths
- **Session Management**: Secure OAuth-based authentication with automatic session handling

### File Management
- **Hierarchical Folder Structure**: Organize files with unlimited nested folders
- **Multi-Format Support**: Upload and manage any file type
- **File Preview**: In-browser preview for images, PDFs, and text files
- **Text File Editor**: Edit .txt, .md, .json, and other text files directly in the browser
- **Drag-and-Drop Upload**: Easy file upload with visual feedback
- **Download Management**: Secure file downloads with audit logging

### User Management
- **Email Invitations**: Invite users via email with role assignment
- **User Dashboard**: View all active users and pending invitations
- **Role Management**: Promote or demote users between admin and client roles
- **Access Control**: Assign specific folders to specific users

### User Interface
- **Apple-Inspired Design**: Clean, modern interface with smooth animations
- **Responsive Layout**: Fully optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme**: Switchable themes with system preference detection
- **Empty States**: Helpful guidance when no content exists
- **Loading States**: Skeleton screens and spinners for better UX

## Technology Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Node.js + Express + tRPC 11
- **Database**: MySQL/TiDB with Drizzle ORM
- **Storage**: AWS S3 (via platform-provided storage)
- **Authentication**: Manus OAuth (platform-provided)
- **Deployment**: Manus Platform (free tier available)

## Project Structure

```
kdx-secure-portal/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── FileBrowser.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   ├── PermissionManager.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── AuditLogViewer.tsx
│   │   ├── pages/         # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── ClientDashboard.tsx
│   │   ├── lib/           # Utilities and tRPC client
│   │   └── index.css      # Global styles and theme
├── server/                # Backend application
│   ├── routers.ts         # tRPC API routes
│   ├── db.ts              # Database queries
│   └── storage.ts         # S3 storage helpers
├── drizzle/               # Database schema and migrations
│   └── schema.ts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22+ installed
- pnpm package manager
- Database connection (MySQL/TiDB)
- S3 storage credentials (provided by platform)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kdx-secure-portal
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   The following environment variables are automatically provided by the Manus platform:
   - `DATABASE_URL` - MySQL/TiDB connection string
   - `JWT_SECRET` - Session signing secret
   - `VITE_APP_ID` - OAuth application ID
   - `OAUTH_SERVER_URL` - OAuth backend URL
   - `VITE_OAUTH_PORTAL_URL` - OAuth login portal URL
   - `OWNER_OPEN_ID`, `OWNER_NAME` - Owner information
   - `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` - Platform API credentials

4. **Push database schema**
   ```bash
   pnpm db:push
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Open your browser to `http://localhost:3000`
   - Sign in with your Manus account
   - The owner account will automatically have admin role

## Deployment

This application is designed to be deployed on the Manus platform, which provides:
- Free tier hosting with 24/7 availability
- Automatic HTTPS/SSL certificates
- Managed database and S3 storage
- OAuth authentication infrastructure
- Zero-configuration deployment

### Deploy to Manus

1. **Save a checkpoint**
   - The checkpoint captures the current state of your application
   - This is required before publishing

2. **Click the Publish button**
   - Located in the Management UI header (top-right)
   - Your application will be deployed with a public URL
   - Custom domains can be configured in Settings → Domains

3. **Configure visibility**
   - Navigate to Dashboard → Settings → General
   - Set visibility to "Private" for internal use only
   - Or "Public" to allow external access

## User Roles

### Administrator
- Full access to all folders and files
- Create and manage folders
- Upload, download, edit, and delete files
- Invite new users and manage roles
- Assign folder permissions to clients
- View comprehensive audit logs

### Client
- Access only to assigned folders
- View and download files (if permitted)
- Upload files to folders (if permitted)
- Edit text files (if permitted)
- Delete files (if permitted)
- Cannot see other users or system settings

## Security Features

### Authentication & Authorization
- OAuth-based authentication via Manus platform
- Password hashing handled by OAuth provider (bcrypt)
- Secure session management with JWT tokens
- Role-based access control at API level
- Permission checks on every file operation

### Data Protection
- All data transmission over HTTPS/SSL
- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's built-in escaping
- File access authorization checks before serving content
- Non-enumerable S3 file paths with random suffixes

### Audit Trail
- Every action logged with user, timestamp, and IP address
- File operations tracked (upload, download, edit, delete)
- Permission changes recorded
- User invitations and role changes logged
- Filterable audit log viewer for administrators

## Database Schema

### Tables
- **users** - User accounts with roles (admin/client)
- **user_invitations** - Email invitations with expiry
- **folders** - Hierarchical folder structure
- **files** - File metadata with S3 references
- **folder_permissions** - Granular access control
- **audit_logs** - Comprehensive activity tracking

## API Documentation

The application uses tRPC for type-safe API communication. All procedures are defined in `server/routers.ts`:

### Authentication
- `auth.me` - Get current user
- `auth.logout` - Sign out

### User Management (Admin Only)
- `users.list` - Get all users
- `users.invite` - Send email invitation
- `users.updateRole` - Change user role
- `users.pendingInvitations` - View pending invites

### Folder Management
- `folders.create` - Create new folder (admin only)
- `folders.list` - List folders (filtered by permissions)
- `folders.get` - Get folder details
- `folders.delete` - Delete empty folder (admin only)
- `folders.rename` - Rename folder (admin only)

### File Management
- `files.upload` - Upload file with permission check
- `files.list` - List files in folder
- `files.get` - Get file metadata
- `files.download` - Get download URL
- `files.delete` - Delete file with permission check
- `files.updateContent` - Update text file content

### Permissions (Admin Only)
- `permissions.grant` - Assign folder access to user
- `permissions.revoke` - Remove folder access
- `permissions.listByFolder` - View folder permissions
- `permissions.listByUser` - View user permissions

### Audit Logs (Admin Only)
- `audit.list` - Get filtered audit logs
- `audit.recent` - Get recent activity

## Customization

### Branding
- Update `VITE_APP_TITLE` in Settings → General
- Change logo by modifying `APP_LOGO` in `client/src/const.ts`
- Update favicon in Management UI → Settings → General

### Theme Colors
- Edit CSS variables in `client/src/index.css`
- Modify `:root` for light theme
- Modify `.dark` for dark theme

### File Size Limits
- Default: No hard limit enforced
- Can add validation in `files.upload` procedure
- S3 bucket limits apply (typically 5GB per file)

## Troubleshooting

### Cannot create folders
- Ensure you're signed in as an admin
- Check that you're at the root level or inside a folder

### Files not uploading
- Check file size (browser may limit to ~100MB)
- Verify S3 credentials are configured
- Check browser console for errors

### Permission denied errors
- Verify user has been granted access to the folder
- Check user role (clients need explicit permissions)
- Review audit logs for permission changes

### Database connection errors
- Ensure `DATABASE_URL` is set correctly
- Run `pnpm db:push` to sync schema
- Check database server is accessible

## Support

For issues related to:
- **Platform/Hosting**: Visit https://help.manus.im
- **Application Features**: Check the audit logs and user permissions
- **Custom Development**: Review the code in `server/routers.ts` and `client/src/components/`

## License

Proprietary - KDx Diagnostics

## 🚀 Production Deployment

### DigitalOcean Deployment

Complete deployment scripts and documentation are provided in the `deployment/` directory for production hosting on DigitalOcean.

```bash
# Run initial server setup
./deployment/scripts/01-initial-setup.sh

# Deploy application
./deployment/scripts/02-deploy-application.sh

# Setup SSL certificates
./deployment/scripts/03-setup-ssl.sh

# Configure monitoring
./deployment/scripts/04-setup-monitoring.sh

# Setup automated backups
./deployment/scripts/05-setup-backups.sh
```

See `deployment/docs/DEPLOYMENT_GUIDE.md` for detailed instructions.

### CI/CD Pipeline

GitHub Actions workflows are configured for:
- **Continuous Integration** - Automated testing, linting, and type checking
- **Continuous Deployment** - Automated deployment to production
- **Security Scanning** - CodeQL analysis and Dependabot updates
- **Dependency Review** - Automated vulnerability scanning

See `deployment/docs/CICD_SETUP.md` for configuration details.

## 📖 Additional Documentation

- **[Deployment Guide](deployment/docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[CI/CD Setup](deployment/docs/CICD_SETUP.md)** - GitHub Actions configuration
- **[Branch Protection](deployment/docs/BRANCH_PROTECTION_SETUP.md)** - Branch protection rules
- **[CodeQL Security](deployment/docs/CODEQL_SECURITY_SCANNING.md)** - Security scanning setup
- **[Dependency Management](deployment/docs/DEPENDENCY_MANAGEMENT.md)** - Dependabot configuration

## Changelog

### Version 1.0.0 (Initial Release)
- Role-based authentication (admin/client)
- Hierarchical folder structure
- File upload, download, preview, and editing
- Granular folder permissions
- User invitation system
- Comprehensive audit logging
- Apple-inspired responsive UI
- Dark/light theme support
