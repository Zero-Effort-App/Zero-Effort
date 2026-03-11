import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ApplicantConfirm() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('confirming')

  useEffect(() => {
    async function handleConfirm() {
      const { data, error } = await supabase.auth.getSession()
      if (data?.session) {
        setStatus('success')
        setTimeout(() => navigate('/applicant/home'), 2000)
      } else {
        setStatus('error')
      }
    }
    handleConfirm()
  }, [])

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {status === 'confirming' && (
        <>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <h2>Confirming your email...</h2>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '48px' }}>🎉</div>
          <h2>Email confirmed!</h2>
          <p>Redirecting you to the app...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '48px' }}>❌</div>
          <h2>Confirmation failed</h2>
          <p>The link may have expired. Please register again.</p>
          <button onClick={() => navigate('/applicant/login')} className="btn-primary">
            Back to Login
          </button>
        </>
      )}
    </div>
  )
}
