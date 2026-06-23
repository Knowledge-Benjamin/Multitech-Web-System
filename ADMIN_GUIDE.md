# Admin Control Panel (CPanel) Documentation

## Overview

The Multitech Business School Admin Control Panel is a comprehensive content management system (CMS) that allows administrators to manage all aspects of the institution's online presence, including programmes, applications, announcements, and admin user accounts.

## Access & Authentication

### Admin Login
- **URL:** `http://localhost:5173/admin/login`
- **Default Credentials:**
  - Username: `admin`
  - Password: `admin123`

### Security Features
- JWT token-based authentication
- Role-based access control (Admin and Super Admin)
- Automatic token expiration after 7 days
- Password encryption with bcrypt
- Activity logging for all admin actions

## Admin Roles

### Admin
- Manage programmes (create, read, update, delete)
- Manage applications (view, update status, delete)
- Manage announcements (create, read, update, delete)
- Cannot create or manage other admin users
- Cannot view settings

### Super Admin
- All Admin permissions
- Create, update, and delete admin users
- View and manage admin settings
- Access activity logs
- Manage system configuration

## Dashboard

The main admin dashboard displays:

### Key Metrics
- **Total Programmes:** Number of active programmes
- **Total Applications:** Number of submitted applications
- **Total Announcements:** Number of published announcements
- **Admin Users:** Number of active admin accounts

### Recent Applications
A quick overview of the 5 most recent applications with:
- Applicant name and email
- Applied programme
- Application status
- Application date

### Quick Actions
- Navigate to manage each content type
- Quick links to all major admin sections

## Programme Management

### View Programmes
- Access from sidebar: **📚 Programmes**
- Displays all available programmes in a table format
- Shows: Name, Type, Level, Duration, Capacity, Tuition Fee

### Add New Programme
1. Click **+ Add Programme** button
2. Fill in programme details:
   - **Name** (required): Programme title
   - **Type** (required): Choose from Undergraduate, Postgraduate, Diploma, Professional
   - **Level** (required): e.g., Bachelor, Master, Diploma, Certificate
   - **Description:** Full programme details
   - **Duration:** e.g., "3 years", "2 semesters"
   - **Capacity:** Maximum number of students
   - **Tuition Fee:** Annual or total fee
3. Click **Create Programme**

### Edit Programme
1. Click **Edit** button on the programme row
2. Update desired fields
3. Click **Update Programme**

### Delete Programme
1. Click **Delete** button on the programme row
2. Confirm deletion

## Application Management

### View Applications
- Access from sidebar: **📋 Applications**
- Filter applications by status:
  - **All:** Show all applications
  - **Submitted:** Newly submitted applications
  - **Under Review:** Currently being reviewed
  - **Accepted:** Approved applicants
  - **Rejected:** Not accepted applicants

### Application Details
Each application card displays:
- Applicant name and contact information
- Email address and phone number
- Applied programme ID
- Application submission date
- Qualifications and additional information
- Current application status

### Update Application Status
1. Click **Update Status** on the application card
2. Choose new status:
   - Submitted (initial state)
   - Under Review (currently evaluating)
   - Accepted (approved)
   - Rejected (not approved)
3. Status updates immediately
4. Automated notifications can be sent (future feature)

### Delete Application
1. Click **Delete** button
2. Confirm deletion (permanent action)

## Announcement Management

### View Announcements
- Access from sidebar: **📢 Announcements**
- Displays all announcements in a card grid format
- Shows: Title, Publication Status, Campus, Date

### Create Announcement
1. Click **+ New Announcement** button
2. Fill in announcement details:
   - **Title** (required): Announcement headline
   - **Content** (required): Full announcement text
   - **Campus:** Select target campus (Kampala, Jinja, or All)
   - **Published:** Toggle to publish immediately or keep as draft
3. Click **Create Announcement**

### Edit Announcement
1. Click **Edit** on the announcement card
2. Update fields as needed
3. Click **Update Announcement**

### Delete Announcement
1. Click **Delete** button
2. Confirm deletion

### Publication Status
- **Published:** Visible to public on website
- **Draft:** Only visible in admin panel, not displayed to users

## Admin Settings (Super Admin Only)

### Access Settings
- Click **⚙️ Settings** in the sidebar (Super Admin only)
- Two tabs: "Admin Users" and "Activity Logs"

### Manage Admin Users

#### View Admin Users
- Table showing all admin users with:
  - Username
  - Email address
  - Role (Admin or Super Admin)
  - Status (Active or Inactive)
  - Account creation date

#### Create New Admin User
1. Click **+ Add Admin User** button
2. Fill in details:
   - **Username** (required): Unique login name
   - **Email** (required): Valid email address
   - **Password** (required): Strong password (min 8 characters recommended)
   - **Role:** Choose Admin or Super Admin
3. Click **Create Admin**

#### Delete Admin User
1. Click **Delete** button next to the admin
2. Confirm deletion
3. **Note:** Cannot delete the last Super Admin account

### Activity Logs

#### View Activity History
- Timeline of all admin actions
- Each log entry shows:
  - **Timestamp:** Date and time of action
  - **Admin:** Username who performed action
  - **Action:** Type of action (login, create, update, delete)
  - **Entity:** What was affected (programme, application, etc.)

#### Log Information
- Helps track content changes
- Security audit trail
- User accountability
- Can export for compliance

## Dashboard Statistics

The dashboard provides real-time statistics:

### Key Performance Indicators
- Active programmes count
- Pending applications
- Published announcements
- Total admin users

### Status Breakdown
Applications are tracked by status:
- New submissions
- Currently under review
- Accepted candidates
- Rejected applications

## Navigation

### Sidebar Menu (Always Visible in Admin Area)
- **📊 Dashboard:** Main overview
- **📚 Programmes:** Manage academic programmes
- **📋 Applications:** Review student applications
- **📢 Announcements:** Create and manage announcements
- **⚙️ Settings:** Admin management (Super Admin only)
- **🚪 Logout:** Exit admin panel

## Security Best Practices

1. **Change Default Password**
   - Immediately change the default admin password
   - Use strong passwords (mix of upper, lower, numbers, symbols)

2. **Protect Admin Credentials**
   - Never share login credentials
   - Use individual admin accounts (don't share)

3. **Regular Backups**
   - Database is automatically backed up by Neon
   - Verify backup status regularly

4. **Activity Monitoring**
   - Review activity logs regularly
   - Monitor for suspicious activities
   - Check login records

5. **Account Management**
   - Disable unused admin accounts
   - Remove admin access when staff leave
   - Maintain current admin list

## Common Tasks

### Publishing a New Programme
1. Go to **Programmes** section
2. Click **+ Add Programme**
3. Enter all programme details
4. Click **Create Programme**
5. Programme is immediately available to students

### Processing Applications
1. Go to **Applications**
2. Use status filters to view pending applications
3. Review applicant information
4. Click **Update Status** to review or accept
5. Update status accordingly

### Announcing Important News
1. Go to **Announcements**
2. Click **+ New Announcement**
3. Write announcement content
4. Select **Published** checkbox
5. Click **Create Announcement**
6. Announcement appears on homepage

### Adding New Admin
1. Go to **Settings** (Super Admin only)
2. Click **+ Add Admin User**
3. Enter credentials and select role
4. Click **Create Admin**
5. Share credentials securely with new admin

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token
- `GET /api/auth/dashboard/stats` - Get dashboard statistics

### Programmes (Admin Only - POST, PUT, DELETE)
- `GET /api/programmes` - List all programmes
- `GET /api/programmes/:id` - Get single programme
- `POST /api/programmes` - Create programme
- `PUT /api/programmes/:id` - Update programme
- `DELETE /api/programmes/:id` - Delete programme

### Applications (Admin Only - PUT, DELETE)
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get single application
- `POST /api/applications` - Submit application (public)
- `PUT /api/applications/:id/status` - Update application status
- `DELETE /api/applications/:id` - Delete application

### Announcements (Admin Only - POST, PUT, DELETE)
- `GET /api/announcements` - List announcements
- `GET /api/announcements/:id` - Get single announcement
- `POST /api/announcements` - Create announcement
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

### Admin Management (Super Admin Only)
- `GET /api/admin/users` - List admin users
- `GET /api/admin/users/:id` - Get admin details
- `POST /api/admin/users` - Create admin user
- `PUT /api/admin/users/:id` - Update admin user
- `DELETE /api/admin/users/:id` - Delete admin user
- `GET /api/admin/logs` - View activity logs

## Troubleshooting

### Cannot Login
- Verify username and password
- Check if admin account is active (not disabled)
- Ensure backend server is running
- Check network connectivity

### Cannot Create Content
- Verify you have admin role (check sidebar for ⚙️ Settings access)
- Ensure all required fields are filled
- Check browser console for error messages
- Clear browser cache and try again

### Changes Not Saving
- Verify admin token hasn't expired (logout and login again)
- Check if database is accessible
- Verify backend server is running
- Check network connectivity

### Performance Issues
- Clear browser cache
- Try using incognito/private browsing mode
- Close unnecessary browser tabs
- Restart browser and server

## Support

For technical issues:
1. Check this documentation
2. Review error messages in browser console (F12)
3. Check backend server logs
4. Contact system administrator

## Data Backup & Recovery

### Automatic Backups
- Database is automatically backed up by Neon Cloud
- Backups retained for 7 days
- Multiple redundant copies maintained

### Manual Backups
Can be configured by system administrator for additional protection

### Recovery Process
Contact database administrator or Neon support for data recovery

## Future Enhancements

Planned features for the admin panel:
- Email notifications for new applications
- Application review workflow
- Student progress tracking
- Course scheduling interface
- Report generation
- Staff directory management
- Payment processing integration
- SMS notifications
- Multi-language support
