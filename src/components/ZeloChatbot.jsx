import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Bot, MessageCircle, X, Send } from 'lucide-react'

export default function ZeloChatbot() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const location = useLocation();
  const isInboxPage = location.pathname.includes('/inbox');
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm Zelo, your Zero Effort career assistant!\n\nI can help you:\n• Find the right job for your skills\n• Learn about companies hiring\n• Guide you through the application process\n• Answer any career questions\n\nWhat are you looking for today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const dataCache = useRef(null)

  // Detect mobile
  const isMobile = window.innerWidth <= 768

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchJobsAndCompanies() {
    if (dataCache.current) return dataCache.current
    
    const { data: jobs } = await supabase
      .from('jobs')
      .select('title, type, department, salary, companies(name, industry)')
      .eq('status', 'active')
      .limit(20)

    const { data: companies } = await supabase
      .from('companies')
      .select('name, industry, tags')
      .eq('is_active', true)
      .limit(20)

    const result = { jobs: jobs || [], companies: companies || [] }
    dataCache.current = result
    return result
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const { jobs, companies } = await fetchJobsAndCompanies()

      const jobsList = jobs.length > 0
        ? jobs.map(j => `- ${j.title} at ${j.companies?.name} (${j.type}, ${j.department}) — Salary: ₱${j.salary} — Requirements: ${j.requirements?.join(', ')}`).join('\n')
        : 'No jobs available'

      const companiesList = companies.length > 0
        ? companies.map(c => `- ${c.name} (${c.industry}) — ${c.description || 'No description'} — Tags: ${c.tags?.join(', ') || 'None'}`).join('\n')
        : 'No companies available'

      const systemPrompt = `You are Zelo, a helpful career assistant for Zero Effort job portal. Current data:\n\nAVAILABLE JOBS:\n${jobsList}\n\nAVAILABLE COMPANIES:\n${companiesList}\n\nGuidelines:\n- Be friendly and professional\n- Help users find relevant jobs\n- Provide company information\n- Guide through application process\n- Keep responses concise but helpful\n- If you don't know something, say so honestly\n- Never make up job listings or company information`

      const conversationHistory = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch('https://zero-effort-server.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, messages: conversationHistory })
      })

      if (!response.ok) throw new Error('Failed to get response')
      const data = await response.json()

      const botReply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again!"

      setMessages(prev => [...prev, { role: 'assistant', content: botReply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again!' }])
    } finally {
      setLoading(false)
    }
  }

  const cardBg = theme === 'dark' ? '#1a1d2e' : '#ffffff'
  const msgBg = theme === 'dark' ? '#13151f' : '#f5f5f5'
  const borderColor = theme === 'dark' ? '#2a2d3e' : '#e0e0e0'
  const textColor = theme === 'dark' ? '#ffffff' : '#000000'
  const text2Color = theme === 'dark' ? '#8b8fa8' : '#666666'

  return (
    <>
      {/* Dark overlay for mobile */}
      {open && isMobile && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Chat Button */}
      {!isInboxPage && (
      <button 
        className="zelo-fab"
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '24px',
          right: '20px',
          width: '52px', height: '52px',
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white'
        }}
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
      </button>
      )}

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed',
          // Mobile: full screen bottom sheet
          ...(isMobile ? {
            bottom: 0,
            left: 0,
            right: 0,
            height: '85vh',
            borderRadius: '20px 20px 0 0',
            width: '100%'
          } : {
            // Desktop: floating window
            bottom: '90px',
            right: '24px',
            width: '340px',
            height: '480px',
            borderRadius: '16px'
          }),
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--accent)',
            color: 'white', fontWeight: 700, fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} />
              <div>
                <div>Zelo — Career Assistant</div>
                <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>Powered by Groq AI</div>
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer',
                width: '28px', height: '28px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            backgroundColor: msgBg
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent)' : cardBg,
                color: msg.role === 'user' ? 'white' : textColor,
                padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                maxWidth: '85%', fontSize: '13px',
                whiteSpace: 'pre-wrap', lineHeight: '1.6',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', backgroundColor: cardBg,
                padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                fontSize: '13px', color: text2Color,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                Zelo is thinking... 🤔
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px',
            borderTop: `1px solid ${borderColor}`,
            display: 'flex', gap: '8px',
            backgroundColor: cardBg
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask Zelo anything..."
              style={{
                flex: 1, padding: '9px 12px', borderRadius: '10px',
                border: `1px solid ${borderColor}`,
                backgroundColor: msgBg,
                color: textColor, fontSize: '13px', outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '9px 14px', borderRadius: '10px',
                background: loading || !input.trim() ? '#666' : 'var(--accent)',
                color: 'white', border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '13px', transition: 'background 0.2s'
              }}
            >
              {loading ? '...' : <Send size={14} />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
