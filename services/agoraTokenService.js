import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;

class AgoraTokenService {
  generateToken(channelName, uid = 0) {
    try {
      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;

      if (!appId || !appCertificate) {
        throw new Error('Agora credentials not configured');
      }

      const expirationTimeInSeconds = 86400;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid || 0,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );

      return {
        token,
        uid: uid || 0,
        appId,
        channelName,
        expiresIn: expirationTimeInSeconds
      };
    } catch (error) {
      console.error('Token generation error:', error);
      throw error;
    }
  }
}

export default new AgoraTokenService();
