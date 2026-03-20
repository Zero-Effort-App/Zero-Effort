import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;

class AgoraTokenService {
  generateToken(channelName, uid = 0) {
    try {
      console.log('🟡 generateToken called with:', { channelName, uid });
      
      const appId = process.env.AGORA_APP_ID;
      const appCert = process.env.AGORA_APP_CERTIFICATE;
      
      console.log('🟡 Checking env variables:');
      console.log('   AGORA_APP_ID exists?', !!appId);
      console.log('   AGORA_APP_ID value:', appId || 'NOT_SET');
      console.log('   AGORA_APP_CERTIFICATE exists?', !!appCert);
      console.log('   AGORA_APP_CERTIFICATE length:', appCert ? appCert.length : 0);

      if (!appId || !appCert) {
        throw new Error('Agora credentials not configured in environment');
      }

      const expirationTimeInSeconds = 86400;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      console.log('🟡 Building token with:', {
        appId: appId.substring(0, 8) + '...',
        channelName,
        uid: uid || 0,
        role: 'PUBLISHER',
        privilegeExpiredTs
      });

      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCert,
        channelName,
        uid || 0,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );

      console.log('✅ Token generated, type:', typeof token, 'length:', token ? token.length : 0);
      console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'NULL');
      
      return {
        token,
        uid: uid || 0,
        appId,
        channelName,
        expiresIn: expirationTimeInSeconds
      };
    } catch (error) {
      console.error('❌ Token generation failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }
}

export default new AgoraTokenService();
