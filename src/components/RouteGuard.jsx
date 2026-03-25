import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  
  console.log('🛡️ [ROUTE GUARD] Render state:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    isLoading: loading,
    timestamp: new Date().toISOString(),
    willRedirect: loading ? false : !user
  });
  
  if (loading) {
    console.log('⏳ [ROUTE GUARD] Showing loading screen');
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Loading...</div>
    </div>;
  }
  
  if (!user) {
    console.log('🚪 [ROUTE GUARD] No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('✅ [ROUTE GUARD] User authenticated, rendering protected content');
  return children;
}
