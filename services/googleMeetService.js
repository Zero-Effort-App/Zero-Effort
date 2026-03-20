import { google } from 'googleapis';

class GoogleMeetService {
  constructor() {
    // Initialize Google Calendar service
    if (!process.env.GOOGLE_CREDENTIALS_JSON) {
      throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is not set');
    }
    
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (error) {
      throw new Error('Invalid GOOGLE_CREDENTIALS_JSON format: ' + error.message);
    }
    
    this.auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.auth
    });
  }

  // Create Google Meet event and get conferenceData
  async createMeetingLink(channelName, applicantEmail, hrEmail) {
    try {
      console.log('🟡 Creating Google Meet for:', { channelName, applicantEmail, hrEmail });

      // Generate random meeting ID
      const meetingId = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      
      // Create Google Meet link
      const meetingLink = `https://meet.google.com/${meetingId}`;
      
      console.log('✅ Google Meet link generated:', meetingLink);

      return {
        success: true,
        meetingLink: meetingLink,
        eventId: meetingId,
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
