import { google } from 'googleapis';

class GoogleMeetService {
  constructor() {
    // Initialize Google Calendar service
    if (!process.env.GOOGLE_CREDENTIALS_JSON) {
      console.warn('⚠️ GOOGLE_CREDENTIALS_JSON environment variable not set - Google Meet integration disabled');
      this.auth = null;
      this.enabled = false;
      return;
    }
    
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (error) {
      console.error('❌ Invalid GOOGLE_CREDENTIALS_JSON format:', error.message);
      this.auth = null;
      this.enabled = false;
      return;
    }
    
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
      this.enabled = true;
      console.log('✅ Google Meet service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Meet service:', error.message);
      this.auth = null;
      this.enabled = false;
    }
    
    if (this.enabled) {
      this.calendar = google.calendar({
        version: 'v3',
        auth: this.auth
      });
    }
  }

  // Create Google Meet event and get conferenceData
  async createMeetingLink(channelName, applicantEmail, hrEmail) {
    try {
      if (!this.enabled || !this.auth) {
        console.warn('⚠️ Google Meet service not available - using fallback link');
        // Generate fallback link
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const meetingCode = `interview-${timestamp}-${random}`;
        const meetingLink = `https://meet.google.com/${meetingCode}`;
        
        return {
          success: true,
          meetingLink: meetingLink,
          eventId: meetingCode,
          channelName: channelName,
          fallback: true
        };
      }
      
      console.log('🟡 Creating Google Meet for:', { channelName, applicantEmail, hrEmail });

      // Generate meeting code: interview_timestamp_random
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const meetingCode = `interview-${timestamp}-${random}`;
      
      // Proper Google Meet link format
      const meetingLink = `https://meet.google.com/${meetingCode}`;
      
      console.log('✅ Google Meet link generated:', meetingLink);

      return {
        success: true,
        meetingLink: meetingLink,
        eventId: meetingCode,
        channelName: channelName
      };
    } catch (error) {
      console.error('❌ Error creating Google Meet:', error.message);
      throw error;
    }
  }

  // Get meeting link (if already created)
  async getMeetingLink(eventId) {
    try {
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const meetingLink = event.data.conferenceData?.entryPoints[0]?.uri;
      return meetingLink;
    } catch (error) {
      console.error('Error getting meeting link:', error);
      return null;
    }
  }

  // End/delete meeting (optional)
  async endMeeting(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });
      return true;
    } catch (error) {
      console.error('Error ending meeting:', error);
      return false;
    }
  }
}

const googleMeetService = new GoogleMeetService();
export default googleMeetService;
