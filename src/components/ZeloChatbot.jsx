import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

const BOT_RESPONSES = {
  password: `🔐 Password Reset:\n1. Go to the login page\n2. Click "Forgot Password?"\n3. Enter your email address\n4. Check your inbox for reset instructions\n💡 Check your spam folder if you don't see it!`,
  apply: `📝 How to Apply:\n1. Browse jobs in the Jobs section\n2. Click on a job you like\n3. Click the "Apply" button\n4. Upload your resume and fill the form\n5. Submit and track in Applications!`,
  default: `👋 Hi! I'm Zelo, your Zero Effort assistant!\n\nI can help you with:\n• How to apply for jobs\n• Password reset\n• Company information\n• Available positions\n\nJust ask me anything!` 
}

function getResponse(msg) {
  const m = msg.toLowerCase()
  if (m.includes('password') || m.includes('reset') || m.includes('forgot')) return BOT_RESPONSES.password
  if (m.includes('apply') || m.includes('application') || m.includes('how to')) return BOT_RESPONSES.apply
  return BOT_RESPONSES.default
}

export default function ZeloChatbot() {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: `👋 Hi! I'm Zelo! How can I help you today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text: userMsg }])
    setLoading(true)

    // Check for companies/jobs queries and fetch from Supabase
    const m = userMsg.toLowerCase()
    let botText = ''

    try {
      if (m.includes('compan') || m.includes('hiring')) {
        const { data } = await supabase.from('companies').select('name, industry').eq('is_active', true)
        if (data && data.length > 0) {
          const list = data.map(c => `• ${c.name} — ${c.industry}`).join('\n')
          botText = `🏢 Companies Currently Hiring:\n\n${list}\n\n💡 Go to Companies section to see their open positions!` 
        } else {
          botText = 'No companies are currently hiring. Check back soon!'
        }
      } else if (m.includes('job') || m.includes('position') || m.includes('opening')) {
        const { data } = await supabase.from('jobs').select('title, type, companies(name)').eq('status', 'active')
        if (data && data.length > 0) {
          const list = data.slice(0, 5).map(j => `• ${j.title} at ${j.companies?.name} (${j.type})`).join('\n')
          botText = `💼 Open Positions:\n\n${list}\n\n💡 Go to Browse Jobs to see all ${data.length} positions!` 
        } else {
          botText = 'No open positions right now. Check back soon!'
        }
      } else {
        botText = getResponse(userMsg)
      }
    } catch (err) {
      botText = getResponse(userMsg)
    }

    setLoading(false)
    setMessages(prev => [...prev, { from: 'bot', text: botText }])
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--accent)', border: 'none',
          cursor: 'pointer', fontSize: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '24px',
          width: '320px', maxWidth: 'calc(100vw - 48px)',
          height: '420px', borderRadius: '16px',
          background: 'var(--card)', border: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 1000, display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px', background: 'var(--accent)',
            color: 'white', fontWeight: 700, fontSize: '15px'
          }}>
            💬 Zelo — Zero Effort Assistant
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            background: 'var(--bg)'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.from === 'user' ? 'flex-end' : 'flex-start',
                background: msg.from === 'user' ? 'var(--accent)' : 'var(--bg2)',
                color: msg.from === 'user' ? 'white' : 'var(--text)',
                padding: '8px 12px', borderRadius: '12px',
                maxWidth: '85%', fontSize: '13px',
                whiteSpace: 'pre-wrap', lineHeight: '1.5'
              }}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', background: 'var(--bg2)',
                padding: '8px 12px', borderRadius: '12px',
                fontSize: '13px', color: 'var(--text2)'
              }}>
                Zelo is typing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: '8px',
            background: 'var(--card)'
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask Zelo anything..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: '13px', outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              style={{
                padding: '8px 14px', borderRadius: '8px',
                background: 'var(--accent)', color: 'white',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '13px'
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
