const express = require('express');
const router = express.Router();
const callUsageService = require('../services/callUsageService');

// Get monthly usage
router.get('/usage/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log('📊 Getting monthly usage for company:', companyId);
    
    const usage = await callUsageService.getMonthlyUsage(companyId);
    
    return res.json({ 
      success: true, 
      usage: usage,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ Error getting monthly usage:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get remaining minutes
router.get('/remaining/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log('📊 Getting remaining minutes for company:', companyId);
    
    const remaining = await callUsageService.getRemainingMinutes(companyId);
    const resetDate = callUsageService.getMonthlyResetDate();
    const daysUntilReset = callUsageService.getDaysUntilReset();
    
    return res.json({ 
      success: true, 
      quota: remaining,
      resetDate: resetDate,
      daysUntilReset: daysUntilReset
    });
  } catch (error) {
    console.error('❌ Error getting remaining minutes:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get recent calls
router.get('/calls/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    console.log('📊 Getting recent calls for company:', companyId, 'limit:', limit);
    
    const calls = await callUsageService.getRecentCalls(companyId, limit);
    
    return res.json({ 
      success: true, 
      calls: calls,
      count: calls.length
    });
  } catch (error) {
    console.error('❌ Error getting recent calls:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Track call start
router.post('/track-start', async (req, res) => {
  try {
    const { companyId, callSessionId } = req.body;
    
    if (!companyId || !callSessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'companyId and callSessionId are required' 
      });
    }
    
    console.log('📊 Tracking call start:', { companyId, callSessionId });
    
    const result = await callUsageService.trackCallStart(companyId, callSessionId);
    
    return res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('❌ Error tracking call start:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Track call end
router.post('/track-end', async (req, res) => {
  try {
    const { callSessionId, durationMinutes, reason } = req.body;
    
    if (!callSessionId || !durationMinutes) {
      return res.status(400).json({ 
        success: false, 
        error: 'callSessionId and durationMinutes are required' 
      });
    }
    
    console.log('📊 Tracking call end:', { callSessionId, durationMinutes, reason });
    
    const result = await callUsageService.trackCallEnd(callSessionId, durationMinutes, reason);
    
    return res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('❌ Error tracking call end:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get quota summary (combined endpoint)
router.get('/summary/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('📊 Getting quota summary for company:', companyId);
    
    // Get all data in parallel
    const [quota, recentCalls] = await Promise.all([
      callUsageService.getRemainingMinutes(companyId),
      callUsageService.getRecentCalls(companyId, limit)
    ]);
    
    const resetDate = callUsageService.getMonthlyResetDate();
    const daysUntilReset = callUsageService.getDaysUntilReset();
    
    return res.json({ 
      success: true, 
      quota: quota,
      recentCalls: recentCalls,
      resetDate: resetDate,
      daysUntilReset: daysUntilReset
    });
  } catch (error) {
    console.error('❌ Error getting quota summary:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
