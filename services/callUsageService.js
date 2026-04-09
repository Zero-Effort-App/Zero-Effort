import { supabase } from '../lib/supabaseClient.js';

class CallUsageService {
  // Track call start
  async trackCallStart(companyId, callSessionId) {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not available - skipping call start tracking');
        return null;
      }
      
      const { data, error } = await supabase
        .from('call_usage_tracking')
        .insert({
          company_id: companyId,
          call_session_id: callSessionId,
          started_at: new Date(),
          duration_minutes: 0,
          reason: 'in_progress'
        })
        .select()
        .single();

      if (error) {
        console.error('Error tracking call start:', error);
        throw error;
      }
      
      console.log('✅ Call start tracked:', { companyId, callSessionId });
      return data;
    } catch (error) {
      console.error('Error tracking call start:', error);
      throw error;
    }
  }

  // Track call end
  async trackCallEnd(callSessionId, durationMinutes, reason = 'completed') {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not available - skipping call end tracking');
        return null;
      }
      
      const { data, error } = await supabase
        .from('call_usage_tracking')
        .update({
          ended_at: new Date(),
          duration_minutes: durationMinutes,
          reason: reason
        })
        .eq('call_session_id', callSessionId)
        .select()
        .single();

      if (error) {
        console.error('Error tracking call end:', error);
        throw error;
      }
      
      console.log('✅ Call end tracked:', { callSessionId, durationMinutes, reason });
      return data;
    } catch (error) {
      console.error('Error tracking call end:', error);
      throw error;
    }
  }

  // Get monthly usage for company
  async getMonthlyUsage(companyId) {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not available - returning 0 usage');
        return 0;
      }
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data, error } = await supabase
        .from('call_usage_tracking')
        .select('duration_minutes')
        .eq('company_id', companyId)
        .gte('created_at', monthStart.toISOString())
        .eq('reason', 'completed');

      if (error) {
        console.error('Error getting monthly usage:', error);
        return 0;
      }

      const totalMinutes = data.reduce((sum, call) => sum + (call.duration_minutes || 0), 0);
      console.log('📊 Monthly usage for company', companyId, ':', totalMinutes, 'minutes');
      return totalMinutes;
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      return 0;
    }
  }

  // Get remaining minutes
  async getRemainingMinutes(companyId) {
    try {
      const used = await this.getMonthlyUsage(companyId);
      const remaining = Math.max(0, 10000 - used);
      const percentage = Math.round((used / 10000) * 100);
      
      const result = {
        total: 10000,
        used: used,
        remaining: remaining,
        percentage: percentage
      };
      
      console.log('📊 Quota status for company', companyId, ':', result);
      return result;
    } catch (error) {
      console.error('Error getting remaining minutes:', error);
      return {
        total: 10000,
        used: 0,
        remaining: 10000,
        percentage: 0
      };
    }
  }

  // Get recent calls for admin
  async getRecentCalls(companyId, limit = 20) {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not available - returning empty calls list');
        return [];
      }
      
      const { data, error } = await supabase
        .from('call_usage_tracking')
        .select(`
          *,
          call_session:call_session_id(
            channel_name,
            started_at,
            ended_at
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent calls:', error);
        return [];
      }

      console.log('📊 Retrieved recent calls:', data.length, 'calls');
      return data;
    } catch (error) {
      console.error('Error getting recent calls:', error);
      return [];
    }
  }

  // Get monthly reset date
  getMonthlyResetDate() {
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return resetDate;
  }

  // Get days until reset
  getDaysUntilReset() {
    const now = new Date();
    const resetDate = this.getMonthlyResetDate();
    const diffTime = Math.abs(resetDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

const callUsageService = new CallUsageService();
export default callUsageService;
