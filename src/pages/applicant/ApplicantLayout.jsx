import { useState, useEffect, lazy, Suspense } from 'react';
import { useOutletContext, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';
import KimoelChatbot from '../../components/KimoelChatbot';
import IncomingCallModal from '../../components/VideoCall/IncomingCallModal';
import { subscribeToPush } from '../../lib/pushNotifications';

// Agora's SDK is ~1.5 MB; load it only when a call actually starts (keeps first load light on mobile data).
const AgoraVideoCall = lazy(() => import('../../components/AgoraVideoCall'));

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
      
      console.log('🔐 ApplicantLayout - Supabase session exists');
      
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

  // Open the ringing modal for a specific call when the applicant taps a push notification.
  // This works from the background (where the realtime websocket above is suspended) by
  // reading the call from the notification: either the ?call= URL param (app was closed)
  // or a message the service worker posts (app was already open).
  useEffect(() => {
    if (!user?.id) return;

    async function openCallByChannel(channel, from) {
      if (!channel) return;
      const { data: call } = await supabase
        .from('call_sessions')
        .select('id, channel_name, status')
        .eq('channel_name', channel)
        .eq('applicant_id', user.id)
        .eq('status', 'ringing')
        .maybeSingle();
      if (call) {
        setIncomingCall({
          interviewId: call.id,
          channelName: call.channel_name,
          hrName: 'HR Representative',
          companyName: from || 'Company',
        });
      }
    }

    // App was closed: opened fresh at /applicant/home?call=<channel>&from=<name>
    const params = new URLSearchParams(window.location.search);
    const callChannel = params.get('call');
    if (callChannel) {
      openCallByChannel(callChannel, params.get('from'));
      window.history.replaceState({}, '', window.location.pathname); // avoid re-popping on refresh
    }

    // App was already open: the service worker forwards the tapped call.
    const onSwMessage = (event) => {
      if (event.data && event.data.type === 'incoming-call') {
        openCallByChannel(event.data.channel, event.data.caller);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onSwMessage);
  }, [user?.id]);

  // iOS fallback: a tapped push just reopens the PWA and ignores the ?call= URL, so on
  // startup also ask the database directly for a recent ringing call and pop the modal.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: calls, error } = await supabase
        .from('call_sessions')
        .select('id, channel_name, status, created_at')
        .eq('applicant_id', user.id)
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !calls || !calls.length) return;
      const call = calls[0];
      // Only ring for calls started in the last 90s (ignore stale rows).
      const ageMs = Date.now() - new Date(call.created_at).getTime();
      if (ageMs < 90000) {
        setIncomingCall((prev) => prev || {
          interviewId: call.id,
          channelName: call.channel_name,
          hrName: 'HR Representative',
          companyName: 'Company',
        });
      }
    })();
  }, [user?.id]);

  // Call handlers
  const handleAcceptCall = async () => {
    // Mark the call active so reopening the app doesn't re-ring it.
    if (incomingCall?.interviewId) {
      await supabase
        .from('call_sessions')
        .update({ status: 'active' })
        .eq('id', incomingCall.interviewId);
    }
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
        <Suspense fallback={null}>
          <AgoraVideoCall
            channelName={activeCall.channelName}
            userRole="applicant"
            user={user}
            onClose={() => setActiveCall(null)}
          />
        </Suspense>
      )}
      
      <Outlet context={{ profile }} />
      <KimoelChatbot />
    </>
  );
}
