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
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
          bottom: isMobile ? '16px' : '20px',
          right: isMobile ? '16px' : '20px',
          width: isMobile ? '56px' : '60px',
          height: isMobile ? '56px' : '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: isMobile ? '20px' : '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          // Mobile touch optimizations
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (!isMobile) {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile) {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
          }
        }}
        // Mobile touch feedback
        onTouchStart={(e) => {
          e.target.style.transform = 'scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.target.style.transform = 'scale(1)';
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
        bottom: isMobile ? '60px' : '20px', // Higher on mobile to leave more space
        right: isMobile ? '10px' : '20px', // Smaller margins on mobile
        width: isMobile ? 'calc(100vw - 20px)' : '380px', // Leave margins on mobile
        height: isMobile ? '70vh' : '600px', // 70% of screen height on mobile
        maxHeight: isMobile ? '500px' : '600px', // Max height limit on mobile
        background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        borderRadius: isMobile ? '16px' : '16px', // Keep rounded corners on mobile
        boxShadow: isMobile ? '0 4px 20px rgba(0, 0, 0, 0.15)' : '0 10px 40px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        border: isMobile ? `1px solid ${theme === 'dark' ? '#333' : '#e1e5e9'}` : `1px solid ${theme === 'dark' ? '#333' : '#e1e5e9'}`,
        // Mobile optimizations
        overflow: 'hidden',
        // Center on mobile
        left: isMobile ? '10px' : 'auto'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: isMobile ? '10px 12px' : '12px 16px', // Smaller padding on mobile
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: isMobile ? '16px 16px 0 0' : '16px 16px 0 0',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: isMobile ? '48px' : '60px' // Smaller header on mobile
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
          <div style={{ fontSize: isMobile ? '18px' : '20px' }}>🤖</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: isMobile ? '13px' : '14px' }}>Zelo</div>
          </div>
        </div>
        <button
          onClick={() => setShowFAQMenu(!showFAQMenu)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: isMobile ? '12px' : '16px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            marginRight: '4px',
            display: isMobile ? 'none' : 'block' // Hide on mobile to save space
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
            fontSize: isMobile ? '12px' : '16px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            marginRight: '4px'
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
            fontSize: isMobile ? '16px' : '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            minWidth: isMobile ? '28px' : '32px', // Smaller touch target on mobile
            minHeight: isMobile ? '28px' : '32px'
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
          padding: isMobile ? '8px 10px' : '12px 16px', // More compact on mobile
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '8px' : '12px', // Smaller gaps on mobile
          // Mobile scroll optimizations
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: isMobile ? '6px' : '8px' // Smaller margins on mobile
            }}
          >
            <div
              style={{
                maxWidth: isMobile ? '90%' : '80%', // Slightly wider on mobile
                padding: isMobile ? '8px 12px' : '10px 14px', // More compact padding
                borderRadius: isMobile ? '16px' : '18px',
                background: message.sender === 'user' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : theme === 'dark' ? '#2a2a2a' : '#f1f3f4',
                color: message.sender === 'user' ? 'white' : theme === 'dark' ? '#fff' : '#333',
                fontSize: isMobile ? '13px' : '14px', // Smaller text on mobile
                lineHeight: '1.3',
                wordBreak: 'break-word', // Prevent long words from overflowing
                // Mobile touch optimizations
                WebkitTapHighlightColor: 'transparent'
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
        <div style={{ 
          padding: isMobile ? '0 10px 6px' : '0 12px 8px',
          maxWidth: '100%'
        }}>
          <div style={{ 
            fontSize: isMobile ? '10px' : '11px', 
            color: theme === 'dark' ? '#999' : '#666', 
            marginBottom: isMobile ? '4px' : '6px'
          }}>
            Suggested questions:
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: isMobile ? '4px' : '6px'
          }}>
            {messages[messages.length - 1].suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: isMobile ? '4px 8px' : '6px 10px',
                  borderRadius: '12px',
                  border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
                  background: theme === 'dark' ? '#333' : '#f9f9f9',
                  color: theme === 'dark' ? '#fff' : '#333',
                  fontSize: isMobile ? '10px' : '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  maxWidth: isMobile ? '150px' : '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  // Mobile touch optimizations
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: isMobile ? '28px' : '32px' // Smaller on mobile
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.target.style.background = theme === 'dark' ? '#444' : '#e9e9e9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.target.style.background = theme === 'dark' ? '#333' : '#f9f9f9';
                  }
                }}
                // Mobile touch feedback
                onTouchStart={(e) => {
                  e.target.style.background = theme === 'dark' ? '#555' : '#ddd';
                }}
                onTouchEnd={(e) => {
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
          padding: isMobile ? '8px 10px' : '12px 16px', // More compact on mobile
          borderTop: `1px solid ${theme === 'dark' ? '#333' : '#e1e5e9'}`,
          display: 'flex',
          gap: isMobile ? '6px' : '8px',
          // Mobile keyboard handling - smaller padding
          paddingBottom: isMobile ? '8px' : '12px'
        }}
      >
        {/* Mobile FAQ Button */}
        {isMobile && (
          <button
            onClick={() => setShowFAQMenu(!showFAQMenu)}
            style={{
              width: '36px', // Smaller on mobile
              height: '36px',
              borderRadius: '50%',
              background: theme === 'dark' ? '#333' : '#f1f3f4',
              border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
              color: theme === 'dark' ? '#fff' : '#333',
              fontSize: '14px', // Smaller on mobile
              cursor: 'pointer',
              // Mobile touch optimizations
              WebkitTapHighlightColor: 'transparent',
              minWidth: '36px',
              minHeight: '36px'
            }}
            title="Browse FAQs"
            // Mobile touch feedback
            onTouchStart={(e) => {
              e.target.style.background = theme === 'dark' ? '#444' : '#e9e9e9';
            }}
            onTouchEnd={(e) => {
              e.target.style.background = theme === 'dark' ? '#333' : '#f1f3f4';
            }}
          >
            📚
          </button>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={isMobile ? "Ask..." : "Ask Zelo about jobs, companies, or applications..."} // Shorter on mobile
          style={{
            flex: 1,
            padding: isMobile ? '8px 12px' : '12px 16px', // More compact on mobile
            borderRadius: isMobile ? '16px' : '20px', // Smaller on mobile
            border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
            background: theme === 'dark' ? '#2a2a2a' : '#f9f9f9',
            color: theme === 'dark' ? '#fff' : '#333',
            fontSize: isMobile ? '14px' : '14px', // Keep readable size
            outline: 'none',
            // Mobile optimizations
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent',
            minHeight: isMobile ? '36px' : '44px' // Smaller on mobile
          }}
          // Mobile keyboard optimizations
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isTyping}
          style={{
            width: isMobile ? '36px' : '44px', // Smaller on mobile
            height: isMobile ? '36px' : '44px',
            borderRadius: '50%',
            background: inputValue.trim() && !isTyping
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : theme === 'dark' ? '#333' : '#e1e5e9',
            border: 'none',
            color: inputValue.trim() && !isTyping ? 'white' : theme === 'dark' ? '#999' : '#999',
            cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
            fontSize: isMobile ? '14px' : '18px', // Smaller on mobile
            transition: 'all 0.2s ease',
            // Mobile touch optimizations
            WebkitTapHighlightColor: 'transparent',
            minWidth: isMobile ? '36px' : '44px',
            minHeight: isMobile ? '36px' : '44px'
          }}
          // Mobile touch feedback
          onTouchStart={(e) => {
            if (inputValue.trim() && !isTyping) {
              e.target.style.transform = 'scale(0.95)';
            }
          }}
          onTouchEnd={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
