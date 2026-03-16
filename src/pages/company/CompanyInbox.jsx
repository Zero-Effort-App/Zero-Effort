import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Send, ChevronLeft, Video } from 'lucide-react'

export default function CompanyInbox() {
  const { company } = useOutletContext()
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const bottomRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!company) return
    fetchConversations()
  }, [company])

  async function fetchConversations() {
    const { data } = await supabase
      .from('messages')
      .select('*, applicants(id, first_name, last_name, photo_url)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })

    if (data) {
      const grouped = {}
      data.forEach(msg => {
        if (!msg.applicants) return // skip if no applicant data
        const applicantId = msg.applicant_id
        if (!grouped[applicantId]) {
          grouped[applicantId] = {
            applicant: msg.applicants,
            lastMessage: msg,
            unreadCount: 0
          }
        }
        if (!msg.is_read && msg.sender_type === 'applicant') {
          grouped[applicantId].unreadCount++
        }
      })
      setConversations(Object.values(grouped))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedConvo) return
    fetchMessages()

    const channel = supabase
      .channel(`company-messages-${company.id}-${selectedConvo.applicant.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `company_id=eq.${company.id}` 
      }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [selectedConvo])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('company_id', company.id)
      .eq('applicant_id', selectedConvo.applicant.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function handleSend() {
    if (!newMessage.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      company_id: company.id,
      applicant_id: selectedConvo.applicant.id,
      sender_type: 'company',
      content: newMessage.trim()
    })
    if (!error) {
      setNewMessage('')
      fetchMessages()
      fetchConversations()
    }
    setSending(false)
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div style={{ padding: '24px 24px 80px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '24px', marginBottom: '4px' }}>Inbox</h1>
      <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
        Messages from applicants
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedConvo && !isMobile ? '280px 1fr' : '1fr',
        gap: '16px',
        height: 'calc(100vh - 220px)'
      }}>
        {(!isMobile || !selectedConvo) && (
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
                conversations.filter(convo => convo.applicant).map(convo => (
                  <div
                    key={convo.applicant.id}
                    onClick={() => setSelectedConvo(convo)}
                    style={{
                      padding: '14px 16px', cursor: 'pointer',
                      background: selectedConvo?.applicant.id === convo.applicant.id ? 'var(--bg2)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', color: 'white',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {convo.applicant.photo_url ? (
                        <img src={convo.applicant.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        `${convo.applicant.first_name?.[0] || ''}${convo.applicant.last_name?.[0] || ''}` 
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          {convo.applicant.first_name} {convo.applicant.last_name}
                        </span>
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

        {(!isMobile || selectedConvo) && (
          <div style={{
            background: 'var(--surface)', borderRadius: '12px',
            border: '1px solid var(--border)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            {selectedConvo ? (
              <>
                <div style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  {isMobile && (
                    <button onClick={() => setSelectedConvo(null)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text2)', display: 'flex', alignItems: 'center'
                    }}>
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '12px', color: 'white', overflow: 'hidden'
                  }}>
                    {selectedConvo.applicant.photo_url ? (
                      <img src={selectedConvo.applicant.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      `${selectedConvo.applicant.first_name?.[0] || ''}${selectedConvo.applicant.last_name?.[0] || ''}` 
                    )}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>
                      {selectedConvo.applicant.first_name} {selectedConvo.applicant.last_name}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text2)' }}>Applicant</p>
                  </div>
                </div>

                <div style={{
                  flex: 1, overflowY: 'auto', padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{
                      alignSelf: msg.sender_type === 'company' ? 'flex-end' : 'flex-start',
                      maxWidth: '70%'
                    }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: '12px',
                        background: msg.sender_type === 'company' ? 'var(--accent)' : 'var(--bg2)',
                        color: msg.sender_type === 'company' ? 'white' : 'var(--text)',
                        fontSize: '14px', lineHeight: '1.5'
                      }}>
                        {(() => {
                          const content = msg.content;
                          const meetingLinkMatch = content.match(/📅 Meeting Link: (https?:\/\/[^\s]+)/);
                          if (meetingLinkMatch) {
                            const textPart = content.replace(/\n\n📅 Meeting Link: https?:\/\/[^\s]+/, '');
                            const link = meetingLinkMatch[1];
                            return (
                              <>
                                <p style={{ margin: '0 0 10px 0' }}>{textPart}</p>
                                <a href={link} target="_blank" rel="noopener noreferrer"
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'white', color: 'var(--accent)',
                                    padding: '8px 12px', borderRadius: '8px',
                                    textDecoration: 'none', fontSize: '13px', fontWeight: 600,
                                    width: 'fit-content'
                                  }}>
                                  📅 Join Meeting
                                </a>
                              </>
                            );
                          }
                          return <span>{content}</span>;
                        })()}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px',
                        textAlign: msg.sender_type === 'company' ? 'right' : 'left'
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

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
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text2)' }}>
                <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '14px' }}>Select a conversation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
