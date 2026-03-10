import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

console.log('SUPABASE_URL loaded:', process.env.SUPABASE_URL ? 'YES' : 'NO')
console.log('Service role key loaded:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO - CHECK .env FILE')
console.log('Service role key preview:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...')

const app = express()
app.use(cors())
app.use(express.json())

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Create any auth account (admin or company)
app.post('/api/create-account', async (req, res) => {
  const { email, password, metadata } = req.body
  console.log('Create account request:', { email, passwordLength: password?.length, metadata })
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata || {}
    })
    if (error) {
      console.error('Supabase createUser error:', error)
      return res.status(400).json({ error: error.message })
    }
    console.log('User created successfully:', data.user?.id)
    return res.json({ success: true, user: data.user })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// Delete auth account
app.post('/api/delete-account', async (req, res) => {
  const { userId } = req.body
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return res.status(400).json({ error: error.message })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Get user by email (for admin deletion)
app.post('/api/get-user-by-email', async (req, res) => {
  const { email } = req.body
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) return res.status(400).json({ error: error.message })
    
    const user = data.users.find(u => u.email === email)
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    return res.json({ success: true, user })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body
  console.log('Reset password request:', { email, passwordLength: newPassword?.length })
  try {
    // Find user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('List users error:', listError)
      return res.status(400).json({ error: listError.message })
    }
    
    const user = users.users.find(u => u.email === email)
    if (!user) {
      console.log('User not found for email:', email)
      return res.status(404).json({ error: 'User not found' })
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    })
    if (updateError) {
      console.error('Update password error:', updateError)
      return res.status(400).json({ error: updateError.message })
    }

    // Mark request as resolved
    const { error: markError } = await supabaseAdmin
      .from('password_reset_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('email', email)
      .eq('status', 'pending')
    
    if (markError) {
      console.error('Mark request resolved error:', markError)
      // Don't fail the request, just log the error
    }

    console.log('Password reset successfully for user:', user.id)
    return res.json({ success: true })
  } catch (err) {
    console.error('Server error in reset password:', err)
    return res.status(500).json({ error: err.message })
  }
})

app.listen(3002, () => console.log('Admin API server running on port 3002'))
