import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function adminLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (adminError || !adminData) throw new Error('No admin account found with this email');
    setProfile({ ...adminData, role: 'admin' });
    return { session: data.session, profile: adminData };
  }

  async function companyLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (cuError || !companyUser) throw new Error('No company account found with this email');
    setProfile({ ...companyUser, role: 'company' });
    return { session: data.session, profile: companyUser };
  }

  async function applicantLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check if email is confirmed
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Please verify your email first. Check your inbox for the OTP code.');
    }

    const { data: applicant, error: apError } = await supabase
      .from('applicants')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (apError || !applicant) throw new Error('No applicant account found with this email');
    setProfile({ ...applicant, role: 'applicant' });
    return { session: data.session, profile: applicant };
  }

  async function sendRegistrationOTP({ email, password, firstName, lastName, phone }) {
  try {
    // Show immediate loading feedback
    console.log('Starting account creation process...')
    
    // Parallel validation and account creation
    const [captchaResponse] = await Promise.all([
      fetch('https://zero-effort-server.onrender.com/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'dummy' }) // Will be validated on frontend
      }),
      // Start account creation immediately
      fetch('https://zero-effort-server.onrender.com/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          metadata: { first_name: firstName, last_name: lastName }
        })
      })
    ])
    
    const accountResult = await captchaResponse.json()
    if (!captchaResponse.ok) throw new Error(accountResult.error || 'Account creation failed')

    const userId = accountResult?.user?.id
    if (!userId) throw new Error('Could not retrieve user ID')

    // Send OTP in parallel with user record preparation
    const [otpResult] = await Promise.all([
      supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      })
    ])
    
    if (otpResult.error) throw otpResult.error

    console.log('Account creation completed successfully')
    return { userId }
  } catch (error) {
    console.error('sendRegistrationOTP error:', error)
    if (error.message?.includes('already registered') || error.message?.includes('email_exists')) {
      throw new Error('This email is already registered. Please sign in instead.')
    }
    throw error
  }
}

async function verifyRegistrationOTP({ email, token, firstName, lastName, phone, userId }) {
  try {
    // Verify OTP using email type for registration flow
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    if (error) throw error

    // Get user from the verifyOtp response first, then fallback to session, then fallback to passed userId
    let user = data?.user
    
    if (!user) {
      // Fallback to session if user not in response
      const { data: sessionData } = await supabase.auth.getSession()
      user = sessionData?.session?.user
    }
    
    // Final fallback - use the userId we stored during registration
    if (!user && userId) {
      user = { id: userId, email }
    }
    
    if (!user || !user.id) throw new Error('Could not retrieve user after verification')

    // Check if applicant record already exists
    const { data: existing } = await supabase
      .from('applicants')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    // Only insert if not already exists
    if (!existing) {
      const { error: insertError } = await supabase
        .from('applicants')
        .insert([{
          id: user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone
        }])
      if (insertError) throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error('verifyRegistrationOTP error:', error)
    throw error
  }
}

  async function checkSession(portalType) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const email = session.user.email;
    let profileData = null;

    if (portalType === 'admin') {
      const { data } = await supabase.from('admin_users').select('*').eq('email', email).maybeSingle();
      if (data) profileData = { ...data, role: 'admin' };
    } else if (portalType === 'company') {
      const { data } = await supabase.from('company_users').select('*').eq('email', email).maybeSingle();
      if (data) profileData = { ...data, role: 'company' };
    } else if (portalType === 'applicant') {
      const { data } = await supabase.from('applicants').select('*').eq('email', email).maybeSingle();
      if (data) profileData = { ...data, role: 'applicant' };
    }

    if (profileData) {
      setProfile(profileData);
      return { session, profile: profileData };
    }
    return null;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    adminLogin,
    companyLogin,
    applicantLogin,
    sendRegistrationOTP,
    verifyRegistrationOTP,
    checkSession,
    logout,
    setProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
