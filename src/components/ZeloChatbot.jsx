import { useState, useEffect, useRef } from 'react';
import { getJobs, getCompanies, getMyApplications } from '../lib/db';
import { zeloSmartResponses } from '../lib/zeloSmartResponses';
import { zeloFAQ } from '../lib/zeloFAQ';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '../lib/chatPersistence';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ZeloChatbot() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [jobsData, setJobsData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [userApplications, setUserApplications] = useState([]);
  const [showClearOption, setShowClearOption] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFAQMenu, setShowFAQMenu] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeZelo();
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const initializeZelo = async () => {
    if (isInitialized) return;
    
    try {
      await loadData();
      await loadStoredMessages();
      
      // Set up user context for smart responses
      if (profile) {
        const applications = await getMyApplications(profile.id);
        setUserApplications(applications);
        zeloSmartResponses.setUserContext(profile, applications);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Zelo:', error);
    }
  };

  const loadStoredMessages = () => {
    const storedMessages = loadChatHistory();
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    } else {
      // Enhanced welcome message
      const welcomeText = profile 
        ? `👋 Hi ${profile.first_name}! I'm Zelo, your intelligent job search assistant. I have access to real-time job data and can provide personalized recommendations based on your profile. How can I help you today?`
        : "👋 Hi! I'm Zelo, your intelligent job search assistant! I have access to real-time job data and can help you find the perfect opportunity. What can I help you with today?";
      
      setMessages([{
        id: Date.now(),
        text: welcomeText,
        sender: 'zelo',
        timestamp: new Date(),
        suggestions: profile 
          ? ['Find jobs for me', 'Track my applications', 'Personal recommendations', 'Market insights']
          : ['Show available jobs', 'Which companies are hiring?', 'Help with applications', 'Career advice']
      }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      const [jobs, companies] = await Promise.all([
        getJobs(true), // Only active jobs
        getCompanies(true) // Only active companies
      ]);
      setJobsData(jobs);
      setCompaniesData(companies);
    } catch (error) {
      console.error('Error loading data for Zelo:', error);
    }
  };

  const processUserMessage = async (userInput) => {
    try {
      // Use the smart response system
      const zeloResponse = await zeloSmartResponses.processSmartQuery(userInput);
      return zeloResponse;
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        text: "🤖 I'm processing your request, but encountered an issue. Could you try rephrasing your question or ask me something else?",
        suggestions: ['Show available jobs', 'Track my applications', 'Company information']
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const zeloResponse = await processUserMessage(inputValue);
      const zeloMessage = {
        id: Date.now() + 1,
        text: zeloResponse.text,
        sender: 'zelo',
        timestamp: new Date(),
        suggestions: zeloResponse.suggestions || []
      };

      setMessages(prev => [...prev, zeloMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "😅 I'm having trouble processing that right now. Could you try rephrasing your question or ask me something else?",
        sender: 'zelo',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  const handleClearChat = () => {
    clearChatHistory();
    setMessages([{
      id: Date.now(),
      text: "👋 Fresh start! I'm Zelo, your job search assistant. How can I help you find your next opportunity?",
      sender: 'zelo',
      timestamp: new Date(),
      suggestions: ['Show available jobs', 'Which companies are hiring?', 'Help with applications', 'Browse FAQs']
    }]);
    setShowClearOption(false);
  };

  const handleFAQClick = (faqId) => {
    const faq = zeloFAQ.getFAQById(faqId);
    if (faq) {
      const response = zeloFAQ.formatFAQResponse(faq);
      
      // Add user question
      const userMessage = {
        id: Date.now(),
        text: faq.question,
        sender: 'user',
        timestamp: new Date()
      };
      
      // Add FAQ response
      const zeloMessage = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'zelo',
        timestamp: new Date(),
        suggestions: response.suggestions
      };
      
      setMessages(prev => [...prev, userMessage, zeloMessage]);
      setShowFAQMenu(false);
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        height: '600px',
        background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme === 'dark' ? '#333' : '#e1e5e9'}`
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px 16px 0 0',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '24px' }}>🤖</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Zelo</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Job Search Assistant</div>
          </div>
        </div>
        <button
          onClick={() => setShowFAQMenu(!showFAQMenu)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            marginRight: '8px'
          }}
          title="Browse FAQs"
        >
          📚
        </button>
        <button
          onClick={() => setShowClearOption(!showClearOption)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            marginRight: '8px'
          }}
          title="Chat options"
        >
          ⋮
        </button>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px'
          }}
        >
          ✕
        </button>
      </div>
      
      {/* FAQ Menu Dropdown */}
      {showFAQMenu && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '16px',
            background: theme === 'dark' ? '#2a2a2a' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1001,
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: theme === 'dark' ? '#fff' : '#333', 
            marginBottom: '8px',
            padding: '0 8px'
          }}>
            📚 Frequently Asked Questions
          </div>
          {zeloFAQ.getAllCategories().slice(0, 4).map(category => (
            <div key={category.name} style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: theme === 'dark' ? '#ccc' : '#666',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {category.icon} {category.name}
              </div>
              {zeloFAQ.getFAQsByCategory(category.name).slice(0, 2).map(faq => (
                <button
                  key={faq.id}
                  onClick={() => handleFAQClick(faq.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 8px 6px 20px',
                    background: 'none',
                    border: 'none',
                    color: theme === 'dark' ? '#fff' : '#333',
                    fontSize: '11px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'left',
                    lineHeight: '1.3'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = theme === 'dark' ? '#444' : '#f1f3f4';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                  }}
                  title={faq.question}
                >
                  {faq.question.length > 30 ? faq.question.substring(0, 30) + '...' : faq.question}
                </button>
              ))}
            </div>
          ))}
          <button
            onClick={() => {
              setInputValue('Show me all FAQs');
              setShowFAQMenu(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px',
              background: theme === 'dark' ? '#444' : '#f1f3f4',
              border: 'none',
              color: theme === 'dark' ? '#fff' : '#333',
              fontSize: '12px',
              cursor: 'pointer',
              borderRadius: '4px',
              textAlign: 'center',
              marginTop: '4px'
            }}
          >
            View all FAQs →
          </button>
        </div>
      )}

      {/* Clear chat dropdown */}
      {showClearOption && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '16px',
            background: theme === 'dark' ? '#2a2a2a' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1001
          }}
        >
          <button
            onClick={handleClearChat}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              color: theme === 'dark' ? '#fff' : '#333',
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: '4px',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = theme === 'dark' ? '#444' : '#f1f3f4';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
            }}
          >
            🗑️ Clear chat history
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: '18px',
                background: message.sender === 'user' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : theme === 'dark' ? '#2a2a2a' : '#f1f3f4',
                color: message.sender === 'user' ? 'white' : theme === 'dark' ? '#fff' : '#333',
                fontSize: '14px',
                lineHeight: '1.4'
              }}
              dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
            />
          </div>
        ))}
        
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '18px',
                background: theme === 'dark' ? '#2a2a2a' : '#f1f3f4',
                color: theme === 'dark' ? '#fff' : '#333',
                fontSize: '14px'
              }}
            >
              <span>🤔 Zelo is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages[messages.length - 1]?.suggestions && (
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ fontSize: '12px', color: theme === 'dark' ? '#999' : '#666', marginBottom: '8px' }}>
            Suggested questions:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {messages[messages.length - 1].suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                  background: theme === 'dark' ? '#333' : '#f9f9f9',
                  color: theme === 'dark' ? '#fff' : '#333',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = theme === 'dark' ? '#444' : '#e9e9e9';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = theme === 'dark' ? '#333' : '#f9f9f9';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '16px',
          borderTop: `1px solid ${theme === 'dark' ? '#333' : '#e1e5e9'}`,
          display: 'flex',
          gap: '8px'
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Zelo about jobs, companies, or applications..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '24px',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
            background: theme === 'dark' ? '#2a2a2a' : '#f9f9f9',
            color: theme === 'dark' ? '#fff' : '#333',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isTyping}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: inputValue.trim() && !isTyping
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : theme === 'dark' ? '#333' : '#e1e5e9',
            border: 'none',
            color: inputValue.trim() && !isTyping ? 'white' : theme === 'dark' ? '#999' : '#999',
            cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            transition: 'all 0.2s ease'
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
