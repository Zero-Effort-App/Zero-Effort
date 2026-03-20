import express from 'express';
import googleMeetService from '../services/googleMeetService.js';

const router = express.Router();

// Create new Google Meet
router.post('/create-meeting', async (req, res) => {
  try {
    const { channelName, applicantEmail, hrEmail } = req.body;

    if (!channelName || !applicantEmail || !hrEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: channelName, applicantEmail, hrEmail'
      });
    }

    const result = await googleMeetService.createMeetingLink(
      channelName,
      applicantEmail,
      hrEmail
    );

    return res.json(result);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get meeting link
router.get('/meeting-link/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const link = await googleMeetService.getMeetingLink(eventId);

    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Meeting link not found'
      });
    }

    return res.json({
      success: true,
      meetingLink: link
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// End meeting
router.post('/end-meeting/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    await googleMeetService.endMeeting(eventId);

    return res.json({
      success: true,
      message: 'Meeting ended'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
