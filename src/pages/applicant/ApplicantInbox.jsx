import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { MessageCircle, Send, Building2, ChevronLeft } from 'lucide-react'

export default function ApplicantInbox() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  // Fetch all conversations (unique companies that messaged this applicant)
  useEffect(() => {
    if (!user) return
    fetchConversations()
  }, [user])

  async function fetchConversations() {
    const { data } = await supabase
      .from('messages')
      .select('*, companies(id, name, logo_url, logo_initials, color)')
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      // Group by company
      const grouped = {}
      data.forEach(msg => {
        const companyId = msg.company_id
        if (!grouped[companyId]) {
          grouped[companyId] = {
            company: msg.companies,
            lastMessage: msg,
            unreadCount: 0
          }
        }
        if (!msg.is_read && msg.sender_type === 'company') {
          grouped[companyId].unreadCount++
        }
      })
      setConversations(Object.values(grouped))
    }
    setLoading(false)
  }

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvo) return
    const run = async () => {
      await fetchMessages()
      await markAsRead()
    };
    run();

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages-${user.id}-${selectedConvo.company.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `applicant_id=eq.${user.id}` 
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        const markRead = async () => {
          await markAsRead()
        };
        markRead();
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
      .eq('applicant_id', user.id)
      .eq('company_id', selectedConvo.company.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function markAsRead() {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('applicant_id', user.id)
      .eq('company_id', selectedConvo.company.id)
      .eq('sender_type', 'company')
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
    }
    setSending(false)
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontWeight: 800, fontSize: '24px', marginBottom: '4px' }}>Inbox</h1>
      <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
        Messages from companies
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedConvo ? '280px 1fr' : '1fr',
        gap: '16px',
        height: '600px'
      }}>
        {/* Conversation List */}
        {(!selectedConvo || window.innerWidth > 768) && (
          <div style={{
            background: 'var(--card)', borderRadius: '12px',
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
                      background: convo.company.color || 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', color: 'white',
                      overflow: 'hidden', flexShrink: 0
                    }}>
                      {convo.company.logo_url ? (
                        <img src={convo.company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            background: 'var(--card)', borderRadius: '12px',
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
                background: selectedConvo.company.color || 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '12px', color: 'white', overflow: 'hidden'
              }}>
                {selectedConvo.company.logo_url ? (
                  <img src={selectedConvo.company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  maxWidth: '70%'
                }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: '12px',
                    background: msg.sender_type === 'applicant' ? 'var(--accent)' : 'var(--bg2)',
                    color: msg.sender_type === 'applicant' ? 'white' : 'var(--text)',
                    fontSize: '14px', lineHeight: '1.5'
                  }}>
                    {msg.content}
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
    </div>
  )
}
