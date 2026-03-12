// Chat persistence utilities for Zelo conversations

const CHAT_STORAGE_KEY = 'zelo_chat_history';
const MAX_STORED_MESSAGES = 50;

export const saveChatHistory = (messages) => {
  try {
    const messagesToSave = messages.slice(-MAX_STORED_MESSAGES).map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      timestamp: msg.timestamp,
      suggestions: msg.suggestions
    }));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messagesToSave));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
};

export const loadChatHistory = () => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const messages = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.warn('Failed to load chat history:', error);
  }
  return [];
};

export const clearChatHistory = () => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear chat history:', error);
  }
};

export const getChatStats = () => {
  try {
    const messages = loadChatHistory();
    const userMessages = messages.filter(msg => msg.sender === 'user').length;
    const zeloMessages = messages.filter(msg => msg.sender === 'zelo').length;
    const lastActivity = messages.length > 0 ? messages[messages.length - 1].timestamp : null;
    
    return {
      totalMessages: messages.length,
      userMessages,
      zeloMessages,
      lastActivity,
      conversationStarted: messages.length > 0
    };
  } catch (error) {
    console.warn('Failed to get chat stats:', error);
    return {
      totalMessages: 0,
      userMessages: 0,
      zeloMessages: 0,
      lastActivity: null,
      conversationStarted: false
    };
  }
};
