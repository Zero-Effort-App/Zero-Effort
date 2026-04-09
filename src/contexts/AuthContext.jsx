import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Step 1: Explicitly check for existing session on app load
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('� [AUTH INIT] getSession result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error 
        });

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            loadProfile(session.user.email);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ [AUTH INIT] getSession failed:', err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Step 2: Also listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [AUTH CHANGE]', event, session?.user?.id ?? 'null');
      
      // Only process AFTER initial load is done
      if (!mounted) return;
      
      if (event === 'SIGNED_IN') {
        setUser(session.user);
        loadProfile(session.user.email);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED') {
        setUser(session.user);
      }
    });

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (email) => {
    try {
      // Check if admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (adminData) {
        console.log('✅ [PROFILE] Admin profile found');
        setProfile({ ...adminData, role: 'admin' });
        return;
      }

      // Check if company user
      const { data: companyData } = await supabase
        .from('company_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (companyData) {
        console.log('✅ [PROFILE] Company profile found');
        setProfile({ ...companyData, role: 'company' });
        return;
      }

      // Check if applicant
      const { data: applicantData } = await supabase
        .from('applicants')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (applicantData) {
        console.log('✅ [PROFILE] Applicant profile found');
        setProfile({ ...applicantData, role: 'applicant' });
        return;
      }

      console.log('❌ [PROFILE] No profile found for user');
      setProfile(null);
    } catch (error) {
      console.log('❌ [PROFILE] Profile loading error:', error);
      setProfile(null);
    }
  };

  const logout = async () => {
    console.log('🚪 [AUTH] Logging out user');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Login functions for different user types
  const adminLogin = async (email, password) => {
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
  };

  const companyLogin = async (email, password) => {
    console.log(' attempting login for:', email);
    console.log(' password length:', password?.length);
    
    // For company accounts, try to bypass email confirmation
    let { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password,
      options: {
        // Skip email verification for company accounts
        skipEmailConfirmation: true
      }
    });
    
    console.log(' signInWithPassword result:', { 
      hasData: !!data, 
      hasUser: !!data?.user, 
      hasSession: !!data?.session,
      error: error?.message,
      errorCode: error?.status 
    });
    
    // If still getting email not confirmed error, try the regular method
    if (error && error.message === 'Email not confirmed') {
      console.log('Email confirmation bypass failed, trying regular login...');
      
      // Try regular login as fallback
      const fallbackResult = await supabase.auth.signInWithPassword({ email, password });
      data = fallbackResult.data;
      error = fallbackResult.error;
      
      console.log('Fallback login result:', { 
        hasData: !!data, 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        error: error?.message
      });
    }
    
    if (error) {
      console.error('Login error details:', error);
      throw error;
    }

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (cuError || !companyUser) throw new Error('No company account found with this email');
    setProfile({ ...companyUser, role: 'company' });
    return { session: data.session, profile: companyUser };
  };

  const applicantLogin = async (email, password) => {
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
  };

  const sendRegistrationOTP = async ({ email, password, firstName, lastName, phone }) => {
    try {
      console.log('📧 sendRegistrationOTP called with:', { email, passwordLength: password.length, firstName, lastName, phone });
      
      // Create account directly (no CAPTCHA needed)
      const accountResponse = await fetch('https://zero-effort-server.onrender.com/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          metadata: { first_name: firstName, last_name: lastName }
        })
      });
      
      const accountResult = await accountResponse.json();
      console.log('💾 Account creation response:', accountResult);
      
      if (!accountResponse.ok) {
        console.error('❌ Account creation failed:', accountResult);
        throw new Error(accountResult.error || 'Account creation failed');
      }

      const userId = accountResult?.user?.id;
      if (!userId) {
        console.error('❌ No user ID returned:', accountResult);
        throw new Error('Could not retrieve user ID');
      }
      
      console.log('✅ User created with ID:', userId);

      // Send OTP for email verification
      const otpResult = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });
      
      console.log('📧 OTP result:', otpResult);
      
      if (otpResult.error) {
        console.error('❌ OTP error:', otpResult.error);
        throw otpResult.error;
      }

      return { userId };
    } catch (error) {
      console.error('❌ sendRegistrationOTP full error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      if (error.message?.includes('already registered') || error.message?.includes('email_exists')) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      throw error;
    }
  };

  const verifyRegistrationOTP = async ({ email, token, firstName, lastName, phone, userId }) => {
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
  };

  const checkSession = async (portalType) => {
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
  };

  const value = {
    user,
    profile,
    loading,
    logout,
    adminLogin,
    companyLogin,
    applicantLogin,
    sendRegistrationOTP,
    verifyRegistrationOTP,
    checkSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
