import express from 'express';
import { createClient } from '@supabase/supabase-js';
import agoraTokenService from '../services/agoraTokenService.js';

const router = express.Router();

// Get Supabase client (lazy initialization)
const getSupabase = () => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Simple auth middleware (you may want to enhance this)
const verifyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  // For now, we'll extract user ID from the header
  // In production, you should verify JWT token
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // For demo purposes, we'll assume the token contains user ID
  // In production, verify the JWT and extract user ID
  req.userId = token; // This should be the actual user ID after verification
  next();
};

// Generate RTC Token
router.post('/generate-token', verifyAuth, async (req, res) => {
  try {
    const { channelName, uid } = req.body;

    if (!channelName) {
      return res.status(400).json({ 
        success: false,
        error: 'Channel name required' 
      });
    }

    const tokenData = agoraTokenService.generateToken(channelName, uid);
    
    // Ensure proper JSON response with token field
    return res.json({
      success: true,
      token: tokenData.token || tokenData,
      channelName: channelName,
      uid: uid
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Log call start
router.post('/call-start', verifyAuth, async (req, res) => {
  try {
    const { interviewId, channelName } = req.body;
    const userId = req.userId;

    const { data, error } = await getSupabase()
      .from('call_sessions')
      .insert({
        interview_id: interviewId,
        channel_name: channelName,
        applicant_id: userId,
        recruiter_id: userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, callSessionId: data.id });
  } catch (error) {
    console.error('Call start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log call end
router.post('/call-end', verifyAuth, async (req, res) => {
  try {
    const { callSessionId, duration } = req.body;

    const { error } = await getSupabase()
      .from('call_sessions')
      .update({
        status: 'completed',
        duration: duration,
        ended_at: new Date()
      })
      .eq('id', callSessionId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Call end error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get call sessions for an interview
router.get('/sessions/:interviewId', verifyAuth, async (req, res) => {
  try {
    const { interviewId } = req.params;

    const { data, error } = await getSupabase()
      .from('call_sessions')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
