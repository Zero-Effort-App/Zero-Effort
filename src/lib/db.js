import { supabase } from './supabase';

// ── HELPERS ──
export function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── COMPANIES ──
export async function getCompanies(activeOnly = false) {
  let query = supabase.from('companies').select('*').order('name');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addCompany(companyData) {
  const { data, error } = await supabase.from('companies').insert([companyData]).select().single();
  if (error) throw error;
  return data;
}

export async function updateCompany(companyId, updateData) {
  const { data, error } = await supabase.from('companies').update(updateData).eq('id', companyId).select().single();
  if (error) throw error;
  return data;
}

export async function removeCompany(companyId) {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) throw error;
}

export async function getCompanyProfile(companyId) {
  const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
  if (error) throw error;
  return data;
}

// ── JOBS ──
export async function getJobs(activeOnly = false) {
  let query = supabase.from('jobs').select('*, companies(name, logo_initials, color, industry)').order('posted_at', { ascending: false });
  if (activeOnly) query = query.eq('status', 'active');
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getJobById(jobId) {
  const { data, error } = await supabase.from('jobs').select('*, companies(name, logo_initials, color, industry)').eq('id', jobId).single();
  if (error) throw error;
  return data;
}

export async function addJob(jobData) {
  const { data, error } = await supabase.from('jobs').insert([jobData]).select().single();
  if (error) throw error;
  return data;
}

export async function updateJob(jobId, updateData) {
  const { data, error } = await supabase.from('jobs').update(updateData).eq('id', jobId).select().single();
  if (error) throw error;
  return data;
}

export async function removeJob(jobId) {
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) throw error;
}

export async function getCompanyJobs(companyId) {
  const { data, error } = await supabase.from('jobs').select('*').eq('company_id', companyId).order('posted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── EVENTS ──
export async function getEvents(upcomingOnly = false) {
  let query = supabase.from('events').select('*').order('date', { ascending: true });
  if (upcomingOnly) query = query.gte('date', new Date().toISOString());
  const { data, error } = await query;
  if (error) throw error;
  
  // Convert details array back to string for display compatibility
  return data?.map(event => ({
    ...event,
    description: event.details ? event.details.join(', ') : ''
  })) || [];
}

export async function addEvent(eventData) {
  // Convert description to details array for database
  const eventDataForDb = {
    ...eventData,
    details: eventData.description 
      ? eventData.description.split(',').map(d => d.trim()).filter(Boolean)
      : []
  };
  delete eventDataForDb.description;
  
  const { data, error } = await supabase.from('events').insert([eventDataForDb]).select().single();
  if (error) throw error;
  return data;
}

export async function updateEvent(eventId, updateData) {
  // Convert description to details array for database if present
  const updateDataForDb = { ...updateData };
  if (updateData.description) {
    updateDataForDb.details = updateData.description.split(',').map(d => d.trim()).filter(Boolean);
    delete updateDataForDb.description;
  }
  
  const { data, error } = await supabase.from('events').update(updateDataForDb).eq('id', eventId).select().single();
  if (error) throw error;
  return data;
}

export async function removeEvent(eventId) {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

// ── ACTIVITY LOG ──
export async function getActivityLog(limit = 50) {
  const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getCompanyActivityLog(companyId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []

  } catch (error) {
    console.error('getCompanyActivityLog error:', error)
    throw error
  }
}

export async function addActivityLog(type, icon, message, subText, companyId = null) {
  const logData = { type, icon, message, sub_text: subText };
  if (companyId) logData.company_id = companyId;
  
  const { error } = await supabase.from('activity_log').insert([logData]);
  if (error) throw error;
}

// ── APPLICATIONS ──
export async function submitApplication(applicationData) {
  const { data, error } = await supabase.from('applications').insert([applicationData]).select().single();
  if (error) throw error;
  return data;
}

export async function getMyApplications(applicantId) {
  const { data, error } = await supabase
    .from('applications')
    .select('*, jobs(title, company_id, companies(name, logo_initials, color))')
    .eq('applicant_id', applicantId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getApplicationsByJob(jobId) {
  const { data, error } = await supabase
    .from('applications')
    .select('*, applicants(first_name, last_name, email, phone)')
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCompanyApplications(companyId) {
  try {
    // First get all job IDs belonging to this company
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', companyId)

    if (jobsError) throw jobsError
    if (!jobs || jobs.length === 0) return []

    const jobIds = jobs.map(j => j.id)

    // Then get applications for those jobs with applicant and job details
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        applicants(first_name, last_name, email, phone, photo_url),
        jobs(title, company_id, department, type)
      `)
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false })

    if (error) throw error
    return data || []

  } catch (error) {
    console.error('getCompanyApplications error:', error)
    throw error
  }
}

export async function updateApplicationStatus(applicationId, status) {
  const { data, error } = await supabase.from('applications').update({ status }).eq('id', applicationId).select().single();
  if (error) throw error;
  return data;
}

// ── COMPANY USERS ──
export async function getCompanyUserByEmail(email) {
  const { data, error } = await supabase.from('company_users').select('*').eq('email', email).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function checkCompanyAccountExists(companyId) {
  const { data, error } = await supabase.from('company_users').select('id').eq('company_id', companyId);
  if (error) throw error;
  return data && data.length > 0;
}

// ── ADMIN USERS ──
export async function getAdminUsers() {
  const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addAdminUser(email, fullName) {
  const { data, error } = await supabase.from('admin_users').insert([{ email, full_name: fullName, password_hash: 'hash_stored_in_auth' }]).select().single();
  if (error) throw error;
  return data;
}

export async function removeAdminUser(adminId) {
  const { error } = await supabase.from('admin_users').delete().eq('id', adminId);
  if (error) throw error;
}

// ── FILE UPLOADS ──
export async function uploadFile(file, bucket, applicantId) {
  // Fix bucket name capitalization
  const bucketName = bucket === 'resumes' ? 'Resumes' : 
                     bucket === 'portfolios' ? 'Portfolios' : bucket
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${applicantId}-${Date.now()}.${fileExt}`; 
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })
  
  if (error) throw error
  
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);
  
  return urlData.publicUrl
}

export async function uploadCompanyLogo(file, companyId) {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `company-${companyId}-${Date.now()}.${fileExt}` 

    const { error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('uploadCompanyLogo error:', error)
    throw error
  }
}

export async function getRecentHires(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        applicants(first_name, last_name),
        jobs(title, companies(name))
      `)
      .eq('status', 'accepted')
      .order('applied_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('getRecentHires error:', error)
    return []
  }
}

// ── LIVE STATS ──
export async function getLiveStats() {
  const [companies, jobs, applications, events] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact' }),
    supabase.from('jobs').select('id', { count: 'exact' }),
    supabase.from('applications').select('id', { count: 'exact' }),
    supabase.from('events').select('id', { count: 'exact' }),
  ]);
  return {
    totalCompanies: companies.count || 0,
    totalJobs: jobs.count || 0,
    totalApplications: applications.count || 0,
    totalEvents: events.count || 0,
  };
}
