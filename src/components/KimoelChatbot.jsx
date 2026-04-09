import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Bot, MessageCircle, X, Send } from 'lucide-react'

export default function KimoelChatbot() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const location = useLocation();
  const isHomePage = location.pathname === '/applicant/home';
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm Kimoel, your personalized Zero Effort career assistant!\n\nI can help you:\n• Track your applications and provide status updates\n• Find jobs matching your background\n• Learn about hiring companies\n• Get application tips & interview prep\n• Help with account and technical issues\n• Guide you through platform features\n\nHow can I assist you today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [userApplications, setUserApplications] = useState([])
  const bottomRef = useRef(null)
  const dataCache = useRef(null)

  // Detect mobile
  const isMobile = window.innerWidth <= 768

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async function fetchWithCache(key, fetchFn) {
    // Check if cached data exists and is fresh
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log(`✅ Using cached ${key}`);
        return data;
      }
    }
    
    // Fetch fresh data if not cached or expired
    console.log(`🔄 Fetching fresh ${key}...`);
    const data = await fetchFn();
    
    // Store in cache
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  }

  async function fetchJobsAndCompanies() {
    return await fetchWithCache('zelo_jobs_companies_cache', async () => {
      const [jobs, companies] = await Promise.all([
        supabase
          .from('jobs')
          .select('title, type, department, salary, companies(name, industry)')
          .eq('status', 'active')
          .limit(20),

        supabase
          .from('companies')
          .select('name, industry, tags')
          .eq('is_active', true)
          .limit(20)
      ]);

      return { jobs: jobs || [], companies: companies || [] };
    });
  }

  async function fetchUserProfile() {
    if (!user?.id) return null
    
    try {
      const { data } = await supabase
        .from('applicants')
        .select('first_name, last_name, phone, gender, photo_url')
        .eq('id', user.id)
        .single()
      
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  async function fetchUserApplications() {
    if (!user?.id) return []
    
    try {
      const { data } = await supabase
        .from('applications')
        .select('*, jobs(title, department, salary, companies(name))')
        .eq('applicant_id', user.id)
        .order('applied_at', { ascending: false })
        .limit(10)
      
      return data || []
    } catch (error) {
      console.error('Error fetching user applications:', error)
      return []
    }
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
      const profile = await fetchUserProfile()
      const applications = await fetchUserApplications()
      
      // Update state for future use
      setUserProfile(profile)
      setUserApplications(applications)

      // Format applications for prompt
      const applicationsList = applications.length > 0
        ? applications.map(app => {
            const appliedDate = new Date(app.applied_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
            return `• ${app.jobs?.title} at ${app.jobs?.companies?.name} - Status: ${app.status} (Applied: ${appliedDate})`
          }).join('\n')
        : 'No applications yet - I can help you find and apply!'

      const jobsList = jobs.length > 0
        ? jobs.map(j => `- ${j.title} at ${j.companies?.name} (${j.type}, ${j.department}) — Salary: ₱${j.salary} — Requirements: ${j.requirements?.join(', ')}`).join('\n')
        : 'No jobs available'

      const companiesList = companies.length > 0
        ? companies.map(c => `- ${c.name} (${c.industry}) — ${c.description || 'No description'} — Tags: ${c.tags?.join(', ') || 'None'}`).join('\n')
        : 'No companies available'

      const systemPrompt = `You are Kimoel, a helpful career assistant for Zero Effort job portal.

USER CONTEXT:
- User's name: ${profile?.first_name || 'User'}
- Phone: ${profile?.phone || 'Not provided'}
- Email: ${user?.email || 'Not available'}

APPLICATION STATUS:
${applicationsList}

AVAILABLE JOBS:
${jobsList}

AVAILABLE COMPANIES:
${companiesList}

🎯 I CAN HELP YOU WITH:

CAREER & JOBS:
- Find jobs matching your background
- Learn about hiring companies
- Get application tips & advice
- Prepare for interviews
- Improve your resume

ACCOUNT & SUPPORT:
- Reset password or update profile
- Explain how application process works
- Help with technical issues
- Questions about features
- Guide through video interviews

APPLICATION TRACKING:
- Check status of your applications
- Understand what companies want
- Tips for specific positions
- Follow-up advice

BEHAVIOR GUIDELINES:
- Be friendly and encouraging
- Provide specific, actionable advice
- If user mentions an applied job, give targeted tips
- If user has technical issues, offer step-by-step solutions
- If asked about account, prioritize troubleshooting
- Keep responses helpful but concise
- Never make up information`

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

      <style>{`
  @keyframes kimoelSlideUp {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  @keyframes kimoelSlideDown {
    0% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    100% {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
  }
  @keyframes kimoelFabPulse {
    0% { box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
    50% { box-shadow: 0 4px 30px rgba(99,102,241,0.7), 0 0 0 8px rgba(99,102,241,0.1); }
    100% { box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
  }
  .kimoel-fab-idle {
    animation: kimoelFabPulse 2.5s ease-in-out infinite;
  }
`}</style>

      {/* Permanent Widget - All Screen Sizes */}
      {isHomePage && (
  <button
    className={`kimoel-fab ${!open ? 'kimoel-fab-idle' : ''}`}
    onClick={() => setOpen(!open)}
    style={{
      position: 'fixed',
      bottom: '80px',
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
    {open ? <X size={20} /> : (
      <div
        style={{
          width: '52px', height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '20px',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
        }}
      >
        👨‍💼
      </div>
    )}
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
          overflow: 'hidden',
          animation: 'kimoelSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          transformOrigin: 'bottom right',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--accent)',
            color: 'white', fontWeight: 700, fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                👨‍💼
              </div>
              <div>
                <div>Kimoel — Career Assistant</div>
                <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>Powered by Zero Effort AI</div>
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
            background: 'var(--bg2)'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent)' : (i === 0 ? 'var(--surface)' : cardBg),
                border: i === 0 ? '1px solid var(--border)' : 'none',
                color: msg.role === 'user' ? 'white' : textColor,
                padding: i === 0 ? '14px 16px' : '10px 14px', 
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : (i === 0 ? '16px' : '16px 16px 16px 4px'),
                maxWidth: '85%', fontSize: i === 0 ? '14px' : '13px',
                whiteSpace: 'pre-wrap', lineHeight: i === 0 ? '1.7' : '1.6',
                boxShadow: i === 0 ? '0 2px 8px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.1)'
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
                Kimoel is thinking... 🤔
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
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              placeholder="Ask Kimoel anything..."
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '12px',
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: '14px', outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '9px 14px', borderRadius: '10px',
                background: loading || !input.trim() ? 'var(--border)' : 'var(--accent)',
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
