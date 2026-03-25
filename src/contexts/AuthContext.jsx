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
    console.log('🔄 [AUTH] Setting up Supabase auth listener');
    
    // Simple auth state change listener - let Supabase handle persistence
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [AUTH] Auth state change:', { event, hasUser: !!session?.user, userId: session?.user?.id });
      
      // Set user state and stop loading
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Load profile if user exists
      if (session?.user) {
        console.log('🔄 [PROFILE] Loading profile for user:', session.user.email);
        loadProfile(session.user.email);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
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

  const value = {
    user,
    profile,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
