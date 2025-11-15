# KDx Diagnostics Secure Client Portal - TODO

## Database Schema
- [x] Design folders table with hierarchical structure
- [x] Design files table with S3 references and metadata
- [x] Design permissions table for folder-level access control
- [x] Design audit_logs table for tracking all actions
- [x] Design user_invitations table for email invitations
- [x] Add role field to users (admin/client)

## Backend - Authentication & User Management
- [x] Implement admin procedure to invite users via email
- [x] Implement user registration flow for invited users
- [x] Implement role-based access control (admin vs client)
- [x] Implement session management with secure logout

## Backend - File Management
- [x] Implement file upload procedure with S3 integration
- [x] Implement file download procedure
- [x] Implement file deletion procedure (admin only)
- [x] Implement folder creation procedure
- [x] Implement folder deletion procedure (with confirmation)
- [x] Implement file preview procedure for common types (images, PDFs, text)
- [x] Implement in-browser text file editing (.txt, .md, .json)
- [x] Implement file metadata retrieval

## Backend - Permissions & Sharing
- [x] Implement granular folder permissions assignment
- [x] Implement permission checking for all file operations
- [x] Implement client-specific folder access queries
- [ ] Implement permission inheritance for subfolders

## Backend - Audit Trail
- [x] Implement audit log creation for all actions
- [x] Implement audit log retrieval with filtering
- [x] Track file uploads, downloads, edits, deletions
- [x] Track permission changes
- [x] Track user invitations and registrations

## Frontend - Admin Dashboard
- [x] Create admin dashboard layout with sidebar navigation
- [x] Implement user management interface
- [x] Implement user invitation form
- [x] Implement file upload interface (drag-and-drop + file selector)
- [x] Implement folder management interface
- [x] Implement file browser with folder tree
- [x] Implement file preview modal
- [x] Implement text file editor
- [x] Implement permission management interface
- [x] Implement audit log viewer
- [x] Add confirmation dialogs for destructive actions

## Frontend - Client View
- [x] Create client dashboard with restricted navigation
- [x] Implement client file browser (only assigned folders)
- [x] Implement file download functionality
- [x] Implement file preview for clients
- [x] Implement file upload for clients (if permitted)
- [x] Hide admin features from client view

## Security Features
- [x] Implement HTTPS/SSL (handled by platform)
- [x] Implement password hashing with bcrypt (handled by Manus OAuth)
- [x] Implement SQL injection prevention (using Drizzle ORM)
- [x] Implement XSS prevention
- [x] Implement secure session management
- [x] Implement file access authorization checks
- [ ] Add rate limiting for sensitive operations

## UI/UX Design
- [x] Design Apple-inspired modern interface
- [x] Implement responsive design for mobile and desktop
- [x] Add smooth animations and transitions
- [x] Implement loading states and skeletons
- [x] Implement error handling and user feedback
- [x] Add empty states for folders and files
- [ ] Implement search functionality for files

## Testing & Deployment
- [x] Test admin user flows
- [x] Test client user flows
- [x] Test permission enforcement
- [x] Test file operations (upload, download, edit, delete)
- [x] Test mobile responsiveness
- [x] Create deployment checkpoint
- [ ] Deploy to production

## Branding Integration
- [x] Extract logo from business card
- [x] Copy logo to project assets
- [x] Update color scheme to WorldPath brand colors (blue accent, black text)
- [x] Update typography to match brand style
- [x] Update APP_LOGO constant to use WorldPath logo
- [x] Update company name to WorldPath Regulatory Solutions
- [x] Add tagline "Charting the WorldPath to success"
- [x] Test branding across all pages

## File Sorting and Filtering
- [x] Add sort by name (A-Z, Z-A)
- [x] Add sort by date (newest first, oldest first)
- [x] Add sort by size (largest first, smallest first)
- [x] Add sort by file type
- [x] Add filter by file type (images, documents, PDFs, text, etc.)
- [x] Add real-time search by filename
- [ ] Add date range filter
- [x] Make sorting/filtering mobile-responsive
- [ ] Persist sort/filter preferences in local storage

## File Version History
- [x] Add file_versions table to database schema
- [x] Add version number tracking to files
- [x] Store version metadata (timestamp, user, file size, change description)
- [x] Implement backend procedure to create new version on file update
- [x] Implement backend procedure to list all versions for a file
- [x] Implement backend procedure to restore previous version
- [x] Implement backend procedure to download specific version
- [x] Build version history UI component
- [x] Add version list modal/panel
- [x] Display version timeline with user attribution
- [x] Add restore version functionality
- [x] Add download specific version functionality
- [x] Add version preview functionality
- [x] Track version changes in audit log
- [x] Test version history across all user roles

## Bulk File Operations
- [x] Add multi-select checkbox UI for files
- [x] Add "Select All" / "Deselect All" functionality
- [x] Add selection counter display
- [x] Implement bulk download as ZIP archive
- [x] Implement bulk move to different folder
- [x] Implement bulk delete with confirmation
- [x] Add bulk action toolbar when files are selected
- [x] Add clear selection button
- [x] Implement backend procedure for bulk download (ZIP creation)
- [x] Implement backend procedure for bulk move
- [x] Implement backend procedure for bulk delete
- [x] Add permission checks for bulk operations
- [x] Add audit logging for bulk operations
- [x] Make bulk operations mobile-responsive
- [x] Test bulk operations with large file sets

## Global Search Feature
- [x] Add global search bar in header/navigation
- [x] Implement backend search by file name
- [ ] Implement backend search by file content (text files)
- [x] Add permission filtering to search results
- [x] Build search results page with file cards
- [x] Display folder breadcrumbs for each result
- [x] Add click-to-navigate to file location
- [ ] Implement search result highlighting
- [ ] Add filter options (file type, date range, folder)
- [ ] Add recent searches functionality
- [x] Make search mobile-responsive
- [x] Add empty state for no results
- [x] Test search performance with large datasets
- [x] Add search to audit logs

## Shareable File Links
- [x] Add share_links table to database schema
- [x] Generate unique shareable link tokens
- [x] Implement password protection with bcrypt hashing
- [x] Add expiration date functionality
- [x] Track link access in audit logs
- [x] Implement link revocation
- [x] Backend procedure to create share link
- [x] Backend procedure to validate and access shared file
- [x] Backend procedure to list active shares for a file
- [x] Backend procedure to revoke share link
- [x] Build share dialog UI with options
- [x] Add share button to file actions
- [x] Display active shares list
- [x] Create public access page for shared links
- [x] Implement password input for protected links
- [x] Add expiration message for expired links
- [x] Test link generation and access
- [x] Test password protection
- [x] Test expiration dates
- [x] Make sharing UI mobile-responsive

## Client Dashboard Analytics
- [x] Backend: Calculate storage usage by user
- [x] Backend: Get recent file activity for user
- [ ] Backend: Get pending items (files needing review/action)
- [x] Backend: Get storage breakdown by folder
- [x] Backend: Get quick stats (total files, folders, shares)
- [x] Backend: Get recent downloads for user
- [x] Frontend: Create storage usage visualization (pie chart/progress bar)
- [x] Frontend: Create recent activity timeline
- [ ] Frontend: Create pending items widget
- [x] Frontend: Create quick stats cards
- [x] Frontend: Create storage breakdown chart
- [ ] Frontend: Create recent shares widget
- [ ] Frontend: Add quick action buttons for common tasks
- [x] Frontend: Make dashboard mobile-responsive
- [x] Test dashboard with different user roles
- [x] Test dashboard with various data volumes

## File Comments & Collaboration
- [x] Add file_comments table to database schema
- [x] Add comment_mentions table for @mentions
- [x] Backend: Create comment on file
- [x] Backend: Get comments for file
- [x] Backend: Update/edit comment
- [x] Backend: Delete comment
- [x] Backend: Parse @mentions from comment text
- [x] Backend: Create mention records
- [x] Backend: Get mentions for user (notifications)
- [x] Frontend: Comment input with @mention autocomplete
- [x] Frontend: Display comment thread with replies
- [ ] Frontend: Show comment count badge on files
- [x] Frontend: Edit/delete own comments
- [x] Frontend: Real-time comment updates
- [x] Frontend: Highlight @mentions in comments
- [ ] Frontend: Show unread comment indicators
- [x] Frontend: Mobile-responsive comment UI
- [x] Add comment activity to audit logs
- [x] Test commenting with multiple users
- [x] Test @mention notifications

## Approval Workflow System
- [x] Add workflow_status enum to files table (draft, under_review, approved, rejected)
- [ ] Add file_approvals table for tracking approval requests
- [x] Add reviewerId and reviewedAt fields to files
- [x] Backend: Submit file for review
- [x] Backend: Assign reviewer to file
- [x] Backend: Approve file
- [x] Backend: Reject file with reason
- [x] Backend: Get files by workflow status
- [x] Backend: Get pending approvals for reviewer
- [x] Backend: Track workflow history in audit logs
- [x] Frontend: Status badge component
- [x] Frontend: Submit for review dialog
- [x] Frontend: Approve/reject dialog for reviewers
- [ ] Frontend: Workflow status filter
- [ ] Frontend: Pending approvals widget
- [ ] Frontend: Workflow history timeline
- [ ] Frontend: Bulk status update
- [ ] Add workflow notifications (email alerts)
- [x] Test workflow transitions
- [x] Test reviewer permissions

## Multi-Reviewer Approval System
- [x] Add file_reviewers table for many-to-many relationship
- [x] Add review_status field (pending, approved, rejected) per reviewer
- [x] Add approval_requirement field to files (all_must_approve, majority_must_approve, any_can_approve)
- [x] Backend: Assign multiple reviewers to file
- [x] Backend: Remove reviewer from file
- [x] Backend: Get all reviewers for a file with their status
- [x] Backend: Approve file by specific reviewer
- [x] Backend: Reject file by specific reviewer
- [x] Backend: Calculate overall approval status based on requirement
- [x] Backend: Get pending reviews for a reviewer
- [x] Frontend: Multi-select reviewer assignment UI
- [x] Frontend: Display all reviewers with status indicators
- [x] Frontend: Show reviewer-specific approval/rejection notes
- [x] Frontend: Configure approval requirement (all/majority/any)
- [x] Frontend: Pending reviews widget for reviewers
- [x] Test multi-reviewer workflows
- [x] Test approval requirement logic

## Workflow Status Filters in File Browser
- [x] Add workflow status filter state to FileBrowser
- [x] Create filter button UI (All, Draft, Pending Review, Approved, Rejected)
- [x] Add file count badges to filter buttons
- [x] Implement filter logic to show only files matching selected status
- [x] Add active filter highlighting
- [x] Make filters mobile-responsive with horizontal scroll
- [x] Combine status filter with existing search and file type filters
- [x] Add clear all filters button
- [x] Test status filtering with various file sets

## Email Notification System
- [ ] Add notification_preferences table to database schema
- [ ] Add notification_log table to track sent emails
- [x] Create email service module with SMTP configuration
- [x] Design email templates (reviewer assignment, status change, @mention, share link)
- [x] Implement notification for reviewer assignment
- [x] Implement notification for file status changes (submitted, approved, rejected)
- [x] Implement notification for @mentions in comments
- [ ] Implement notification for share link creation
- [ ] Add notification preferences UI for users
- [ ] Add email notification toggle for each event type
- [ ] Integrate notifications into workflow procedures
- [ ] Integrate notifications into comment system
- [ ] Integrate notifications into share link creation
- [ ] Add notification history view in user settings
- [ ] Test email delivery for all notification types
- [ ] Add unsubscribe functionality

## Enhanced Share Link Email Notifications
- [x] Add recipientEmail field to share_links table
- [x] Add recipientName field to share_links table
- [x] Add message field to share_links table for personal notes
- [x] Update createShareLink backend to accept recipient info
- [x] Update share link creation UI to collect recipient email
- [x] Add optional message field to share dialog
- [x] Integrate sendShareLinkNotification into share creation
- [x] Test email delivery with password-protected links
- [x] Test email delivery with expiration dates
- [x] Test email delivery with custom messages

## User Notification Preferences Settings
- [x] Design notification_preferences table schema
- [x] Add notification_preferences table with user preferences
- [x] Create getUserPreferences backend procedure
- [x] Create updateUserPreferences backend procedure
- [x] Create default preferences on user registration
- [x] Build Settings page component with navigation
- [x] Add notification preferences section to settings
- [x] Add toggle switches for each notification type
- [x] Add delivery mode selector (instant vs daily digest)
- [x] Integrate preference checks into notification sending
- [x] Test preference toggles work correctly
- [ ] Test daily digest mode (future enhancement)
- [x] Add settings link to user menu/navigation

## Pending Approvals Dashboard Widget
- [x] Create getPendingApprovalsOverview backend procedure
- [x] Add tRPC endpoint for pending approvals data
- [x] Build PendingApprovalsWidget component
- [x] Add file count badge
- [x] Display reviewer assignments for each file
- [x] Add quick approve button with optional notes
- [x] Add quick reject button with required reason
- [x] Implement optimistic updates for quick actions
- [x] Add loading states for actions
- [x] Add empty state when no pending approvals
- [x] Integrate widget into AdminDashboard
- [x] Test quick actions work correctly
- [x] Test widget updates after actions

## Bulk Approval Actions
- [x] Create bulkApproveFiles backend procedure
- [x] Create bulkRejectFiles backend procedure
- [x] Add tRPC endpoints for bulk actions
- [x] Add checkbox selection to widget file list
- [x] Add "Select All" checkbox in widget header
- [x] Add bulk approve button (disabled when no selection)
- [x] Add bulk reject button (disabled when no selection)
- [x] Show selected count in bulk action buttons
- [x] Add bulk approve confirmation dialog
- [x] Add bulk reject dialog with shared reason
- [x] Implement optimistic updates for bulk actions
- [x] Clear selection after successful bulk action
- [x] Test bulk approve with multiple files
- [x] Test bulk reject with multiple files

## File Activity Timeline
- [x] Create getFileActivityTimeline backend procedure
- [x] Add tRPC endpoint for file activity data
- [x] Build FileActivityTimeline component
- [x] Add timeline to file preview/details page
- [x] Display all action types (upload, edit, comment, status change, reviewer assignment, share)
- [x] Show user avatars and names for each action
- [x] Add relative timestamps for each activity
- [x] Implement expandable details for complex actions
- [x] Add filter controls (action type, date range, user)
- [x] Add empty state when no activity
- [x] Integrate timeline into FilePreview component

## Reviewer Workload Analytics
- [x] Create getReviewerWorkloadStats backend procedure
- [x] Calculate pending review count per reviewer
- [x] Calculate average review time per reviewer
- [x] Calculate approval/rejection rates
- [x] Add tRPC endpoint for workload analytics
- [x] Build ReviewerWorkloadWidget component
- [x] Display reviewer statistics in card format
- [x] Add workload distribution chart/visualization
- [x] Show top reviewers by pending count
- [x] Add sorting options (by pending, by avg time, by rate)
- [x] Integrate widget into AdminDashboard

## Advanced Filtering for Pending Approvals
- [x] Add filter state management to PendingApprovalsWidget
- [x] Create filter UI controls (dropdowns, date pickers)
- [x] Add approval requirement type filter
- [x] Add assigned reviewer filter
- [x] Add upload date range filter
- [x] Add uploader filter
- [x] Implement client-side filtering logic
- [x] Add "Clear Filters" button
- [x] Show active filter count badge
- [x] Persist filter state during session

## Real-Time Notification System
- [x] Design notification schema (id, userId, type, title, message, fileId, isRead, createdAt)
- [x] Create notifications table in database
- [x] Add notification types enum (file_upload, file_approved, file_rejected, comment_mention, reviewer_assigned, share_created)
- [x] Create getNotifications backend procedure
- [x] Create markNotificationAsRead backend procedure
- [x] Create markAllNotificationsAsRead backend procedure
- [x] Create getUnreadNotificationCount backend procedure
- [x] Build SSE endpoint for real-time notification streaming
- [x] Create notification broadcasting helper function
- [x] Build NotificationBell component with unread count badge
- [x] Build NotificationPanel dropdown component
- [x] Add notification bell to DashboardLayout header
- [x] Implement SSE connection in frontend
- [x] Add auto-reconnection logic for SSE
- [x] Integrate notification creation into file upload workflow
- [x] Integrate notification creation into approval workflow
- [x] Integrate notification creation into rejection workflow
- [x] Integrate notification creation into comment mention workflow
- [x] Integrate notification creation into reviewer assignment workflow
- [ ] Integrate notification creation into share link workflow (N/A - share links notify external users)
- [x] Add click handlers to navigate to relevant files
- [ ] Add notification sound (optional - future enhancement)
- [x] Test real-time delivery across multiple browser tabs
- [x] Test notification persistence and read status

## Notification Snooze Feature
- [x] Add snoozedUntil field to notifications table
- [x] Create snoozeNotification backend procedure
- [x] Create unsnoozeNotification backend procedure
- [x] Update getNotifications to filter snoozed notifications
- [x] Add snooze button to notification items in panel
- [x] Create snooze duration selector dropdown (15min, 1hr, 4hr, tomorrow)
- [x] Implement snooze action handler in NotificationPanel
- [x] Add visual indicator for snoozed notifications
- [x] Update notification count to exclude snoozed items
- [x] Test snooze expiration and automatic reappearance

## File Version Comparison Tool
- [x] Create getFileVersionsForComparison backend procedure
- [x] Add version comparison endpoint to files router
- [x] Build FileVersionComparison component
- [x] Add version selector dropdowns (compare version A vs version B)
- [x] Display side-by-side metadata comparison (size, upload date, uploader)
- [x] Add file preview/viewer for both versions
- [x] Highlight differences in metadata
- [x] Add restore version functionality
- [x] Add download specific version functionality
- [x] Integrate comparison tool into FilePreview Versions tab
- [x] Add Versions tab to file preview
- [x] Test comparison with different file types

## File Expiration and Archival System
- [x] Add expiresAt field to files table
- [x] Add isArchived field to files table
- [x] Add archivedAt field to files table
- [x] Add archivedBy field to files table
- [x] Create setFileExpiration backend procedure
- [x] Create archiveFile backend procedure
- [x] Create restoreArchivedFile backend procedure
- [x] Create getExpiredFiles backend procedure
- [x] Create getArchivedFiles backend procedure
- [ ] Add expiration date picker to file upload/edit UI
- [x] Create ExpiredFilesView component for admins
- [x] Create ArchivedFilesView component for admins
- [ ] Implement pre-expiration email reminders (7 days, 1 day before)
- [ ] Add cron job to automatically archive expired files
- [ ] Add archive/restore buttons to file actions
- [x] Add permanent delete option for archived files
- [ ] Integrate expiration management into admin dashboard

## Custom Multi-Stage Approval Workflows
- [x] Create workflow_templates table (id, name, description, isActive, createdBy, createdAt)
- [x] Create workflow_stages table (id, workflowTemplateId, stageName, stageOrder, requiredApprovals, createdAt)
- [x] Create file_workflow_instances table (id, fileId, workflowTemplateId, currentStageId, status, startedAt, completedAt)
- [x] Create file_workflow_stage_progress table (id, workflowInstanceId, stageId, status, assignedReviewers, approvedBy, rejectedBy, startedAt, completedAt)
- [x] Add getWorkflowTemplates backend procedure
- [x] Add getWorkflowTemplateById backend procedure
- [x] Add createWorkflowTemplate backend procedure (with stages)
- [ ] Add updateWorkflowTemplate backend procedure
- [ ] Add deleteWorkflowTemplate backend procedure
- [x] Add assignWorkflowToFile backend procedure
- [x] Add getFileWorkflowProgress backend procedure
- [x] Add approveWorkflowStage backend procedure
- [x] Add rejectWorkflowStage backend procedure
- [x] Add advanceToNextStage backend procedure
- [ ] Create WorkflowTemplateManager page component
- [ ] Create WorkflowTemplateForm component for create/edit
- [ ] Create WorkflowStageEditor component with drag-and-drop ordering
- [ ] Create FileWorkflowProgress component with visual timeline
- [ ] Add workflow assignment dialog to file upload/submission
- [ ] Add workflow progress widget to file preview
- [ ] Integrate workflow approval into reviewer dashboard
- [ ] Add workflow template selection to admin settings

## Batch File Operations
- [x] Add multi-select state management to FileBrowser
- [x] Add checkbox column to file list
- [x] Add "Select All" checkbox to table header
- [x] Create BatchActionsToolbar component
- [x] Add bulk move to folder operation
- [x] Add bulk delete operation
- [ ] Add bulk change permissions operation
- [ ] Add bulk assign reviewers operation
- [x] Add bulk download as ZIP operation
- [x] Add bulk archive operation
- [ ] Add bulk set expiration operation
- [x] Show selection count in toolbar
- [x] Add confirmation dialogs for destructive operations
- [x] Implement optimistic updates for batch operations
- [x] Add progress indicators for long-running batch operations

## Workflow Upload Integration
- [x] Add workflow template selector to upload dialog
- [x] Fetch active workflow templates in upload component
- [x] Update file upload backend to accept optional workflowTemplateId
- [x] Automatically create workflow instance after file upload
- [x] Show workflow assignment confirmation in upload success message
- [x] Test workflow assignment during upload

## Workflow Timeline Visualization
- [x] Create FileWorkflowTimeline component
- [x] Fetch workflow progress data for file
- [x] Display workflow stages in chronological order
- [x] Highlight current stage with distinct styling
- [x] Show completed stages with checkmarks
- [x] Show pending stages with muted styling
- [x] Display assigned reviewers for each stage
- [x] Add approve button for current stage (if user is assigned reviewer)
- [x] Add reject button with reason input for current stage
- [x] Show approval/rejection status and timestamps
- [x] Integrate timeline into FilePreview Workflow tab
- [x] Test timeline with multi-stage workflows

## Workflow Template Management
- [x] Create sample workflow templates in database (Standard Review, FDA Submission, Compliance Check)
- [x] Build WorkflowTemplateManager admin page component
- [x] Add template list view with cards
- [x] Add create new template dialog
- [x] Add edit template dialog
- [x] Add delete template confirmation
- [x] Add stage management UI (add, edit, reorder, delete stages)
- [x] Add workflow templates route to App.tsx
- [x] Add workflow templates navigation item to admin sidebar
- [x] Test template CRUD operations
- [x] Test stage management
- [x] Test complete workflow lifecycle with sample templates

## Workflow Undo Feature
- [x] Add actionTimestamp field to file_workflow_stage_progress table
- [x] Add actionUserId field to track who performed the action
- [x] Add undoneAt field to track if action was undone
- [x] Add undoneBy field to track who undid the action
- [x] Create database migration for new fields
- [x] Build canUndoWorkflowAction backend procedure (check 5-minute window)
- [x] Build undoWorkflowStageAction backend procedure
- [x] Add undo tRPC endpoints
- [x] Add undo button to FileWorkflowTimeline component
- [x] Show countdown timer for undo window
- [x] Disable undo button after 5 minutes
- [x] Add undo confirmation dialog (inline action)
- [x] Send email notification when action is undone (logged for now)
- [x] Add audit log entry for undo actions
- [x] Test undo for approvals
- [x] Test undo for rejections
- [x] Test 5-minute window enforcement

## Approval Comments Feature
- [x] Add approvalComments field to file_workflow_stage_progress table (JSON array)
- [x] Create database migration for approval comments field
- [x] Update approveWorkflowStage to accept optional comment parameter
- [x] Store approval comments with user ID and timestamp
- [x] Update approveStage tRPC endpoint to accept comment
- [x] Add approval comment dialog to FileWorkflowTimeline
- [x] Display approval comments in workflow timeline
- [x] Show comment author and timestamp
- [x] Test approval with comments
- [x] Test approval without comments (backward compatibility)

## @Mention Notification System
- [x] Create @mention parsing utility function
- [x] Build user autocomplete component for @ mentions
- [x] Add user search endpoint for autocomplete
- [x] Update approval/rejection comment handlers to detect mentions
- [x] Create notifications for mentioned users
- [x] Send email alerts to mentioned users
- [x] Build notification center UI component
- [x] Add notification bell icon to header
- [x] Show unread notification count badge
- [x] Add mark as read functionality
- [x] Add mark all as read functionality
- [x] Display mention notifications with context
- [x] Link notifications to source file/comment
- [x] Test @mention parsing
- [x] Test user autocomplete
- [x] Test notification creation
- [x] Test email delivery

## Threaded Comment System
- [x] Create workflow_comments table for storing all comments
- [x] Add parentCommentId field for thread relationships
- [ ] Migrate existing approval/rejection comments to new table (deferred - new system will be used going forward)
- [x] Create getCommentThread backend procedure
- [x] Create replyToComment backend procedure
- [x] Add tRPC endpoints for workflow comments
- [x] Integrate comment creation in approve/reject workflows
- [x] Build CommentThread UI component
- [x] Add reply button to each comment
- [x] Display nested comments with indentation
- [x] Add collapse/expand functionality for threads
- [x] Create reply notifications (via @mention system)
- [x] Support @mentions in reply comments
- [x] Show parent comment context in replies
- [x] Integrate comment thread into workflow timeline
- [x] Test comment threading
- [x] Test reply notifications
- [x] Test nested @mentions

## Bulk Workflow Assignment
- [x] Add multi-select checkboxes to file list (already exists)
- [x] Add "Select All" checkbox in file list header (already exists)
- [x] Create bulk actions toolbar component (already exists)
- [x] Build bulkAssignWorkflow backend procedure
- [x] Add error handling for individual file failures
- [x] Add tRPC endpoint for bulk workflow assignment
- [x] Add admin-only access control
- [x] Create bulk assignment dialog with template selector
- [x] Add progress indicator for bulk operations (loading spinner)
- [x] Show success/failure summary after bulk assignment
- [x] Add audit logging for bulk workflow assignments (in backend)
- [x] Restrict bulk assignment to admin users only
- [x] Test bulk assignment with multiple files
- [x] Test error handling for partial failures

## Bug Fixes
- [x] Fix folder creation audit log NaN entityId bug
- [x] Verify folder creation works correctly
- [x] Test audit log shows correct folder ID

## Workflow Analytics Dashboard
- [x] Create analytics data aggregation backend procedures
- [x] Calculate average approval times per stage
- [x] Calculate reviewer workload distribution
- [x] Identify workflow bottlenecks
- [x] Calculate workflow completion rates
- [x] Build WorkflowAnalytics page component
- [x] Add visual charts using chart library
- [x] Add analytics navigation to admin dashboard
- [x] Test analytics calculations

## Automated Workflow Reminders
- [x] Create reminder scheduling system
- [x] Build procedure to find pending reviews
- [x] Calculate days pending per stage
- [x] Send email reminders to reviewers
- [x] Make reminder threshold configurable (3 days default)
- [x] Add manual reminder trigger button to analytics page
- [x] Test reminder scheduling
- [x] Test email delivery

## Comment Editing and Deletion
- [x] Add editedAt timestamp to workflow_comments table
- [x] Add deletedAt soft delete field
- [x] Build editComment backend procedure with 15-minute window
- [x] Build deleteComment backend procedure
- [x] Add edit/delete tRPC endpoints
- [x] Add edit button to comment UI
- [x] Add delete button to comment UI
- [ ] Show "edited" indicator on modified comments (future enhancement)
- [x] Add audit logging for edit/delete actions
- [x] Test 15-minute window enforcement
- [x] Test edit/delete permissions

## File Comparison Tool
- [x] Build text extraction backend for PDFs
- [x] Build text extraction backend for Word documents
- [x] Create diff algorithm for line-by-line comparison
- [x] Build compareVersions backend procedure
- [x] Add tRPC endpoint for version comparison
- [x] Fix duplicate router names
- [x] Create FileComparisonViewer component
- [x] Add side-by-side layout with synchronized scrolling
- [x] Implement color-coded highlighting (green=added, red=deleted, yellow=modified)
- [x] Add version selector dropdown
- [x] Add navigation controls to jump between changes
- [x] Show change statistics (lines added/removed/modified)
- [x] Add "Compare Versions" button to file preview
- [x] Add comparison option to version history
- [x] Test PDF comparison
- [x] Test document comparison
- [x] Test large file handling

## File Templates Library
- [x] Create template_categories table
- [x] Create file_templates table with category, version tracking
- [x] Add downloadCount field for usage statistics
- [x] Build createTemplate backend procedure
- [x] Build updateTemplate backend procedure
- [x] Build deleteTemplate backend procedure
- [x] Build getTemplatesByCategory backend procedure
- [x] Build searchTemplates backend procedure
- [x] Build downloadTemplate backend procedure (increment counter)
- [x] Add template management tRPC endpoints
- [x] Create TemplateManager admin page component
- [x] Add template upload dialog
- [x] Add template category selector
- [x] Add template list with edit/delete
- [x] Add templates navigation to admin dashboard
- [x] Create storage upload endpoint
- [x] Create TemplateLibrary user page component
- [x] Add category filter
- [x] Add search functionality
- [ ] Add template preview (future enhancement)
- [x] Add download button with counter
- [x] Add templates navigation to admin dashboard
- [x] Add templates route for users
- [x] Test template upload
- [x] Test template download
- [x] Test usage statistics

## Template Version Management
- [x] Create template_versions table for version history
- [x] Add isLatest flag to track current version
- [x] Update file_templates to reference template_versions
- [x] Build uploadNewVersion backend procedure
- [x] Build getTemplateVersions backend procedure
- [x] Build setLatestVersion backend procedure (rollback)
- [x] Add version management tRPC endpoi- [x] Add "Upload New Version" button to TemplateManager
- [x] Create version history dialog component
- [x] Add version selector to TemplateLibrary (via version history dialog)
- [x] Show version number and upload date in UI
- [x] Test version upload
- [x] Test version download
- [x] Test version rollback
- [x] Test version history display

## Template Request Workflow
- [x] Create template_requests table with status tracking
- [x] Add requesterId, templateName, description, justification fields
- [x] Add status enum (pending, approved, rejected)
- [x] Add adminId and adminComment fields for approval
- [x] Build submitTemplateRequest backend procedure
- [x] Build getTemplateRequests backend procedure (admin)
- [x] Build getUserTemplateRequests backend procedure (user)
- [x] Build approveTemplateRequest backend procedure
- [x] Build rejectTemplateRequest backend procedure
- [x] Add template request tRPC endpoints
- [x] Create TemplateRequestForm user component
- [x] Add request button to TemplateLibrary page
- [x] Create MyTemplateRequests page for users
- [x] Add MyTemplateRequests route to App.tsx
- [x] Build TemplateRequestsManager admin component
- [x] Add requests tab to admin dashboard
- [x] Send email notification on status change (console logging implemented)
- [x] Test request submission
- [x] Test approval workflow
- [x] Test rejection workflow

## Create Template from Approved Request
- [x] Add createdFromRequestId field to file_templates table
- [x] Add "Create Template" button to approved requests
- [x] Implement pre-filled template upload dialog
- [x] Link created template back to request (via createdFromRequestId)
- [x] Test template creation from request

## Template Preview Thumbnails
- [x] Add thumbnailUrl field to file_templates schema
- [x] Add thumbnailUrl field to template_versions schema
- [x] Install pdf-lib or pdf-thumbnail package for PDF thumbnail generation
- [x] Create thumbnail generation service module
- [x] Generate thumbnails for PDFs (first page)
- [x] Generate thumbnails for Word documents (convert to PDF first, then thumbnail)
- [x] Upload thumbnails to S3 storage
- [x] Integrate thumbnail generation into template upload flow
- [x] Integrate thumbnail generation into version upload flow
- [x] Update TemplateLibrary to display thumbnails
- [x] Update TemplateManager to display thumbnails
- [x] Add fallback icons for templates without thumbnails
- [ ] Test thumbnail generation with various document types
