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

      const event = {
        summary: `Interview: ${channelName}`,
        description: `Video interview on ZERO EFFORT platform`,
        start: {
          dateTime: new Date().toISOString(),
          timeZone: 'Asia/Manila'
        },
        end: {
          dateTime: new Date(Date.now() + 30 * 60000).toISOString(),
          timeZone: 'Asia/Manila'
        },
        attendees: [
          { email: applicantEmail },
          { email: hrEmail }
        ],
        conferenceData: {
          createRequest: {
            requestId: `${channelName}-${Date.now()}` 
          }
        },
        visibility: 'private'
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'none'
      });

      const meetingLink = response.data.conferenceData.entryPoints[0].uri;
      const eventId = response.data.id;

      console.log('✅ Google Meet created:', meetingLink);

      return {
        success: true,
        meetingLink: meetingLink,
        eventId: eventId,
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
