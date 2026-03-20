import { useState, useEffect } from 'react';
import { useOutletContext, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PortalNav from '../../components/PortalNav';
import LoadingOverlay from '../../components/LoadingOverlay';
import ZeloChatbot from '../../components/ZeloChatbot';
import IncomingCallModal from '../../components/VideoCall/IncomingCallModal';
import JitsiMeetModal from '../../components/VideoCall/JitsiMeetModal';
import { subscribeToPush } from '../../lib/pushNotifications';

export default function ApplicantLayout() {
  const { profile, checkSession, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userPhoto, setUserPhoto] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, [user, profile]);

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
  
  async function init() {
    if (!profile || profile.role !== 'applicant') {
      const session = await checkSession('applicant');
      if (!session) { navigate('/applicant/login'); return; }
    }
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
        <JitsiMeetModal
          interviewId={activeCall.interviewId}
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
