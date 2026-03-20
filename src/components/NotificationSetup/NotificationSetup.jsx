import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Settings, TestTube } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import './NotificationSetup.css';

const NotificationSetup = ({ userId, userRole }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    push_enabled: true,
    email_enabled: true,
    interview_scheduled: true,
    interview_reminder: true,
    interview_starting: true,
    hr_contact: true,
    new_message: true,
    status_changed: true,
  });

  const {
    subscription,
    permission,
    isSupported,
    isLoading,
    error,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    getPreferences,
    updatePreferences,
    testNotification,
  } = usePushNotifications(userId);

  // Load preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (userId) {
        const userPreferences = await getPreferences();
        if (userPreferences) {
          setPreferences(userPreferences);
        }
      }
    };

    loadPreferences();
  }, [userId, getPreferences]);

  // Handle subscription toggle
  const handleSubscribeToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Handle preference changes
  const handlePreferenceChange = async (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    await updatePreferences(newPreferences);
  };

  // Handle test notification
  const handleTestNotification = async () => {
    const success = await testNotification();
    if (success) {
      alert('Test notification sent! Check your browser notifications.');
    }
  };

  if (!isSupported) {
    return (
      <div className="notification-setup unsupported">
        <div className="message">
          <BellOff size={16} />
          <span>Push notifications are not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-setup">
      {/* Quick Subscribe Button */}
      {!showSettings && (
        <div className="quick-subscribe">
          <button
            onClick={handleSubscribeToggle}
            className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
            disabled={isLoading}
          >
            {isSubscribed ? (
              <>
                <Bell size={16} />
                <span>Notifications Enabled</span>
                <Check size={14} />
              </>
            ) : (
              <>
                <BellOff size={16} />
                <span>Enable Notifications</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="settings-btn"
            title="Notification Settings"
          >
            <Settings size={16} />
          </button>

          {isSubscribed && (
            <button
              onClick={handleTestNotification}
              className="test-btn"
              title="Test Notification"
            >
              <TestTube size={16} />
            </button>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Notification Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="close-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="settings-content">
            {/* Subscription Status */}
            <div className="setting-group">
              <h4>Push Notifications</h4>
              <div className="setting-item">
                <div className="setting-info">
                  <span>Enable push notifications</span>
                  <small>Receive notifications in your browser</small>
                </div>
                <button
                  onClick={handleSubscribeToggle}
                  className={`toggle-btn ${isSubscribed ? 'active' : ''}`}
                  disabled={isLoading}
                >
                  {isSubscribed ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>
              <div className="permission-status">
                <span className={`status ${permission}`}>
                  Permission: {permission}
                </span>
              </div>
            </div>

            {/* Notification Types */}
            <div className="setting-group">
              <h4>Notification Types</h4>
              
              <div className="setting-item">
                <div className="setting-info">
                  <span>Interview Scheduled</span>
                  <small>When a new interview is scheduled</small>
                </div>
                <button
                  onClick={() => handlePreferenceChange('interview_scheduled', !preferences.interview_scheduled)}
                  className={`toggle-btn ${preferences.interview_scheduled ? 'active' : ''}`}
                >
                  {preferences.interview_scheduled ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span>Interview Reminders</span>
                  <small>Reminders before scheduled interviews</small>
                </div>
                <button
                  onClick={() => handlePreferenceChange('interview_reminder', !preferences.interview_reminder)}
                  className={`toggle-btn ${preferences.interview_reminder ? 'active' : ''}`}
                >
                  {preferences.interview_reminder ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span>Interview Starting</span>
                  <small>When interview is about to start</small>
                </div>
                <button
                  onClick={() => handlePreferenceChange('interview_starting', !preferences.interview_starting)}
                  className={`toggle-btn ${preferences.interview_starting ? 'active' : ''}`}
                >
                  {preferences.interview_starting ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span>HR Contact</span>
                  <small>When HR/recruiters contact you</small>
                </div>
                <button
                  onClick={() => handlePreferenceChange('hr_contact', !preferences.hr_contact)}
                  className={`toggle-btn ${preferences.hr_contact ? 'active' : ''}`}
                >
                  {preferences.hr_contact ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span>New Messages</span>
                  <small>When you receive new messages</small>
                </div>
                <button
                  onClick={() => handlePreferenceChange('new_message', !preferences.new_message)}
                  className={`toggle-btn ${preferences.new_message ? 'active' : ''}`}
                >
                  {preferences.new_message ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span>Status Changes</span>
                  <small>When application status changes</small>
                </div>
                <button
                  onClick={() => handlePreferenceChange('status_changed', !preferences.status_changed)}
                  className={`toggle-btn ${preferences.status_changed ? 'active' : ''}`}
                >
                  {preferences.status_changed ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>
            </div>

            {/* Test Notification */}
            <div className="setting-group">
              <h4>Test</h4>
              <button
                onClick={handleTestNotification}
                className="test-notification-btn"
                disabled={!isSubscribed || isLoading}
              >
                <TestTube size={16} />
                Send Test Notification
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span>Error: {error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationSetup;
