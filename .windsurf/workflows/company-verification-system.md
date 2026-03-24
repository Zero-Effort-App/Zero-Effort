---
description: Complete Company Verification System Setup and Management
---

# Company Verification System Workflow

This workflow covers the complete setup and management of the company verification system for Zero Effort Tech Park.

## 🎯 OVERVIEW

The company verification system allows businesses to submit verification documents (DTI, SEC, BIR, Mayor's Permit, etc.) for admin review. Verified companies receive a professional badge across the platform.

## 📋 PREREQUISITES

### Required Database Tables:
```sql
-- Add to existing companies table
ALTER TABLE companies 
ADD COLUMN verification_status TEXT DEFAULT 'unverified',
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN verification_notes TEXT,
ADD COLUMN verification_submitted_at TIMESTAMP,
ADD COLUMN verification_reviewed_at TIMESTAMP;

-- Create verification requests table
CREATE TABLE verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin users table (if not exists)
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Required Storage Setup:
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false);
```

## 🔧 SETUP STEPS

### Step 1: Create Admin Account
1. Go to Supabase Dashboard → Authentication → Users
2. Create admin user: `admin@zeroeffort.com`
3. Set password: `Admin@2025`
4. Enable auto-confirmation
5. Add to admin_users table:
```sql
INSERT INTO admin_users (email, password_hash, full_name, created_at)
VALUES ('admin@zeroeffort.com', 'supabase_managed', 'System Administrator', NOW());
```

### Step 2: Configure Storage
1. Create `verification-docs` bucket in Supabase Storage
2. Keep bucket private for security
3. Document viewing uses signed URLs (1-hour expiry)

### Step 3: Test Admin Access
1. Navigate to: `/admin/login`
2. Email: `admin@zeroeffort.com`
3. Password: `Admin@2025`
4. Should access admin dashboard

## 🏢 VERIFICATION WORKFLOW

### For Companies:
1. **Submit Documents**: Go to Company Profile → Verification section
2. **Upload Files**: Select document type and upload PDF/JPG/PNG (max 5MB)
3. **Track Status**: View current status (unverified, pending, verified, rejected)
4. **Resubmit**: If rejected, address issues and resubmit

### For Admins:
1. **Review Requests**: Go to Admin → Companies → Pending Verifications
2. **Preview Documents**: Click "View Document" (secure signed URL)
3. **Approve/Reject**: Review and take action
4. **Add Reasons**: Include rejection reasons if applicable

### Status Flow:
```
unverified → pending → verified
                ↓
             rejected → pending (resubmit)
```

## 🔒 SECURITY FEATURES

### Document Security:
- **Private Storage**: Documents stored in private bucket
- **Signed URLs**: Temporary access links (1-hour expiry)
- **Admin Authentication**: Only logged-in admins can view
- **No Public Exposure**: Documents never publicly accessible

### Access Control:
- **Role-Based**: Companies submit, admins review
- **Authentication Required**: All actions require login
- **Audit Trail**: All verification actions tracked
- **Secure Upload**: File type and size validation

## 🎨 UI INTEGRATION

### Verified Badge Display:
- **Admin Companies Table**: Next to company name
- **Company Profile Header**: Next to company name
- **Applicant Jobs Detail**: Next to company name
- **Applicant Companies Cards**: Next to company name

### Badge Styling:
- **Color**: Primary indigo (#6366f1)
- **Design**: Glassmorphism with border
- **Icon**: Lucide-react BadgeCheck
- **Sizes**: sm, md, lg options

## 🚀 DEPLOYMENT

### Frontend Implementation:
✅ Company Profile - Verification submission section
✅ Admin Dashboard - Review and management interface
✅ VerifiedBadge Component - Reusable badge component
✅ Badge Integration - Platform-wide display
✅ Secure Document Viewing - Signed URL access

### Database Requirements:
⏳ Verification columns in companies table
⏳ verification_requests table
⏳ admin_users table
⏳ verification-docs storage bucket

## 📊 MONITORING

### Admin Dashboard Features:
- **Pending Counter**: Shows number of pending requests
- **Request List**: Company info, document type, submission date
- **Quick Actions**: View, approve, reject buttons
- **Rejection Modal**: Collect rejection reasons

### Company Features:
- **Status Badges**: Visual status indicators
- **Document Upload**: Drag-and-drop interface
- **Progress Tracking**: Real-time status updates
- **History**: Previous verification attempts

## 🔧 TROUBLESHOOTING

### Common Issues:
1. **Admin Login Fails**: Check admin_users table and Supabase Auth user
2. **Document Viewing 404**: Ensure storage bucket exists and policies are set
3. **Upload Fails**: Check storage bucket permissions and file size limits
4. **Badge Not Showing**: Verify is_verified flag and component imports

### Debug Steps:
1. Check browser console for errors
2. Verify database tables exist
3. Confirm storage bucket is properly configured
4. Test admin authentication flow
5. Check file upload permissions

## 📋 MAINTENANCE

### Regular Tasks:
- **Review Pending Requests**: Daily admin review
- **Monitor Storage**: Check bucket usage and cleanup old files
- **Update Policies**: Review and update security policies as needed
- **User Support**: Help companies with verification issues

### Security Considerations:
- **Regular Access Reviews**: Audit admin access
- **Document Retention**: Clean up old verification documents
- **Policy Updates**: Maintain current security policies
- **Backup Procedures**: Ensure verification data is backed up

## 🎉 SUCCESS METRICS

### Completion Indicators:
- ✅ Companies can submit verification documents
- ✅ Admins can review and approve/reject requests
- ✅ Verified badges appear on platform
- ✅ Document viewing works securely
- ✅ All verification statuses function properly

### User Experience:
- **Companies**: Easy submission process, clear status tracking
- **Admins**: Efficient review workflow, secure document access
- **Applicants**: Trust indicators for verified businesses
- **Platform**: Professional verification system

---

## 🆕 RECENT UPDATES

### Security Enhancement (Latest):
- Implemented signed URL document viewing
- Documents remain in private bucket
- 1-hour URL expiry for security
- Fallback handling for access issues

### Previous Implementation:
- Complete verification workflow
- Admin dashboard integration
- Verified badge component
- Platform-wide badge display
