import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Send, Building2, ChevronLeft, Calendar, Clock, Video, CheckCircle, X, Filter } from 'lucide-react'
import { sendPushNotification } from '../../lib/pushNotifications';
import GoogleMeetModal from '../../components/VideoCall/GoogleMeetModal';
import styles from '../../styles/ApplicantInbox.module.css';

export default function ApplicantInbox() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingMeetingId, setPendingMeetingId] = useState(null)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmingPassword, setConfirmingPassword] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const bottomRef = useRef(null)
  
  // New filter states
  const [filter, setFilter] = useState('all')
  const [upcomingMeetings, setUpcomingMeetings] = useState([])
  const [pastMeetings, setPastMeetings] = useState([])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global message listener for new conversations
  useEffect(() => {
    if (!user) return

    // Subscribe to all new messages for this applicant
    const globalChannel = supabase
      .channel(`global-messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `applicant_id=eq.${user.id}`
      }, payload => {
        // Update conversations list to show new message
        fetchConversations()
        
        // Update unread count for the company
        const companyId = payload.new.company_id
        setUnreadCounts(prev => ({
          ...prev,
          [companyId]: (prev[companyId] || 0) + 1
        }))
        
        // Show browser notification if tab is not focused
        if (!document.hasFocus()) {
          showBrowserNotification(payload.new)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `applicant_id=eq.${user.id}`
      }, payload => {
        // Handle message read status updates
        if (payload.new.is_read && !payload.old.is_read) {
          setUnreadCounts(prev => ({
            ...prev,
            [payload.new.company_id]: Math.max(0, (prev[payload.new.company_id] || 0) - 1)
          }))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(globalChannel)
  }, [user])

  // Browser notification function
  function showBrowserNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New message from Zero Effort', {
        body: `You have a new message from ${message.companies?.name || 'a company'}`,
        icon: '/favicon.ico',
        tag: `message-${message.id}`,
        requireInteraction: true
      })
    }
  }

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Fetch all conversations (unique companies that messaged this applicant)
  async function fetchConversations() {
    if (!user) return
    
    try {
      setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select('*, companies(id, name, logo_url, logo_initials, color)')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) {
        // Group by company and calculate unread counts
        const grouped = {}
        const newUnreadCounts = {}
        
        data.forEach(msg => {
          const companyId = msg.company_id
          if (!grouped[companyId]) {
            grouped[companyId] = {
              company: msg.companies,
              lastMessage: msg,
              unreadCount: 0
            }
          }
          
          // Count unread messages from companies
          if (!msg.is_read && msg.sender_type === 'company') {
            grouped[companyId].unreadCount++
            newUnreadCounts[companyId] = (newUnreadCounts[companyId] || 0) + 1
          }
        })
        
        setConversations(Object.values(grouped))
        setUnreadCounts(newUnreadCounts)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvo) return
    
    const run = async () => {
      await fetchMessages()
      await markAsRead()
    };
    run();

    // Subscribe to realtime updates for this specific conversation
    const channel = supabase
      .channel(`messages-${user.id}-${selectedConvo.company.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `applicant_id=eq.${user.id}&company_id=eq.${selectedConvo.company.id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        markAsRead()
        scrollToBottom()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedConvo])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchMessages() {
    if (!selectedConvo || !user) return
    
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('applicant_id', user.id)
        .eq('company_id', selectedConvo.company.id)
        .order('created_at', { ascending: true })
        .limit(50)
      
      if (data) setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  async function markAsRead() {
    if (!selectedConvo || !user) return
    
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('applicant_id', user.id)
        .eq('company_id', selectedConvo.company.id)
        .eq('sender_type', 'company')
        .is('is_read', false)
      
      // Update unread count
      setUnreadCounts(prev => ({
        ...prev,
        [selectedConvo.company.id]: 0
      }))
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      company_id: selectedConvo.company.id,
      applicant_id: user.id,
      sender_type: 'applicant',
      content: newMessage.trim()
    })
    if (!error) {
      setNewMessage('')
      fetchMessages()
      fetchConversations()
      
      // Notify company
      sendPushNotification(
        selectedConvo.company.id,
        'company',
        'New Message 💬',
        `New message from applicant`,
        '/company/inbox'
      );
    }
    setSending(false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConvo || !user) return
    
    try {
      setSending(true)
      
      const messageData = {
        applicant_id: user.id,
        company_id: selectedConvo.company.id,
        sender_type: 'applicant',
        content: newMessage.trim(),
        is_read: false
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()
      
      if (error) throw error
      
      // Add message locally for immediate feedback
      setMessages(prev => [...prev, data])
      setNewMessage('')
      scrollToBottom()
      
      // Update conversations list
      fetchConversations()
      
      // Notify company
      await sendPushNotification(
        selectedConvo.company.id,
        'company',
        'New Message 💬',
        `${user?.user_metadata?.first_name || 'An applicant'}: ${newMessage.trim()}`,
        '/company/inbox'
      );
      
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Handle meeting response
  async function handleMeetingResponse(messageId, action) {
    try {
      // Update meeting status in the message content
      const { data: messageData } = await supabase
        .from('messages')
        .select('content')
        .eq('id', messageId)
        .single()
      
      if (messageData) {
        let updatedContent = messageData.content;
        if (action === 'accept') {
          updatedContent = messageData.content.replace('📅 Meeting Status: Pending', '📅 Meeting Status: ✅ Confirmed');
        } else if (action === 'decline') {
          updatedContent = messageData.content.replace('📅 Meeting Status: Pending', '📅 Meeting Status: ❌ Declined');
        }
        
        await supabase
          .from('messages')
          .update({ content: updatedContent })
          .eq('id', messageId);
        
        // Send response message
        const responseMessage = action === 'accept' 
          ? 'Thank you for the invitation! I have accepted the meeting and look forward to discussing this opportunity.'
          : 'Thank you for considering me. Unfortunately, I will not be able to attend the scheduled meeting.';
        
        await supabase.from('messages').insert({
          applicant_id: user.id,
          company_id: selectedConvo.company.id,
          sender_type: 'applicant',
          content: responseMessage
        });
        
        // Refresh messages
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error handling meeting response:', error)
    }
  }

  async function handlePasswordConfirm() {
    if (!confirmPassword.trim()) {
      setPasswordError('Please enter your password.')
      return
    }
    setConfirmingPassword(true)
    setPasswordError('')
    try {
      // Verify password by re-authenticating with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: confirmPassword
      })
      if (error) {
        setPasswordError('Incorrect password. Please try again.')
        setConfirmingPassword(false)
        return
      }
      // Password correct - proceed with acceptance
      setShowPasswordModal(false)
      setConfirmPassword('')
      await handleMeetingResponse(pendingMeetingId, 'accept')
      setPendingMeetingId(null)
    } catch (err) {
      setPasswordError('Verification failed. Please try again.')
    } finally {
      setConfirmingPassword(false)
    }
  }

  // Parse meeting details from message content
  function parseMeetingDetails(content) {
    const meetingDate = content.match(/📅 Meeting Date: ([^\n]+)/)?.[1];
    const meetingTime = content.match(/⏰ Meeting Time: ([^\n]+)/)?.[1];
    const meetingLink = content.match(/🔗 Meeting Link: ([^\n]+)/)?.[1];
    const meetingStatus = content.match(/📅 Meeting Status: ([^\n]+)/)?.[1];
    
    return { meetingDate, meetingTime, meetingLink, meetingStatus };
  }

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  const totalUnread = conversations.reduce((sum, c) => sum + (unreadCounts[c.company.id] || 0), 0)

  return (
    <div style={{ padding: '24px 24px 80px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '24px', marginBottom: '4px' }}>Inbox</h1>
      <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
        Messages from companies
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : (selectedConvo ? '280px 1fr' : '1fr'),
        gap: '16px',
        height: 'calc(100vh - 220px)'
      }}>
        {/* Conversation List */}
        {(!selectedConvo || !isMobile) && (
          <div style={{
            background: 'var(--surface)', borderRadius: '12px',
            border: '1px solid var(--border)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '14px' }}>
              Conversations {totalUnread > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'white',
                  borderRadius: '50%', width: '20px', height: '20px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', marginLeft: '8px'
                }}>{totalUnread}</span>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: '16px', color: 'var(--text2)', fontSize: '14px' }}>Loading...</div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text2)' }}>
                  <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '14px' }}>No messages yet</p>
                </div>
              ) : (
                conversations.map(convo => (
                  <div
                    key={convo.company.id}
                    onClick={() => setSelectedConvo(convo)}
                    style={{
                      padding: '14px 16px', cursor: 'pointer',
                      background: selectedConvo?.company.id === convo.company.id ? 'var(--bg2)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}
                  >
                    {/* Company Avatar */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: convo.company.logo_url ? 'transparent' : (convo.company.color || 'var(--accent)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', color: 'white',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {convo.company.logo_url ? (
                        <img src={convo.company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                      ) : (
                        convo.company.logo_initials || convo.company.name?.[0]
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{convo.company.name}</span>
                        {convo.unreadCount > 0 && (
                          <span style={{
                            background: 'var(--accent)', color: 'white',
                            borderRadius: '50%', width: '18px', height: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700
                          }}>{convo.unreadCount}</span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '12px', color: 'var(--text2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {convo.lastMessage.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Window */}
        {selectedConvo && (
          <div style={{
            background: 'var(--surface)', borderRadius: '12px',
            border: '1px solid var(--border)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <button onClick={() => setSelectedConvo(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text2)', display: 'flex', alignItems: 'center'
              }}>
                <ChevronLeft size={20} />
              </button>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: selectedConvo.company.logo_url ? 'transparent' : (selectedConvo.company.color || 'var(--accent)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '12px', color: 'white', overflow: 'hidden'
              }}>
                {selectedConvo.company.logo_url ? (
                  <img src={selectedConvo.company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                ) : (
                  selectedConvo.company.logo_initials || selectedConvo.company.name?.[0]
                )}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>{selectedConvo.company.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text2)' }}>HR Team</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              {messages.map(msg => (
                <div key={msg.id} style={{
                  alignSelf: msg.sender_type === 'applicant' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: msg.sender_type === 'applicant' ? 'var(--accent)' : 'var(--bg2)',
                    color: msg.sender_type === 'applicant' ? 'white' : 'var(--text)',
                    fontSize: '14px', lineHeight: '1.5'
                  }}>
                    {(() => {
                      const content = msg.content;
                      const meetingDetails = parseMeetingDetails(content);
                      
                      // Check if this message contains meeting details
                      if (meetingDetails.meetingLink) {
                        const mainMessage = content.split('\n\n📅 Meeting Date:')[0];
                        
                        return (
                          <div>
                            {/* Main message content */}
                            <p style={{ margin: '0 0 16px 0', whiteSpace: 'pre-line' }}>
                              {mainMessage}
                            </p>
                            
                            {/* Improved Meeting Card */}
                            <div className={styles.meetingCard}>
                              {/* Meeting Header */}
                              <div className={styles.meetingHeader}>
                                <div className={styles.companyInfo}>
                                  <div className={styles.companyName}>
                                    {selectedConvo?.company?.name || 'Company'}
                                  </div>
                                  <div className={styles.meetingStatus}>
                                    {meetingDetails.meetingStatus?.includes('✅') && (
                                      <span className={styles.statusConfirmed}>✅ Confirmed</span>
                                    )}
                                    {meetingDetails.meetingStatus?.includes('❌') && (
                                      <span className={styles.statusDeclined}>❌ Declined</span>
                                    )}
                                    {meetingDetails.meetingStatus?.includes('Pending') && (
                                      <span className={styles.statusPending}>⏳ Pending</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Meeting Details */}
                              <div className={styles.meetingDetails}>
                                {meetingDetails.meetingDate && (
                                  <div className={styles.meetingDetailRow}>
                                    <Calendar size={14} />
                                    <span>{meetingDetails.meetingDate}</span>
                                  </div>
                                )}
                                
                                {meetingDetails.meetingTime && (
                                  <div className={styles.meetingDetailRow}>
                                    <Clock size={14} />
                                    <span>{meetingDetails.meetingTime}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Meeting Actions */}
                              {meetingDetails.meetingStatus?.includes('✅') && meetingDetails.meetingLink && (
                                <div className={styles.meetingActions}>
                                  <button 
                                    onClick={() => setActiveCall({
                                      interviewId: msg.id,
                                      channelName: `interview_${msg.id}`,
                                      userRole: 'applicant',
                                      applicantEmail: user?.email || 'applicant@example.com',
                                      hrEmail: 'hr@' + (selectedConvo?.company?.name?.replace(/\s+/g, '').toLowerCase() || 'company') + '.com'
                                    })}
                                    className={styles.joinVideoBtn}
                                    aria-label="Join video call"
                                    title="Join video interview call"
                                  >
                                    <Video size={18} />
                                    🎥 Join Video Call
                                  </button>
                                  
                                  <a
                                    href={meetingDetails.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.joinMeetingBtn}
                                    aria-label="Join meeting link"
                                    title="Open meeting in new tab"
                                  >
                                    <Video size={16} />
                                    Join Meeting
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }
                      
                      // Regular message without meeting details
                      return <span style={{ whiteSpace: 'pre-line' }}>{content}</span>;
                    })()}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px',
                    textAlign: msg.sender_type === 'applicant' ? 'right' : 'left'
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: '8px', alignItems: 'center'
            }}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: '14px', outline: 'none'
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: sending || !newMessage.trim() ? 'var(--border)' : 'var(--accent)',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'white'
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '20px',
            padding: '28px', width: '100%', maxWidth: '380px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)', border: '2px solid #10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <CheckCircle size={24} color="#10b981" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '17px', margin: '0 0 6px' }}>
                Confirm Acceptance
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
                Enter your password to confirm you are accepting this meeting invitation.
              </p>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
                Your Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value)
                  setPasswordError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordConfirm()}
                placeholder="Enter your password..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: `1px solid ${passwordError ? '#ef4444' : 'var(--border)'}`,
                  background: 'var(--bg2)', color: 'var(--text)',
                  fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              {passwordError && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  {passwordError}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setConfirmPassword('')
                  setPasswordError('')
                  setPendingMeetingId(null)
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: '1px solid var(--border2)', background: 'var(--surface2)',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  color: 'var(--text)', fontFamily: 'inherit'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordConfirm}
                disabled={confirmingPassword || !confirmPassword.trim()}
                style={{
                  flex: 2, padding: '12px', borderRadius: '12px',
                  border: 'none',
                  background: confirmingPassword || !confirmPassword.trim() ? 'var(--border)' : '#10b981',
                  cursor: confirmingPassword || !confirmPassword.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: 700, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', fontFamily: 'inherit'
                }}
              >
                <CheckCircle size={15} />
                {confirmingPassword ? 'Verifying...' : 'Confirm Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCall && (
        <GoogleMeetModal
          interviewId={activeCall.interviewId}
          channelName={activeCall.channelName}
          userRole={activeCall.userRole}
          applicantEmail={activeCall.applicantEmail}
          hrEmail={activeCall.hrEmail}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  )
}
