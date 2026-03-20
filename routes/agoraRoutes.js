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

// Test endpoint to debug token generation
router.post('/test-token', async (req, res) => {
  try {
    console.log('=== TOKEN DEBUG INFO ===');
    console.log('AGORA_APP_ID:', process.env.AGORA_APP_ID);
    console.log('AGORA_APP_CERTIFICATE:', process.env.AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET');
    console.log('Request body:', req.body);
    
    const { channelName, uid } = req.body;
    
    if (!channelName) {
      return res.json({
        success: false,
        error: 'Channel name required',
        debug: {
          appId: process.env.AGORA_APP_ID,
          certSet: !!process.env.AGORA_APP_CERTIFICATE
        }
      });
    }

    const tokenData = agoraTokenService.generateToken(channelName, uid);
    
    console.log('Token generated successfully:', !!tokenData);
    
    return res.json({
      success: true,
      token: tokenData.token || tokenData,
      channelName: channelName,
      uid: uid,
      debug: {
        appId: process.env.AGORA_APP_ID,
        certSet: !!process.env.AGORA_APP_CERTIFICATE,
        tokenGenerated: !!tokenData
      }
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.json({
      success: false,
      error: error.message,
      debug: {
        appId: process.env.AGORA_APP_ID,
        certSet: !!process.env.AGORA_APP_CERTIFICATE,
        stack: error.stack
      }
    });
  }
});

// Generate RTC Token
router.post('/generate-token', verifyAuth, async (req, res) => {
  try {
    console.log('🟡 Token request received');
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    
    const { channelName, uid } = req.body;

    if (!channelName) {
      console.log('❌ Missing channelName');
      return res.status(400).json({ 
        success: false,
        error: 'Channel name required' 
      });
    }

    console.log('🟡 Generating token for channel:', channelName, 'uid:', uid);
    const tokenData = agoraTokenService.generateToken(channelName, uid);
    
    if (!tokenData) {
      console.log('❌ Token generation returned null/undefined');
      return res.status(500).json({ 
        success: false,
        error: 'Token generation returned null' 
      });
    }
    
    const token = tokenData.token || tokenData;
    
    if (!token) {
      console.log('❌ Token is empty/null, tokenData:', tokenData);
      return res.status(500).json({ 
        success: false,
        error: 'Token is empty in response' 
      });
    }
    
    console.log('✅ Token generated successfully, length:', token.length);
    console.log('Token type:', typeof token);
    
    console.log('🟢 SENDING RESPONSE TO FRONTEND');
    console.log('Token to send:', token);
    console.log('Response object:', { 
      success: true, 
      token: token,
      channelName: channelName,
      uid: uid 
    });
    
    // Ensure proper JSON response with token field
    return res.json({
      success: true,
      token: token,
      channelName: channelName,
      uid: uid
    });
  } catch (error) {
    console.error('❌ TOKEN ERROR:', error.message);
    console.error('Stack:', error.stack);
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
