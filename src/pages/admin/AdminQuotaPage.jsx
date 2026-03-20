import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminQuotaPage() {
  const [quota, setQuota] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get company ID from user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // For now, assuming company_id from user metadata or use default
        const cId = user.user_metadata?.company_id || 'default-company';
        setCompanyId(cId);

        // Fetch quota summary
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const quotaRes = await fetch(`${apiUrl}/quota/summary/${cId}`);
        
        if (!quotaRes.ok) {
          throw new Error('Failed to fetch quota data');
        }
        
        const quotaData = await quotaRes.json();
        
        if (quotaData.success) {
          setQuota(quotaData.quota);
          setRecentCalls(quotaData.recentCalls || []);
        } else {
          throw new Error(quotaData.error || 'Unknown error');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching quota data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshData = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading quota data...</div>
        <div style={{ color: '#666' }}>Please wait while we fetch your usage statistics.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#f44336', fontSize: '18px', marginBottom: '10px' }}>Error</div>
        <div style={{ color: '#666', marginBottom: '20px' }}>{error}</div>
        <button 
          onClick={refreshData}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!quota) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#f44336', fontSize: '18px', marginBottom: '10px' }}>No quota data available</div>
        <div style={{ color: '#666' }}>Unable to load quota information.</div>
      </div>
    );
  }

  const progressPercentage = quota.percentage;
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Interview Quota Dashboard</h1>
        <button 
          onClick={refreshData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Quota Card */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '25px',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>Monthly Quota</h2>
        
        <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '15px', color: '#333' }}>
          {quota.used} / {quota.total} minutes used
        </div>
        
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '30px',
          backgroundColor: '#ddd',
          borderRadius: '15px',
          overflow: 'hidden',
          marginBottom: '15px',
          border: '1px solid #ccc'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: progressPercentage > 80 ? '#f44336' : progressPercentage > 60 ? '#ff9800' : '#4CAF50',
            transition: 'width 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {progressPercentage > 10 && `${progressPercentage}%`}
          </div>
        </div>

        <div style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>
          <strong>{quota.remaining} minutes remaining</strong> ({progressPercentage}% used)
        </div>
        
        <div style={{ fontSize: '14px', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
          <span>Company ID: {companyId}</span>
          <span>Resets: {resetDate.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Recent Calls */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Recent Calls</h2>
        
        {recentCalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>No calls recorded yet</div>
            <div style={{ fontSize: '14px' }}>Start making video calls to see usage statistics here.</div>
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #ddd'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>Date & Time</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>Duration</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map(call => (
                <tr key={call.id} style={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontSize: '14px' }}>
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontSize: '14px', fontWeight: 'bold' }}>
                    {call.duration_minutes} min
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                    <span style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      backgroundColor: call.reason === '30min_limit' ? '#ff9800' : '#4CAF50',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {call.reason === '30min_limit' ? 'Limit Reached' : 'Completed'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontSize: '14px', color: '#666' }}>
                    {call.reason === '30min_limit' ? 'Auto-ended at 30 minutes' : 
                     call.reason === 'user_ended' ? 'User ended call' : 
                     call.reason === 'completed' ? 'Call completed normally' : 
                     call.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginTop: '30px' 
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50', marginBottom: '5px' }}>
            {quota.remaining}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Minutes Remaining</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3', marginBottom: '5px' }}>
            {recentCalls.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Total Calls</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800', marginBottom: '5px' }}>
            {Math.ceil(quota.used / recentCalls.length) || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Avg Call Duration (min)</div>
        </div>
      </div>
    </div>
  );
}
