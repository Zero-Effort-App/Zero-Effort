import { useState, useEffect } from 'react';
import { useOutletContext, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';
import ZeloChatbot from '../../components/ZeloChatbot';
import IncomingCallModal from '../../components/VideoCall/IncomingCallModal';
import AgoraVideoCall from '../../components/AgoraVideoCall';
import { subscribeToPush } from '../../lib/pushNotifications';

export default function ApplicantLayout() {
  const { profile, checkSession, user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userPhoto, setUserPhoto] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    validateSession();
  }, [user, profile, showToast]);

  async function loadApplicantData() {
    if (!user) return
    const { data } = await supabase
      .from('applicants')
      .select('first_name, last_name, photo_url')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      setUserPhoto(data.photo_url || '')
    }
  }
  
  async function validateSession() {
    try {
      console.log('🔐 ApplicantLayout - Validating session...');
      
      // FALLBACK 1: Check Supabase session directly
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🔐 ApplicantLayout - No Supabase session, redirecting to login');
        navigate('/applicant/login');
        return;
      }
      
      console.log('🔐 ApplicantLayout - Supabase session exists for:', session.user.email);
      
      // FALLBACK 2: If AuthContext profile not loaded yet, wait for it
      if (!profile) {
        console.log('🔐 ApplicantLayout - Waiting for profile to load...');
        // Give AuthContext 2 seconds to load profile
        setTimeout(() => {
          if (!profile) {
            console.warn('⚠️ ApplicantLayout - Profile failed to load, but Supabase session exists');
            // Don't redirect - user is authenticated even without profile
            setLoading(false);
            if (user?.id) {
              console.log('📲 Subscribing to push for user:', user.id);
              subscribeToPush(user.id, 'applicant');
            }
          } else {
            console.log('🔐 ApplicantLayout - Profile loaded successfully:', profile.role);
            if (profile.role !== 'applicant') {
              console.log('🔐 ApplicantLayout - Wrong role, redirecting to login');
              navigate('/applicant/login');
            } else {
              // Profile loaded correctly, continue with data loading
              loadApplicantDataAndFinish();
            }
          }
        }, 2000);
        return;
      }
      
      // FALLBACK 3: Verify correct role
      if (profile.role !== 'applicant') {
        console.log('🔐 ApplicantLayout - Wrong role, redirecting to login');
        navigate('/applicant/login');
        return;
      }
      
      console.log('🔐 ApplicantLayout - All checks passed, loading applicant data');
      // All checks passed, load applicant data
      loadApplicantDataAndFinish();
    } catch (error) {
      console.error('❌ ApplicantLayout - Session validation error:', error);
      // Network error - check Supabase session instead
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('🔐 ApplicantLayout - No fallback session, redirecting to login');
          navigate('/applicant/login');
        } else {
          console.log('🔐 ApplicantLayout - Fallback session exists, allowing access');
          // Has session but error checking profile - allow access
          setLoading(false);
          if (user?.id) {
            console.log('📲 Subscribing to push for user:', user.id);
            subscribeToPush(user.id, 'applicant');
          }
        }
      } catch (fallbackError) {
        console.error('❌ ApplicantLayout - Fallback session check failed:', fallbackError);
        navigate('/applicant/login');
      }
    }
  }
  
  async function loadApplicantDataAndFinish() {
    if (user) {
      await loadApplicantData()
    }
    setLoading(false);
    
    if (user?.id) {
      console.log('📲 Subscribing to push for user:', user.id);
      subscribeToPush(user.id, 'applicant');
    }
  }

  // Global incoming call listener
  useEffect(() => {
    if (!user?.id) return;
    console.log('🔔 Global listener active for user:', user.id);

    const subscription = supabase
      .channel('incoming_calls_' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions'
          // NO filter for now - catch ALL inserts to test
        },
        (payload) => {
          console.log('📞 ANY CALL DETECTED!', payload.new);
          // Only process if it's for this user
          if (payload.new.applicant_id === user.id) {
            console.log('📞 CALL IS FOR ME!', payload.new);
            setIncomingCall({
              interviewId: payload.new.id,
              channelName: payload.new.channel_name,
              hrName: 'HR Representative',
              companyName: 'Company'
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Global realtime status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  // Call handlers
  const handleAcceptCall = () => {
    setActiveCall(incomingCall);
    setIncomingCall(null);
  };

  const handleDeclineCall = async () => {
    if (incomingCall?.interviewId) {
      await supabase
        .from('call_sessions')
        .update({ status: 'declined' })
        .eq('id', incomingCall.interviewId);
    }
    setIncomingCall(null);
  };

  if (loading) return <LoadingOverlay show />;

  const initials = profile
    ? `${(profile.first_name || '?')[0]}${(profile.last_name || '?')[0]}`.toUpperCase()
    : 'AP';
  const displayName = profile ? `${profile.first_name} ${(profile.last_name || '')[0]}.` : 'User';

  const links = [
    { path: '/applicant/home', label: 'Home' },
    { path: '/applicant/jobs', label: 'Browse Jobs' },
    { path: '/applicant/companies', label: 'Companies' },
    { path: '/applicant/applications', label: 'My Applications' },
    { path: '/applicant/inbox', label: 'Inbox' },
    { path: '/applicant/events', label: 'Events' },
  ];

  return (
    <>
      <PortalNav
        portalTag={null}
        links={links}
        userInitials={initials}
        userName={displayName}
        companyLogo={null}
        userPhoto={userPhoto}
      />
      
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.hrName}
          companyName={incomingCall.companyName}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {activeCall && !incomingCall && (
        <AgoraVideoCall
          channelName={activeCall.channelName}
          userRole="applicant"
          user={user}
          onClose={() => setActiveCall(null)}
        />
      )}
      
      <Outlet context={{ profile }} />
      <ZeloChatbot />
    </>
  );
}
