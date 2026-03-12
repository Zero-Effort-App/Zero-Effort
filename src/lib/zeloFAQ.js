// Zelo's Comprehensive FAQ System

export const faqDatabase = {
  categories: {
    'Getting Started': {
      icon: '🚀',
      priority: 1,
      questions: [
        {
          id: 'gs1',
          question: 'How do I start using the job portal?',
          answer: '🚀 **Getting Started Guide:**\n\n1. **Create your profile** - Add your skills, experience, and resume\n2. **Browse jobs** - Use filters to find positions that interest you\n3. **Apply directly** - Click "Apply" on any job listing\n4. **Track progress** - Monitor your applications in your dashboard\n5. **Get help** - Ask me (Zelo) anything about jobs or companies!\n\n💡 **Pro Tip:** Complete your profile first to get personalized job recommendations!',
          keywords: ['start', 'begin', 'getting started', 'how to use', 'beginner', 'new'],
          related: ['profile', 'jobs', 'apply']
        },
        {
          id: 'gs2',
          question: 'What information should I include in my profile?',
          answer: '📋 **Profile Essentials:**\n\n**Must-Haves:**\n• ✅ Complete contact information\n• ✅ Work experience (with dates)\n• ✅ Education background\n• ✅ Skills and competencies\n• ✅ Resume/CV upload\n\n**Recommended:**\n• 🎯 Professional summary\n• 🏆 Achievements and awards\n• 💼 Portfolio links\n• 🌐 LinkedIn profile\n• 📱 Professional social media\n\n💡 **Complete profiles get 3x more employer views!**',
          keywords: ['profile', 'information', 'details', 'what to include', 'resume', 'cv'],
          related: ['resume', 'skills', 'experience']
        },
        {
          id: 'gs3',
          question: 'Is the job portal free to use?',
          answer: '💰 **Cost Information:**\n\n✅ **For Job Seekers:**\n• 100% FREE to use\n• Unlimited job applications\n• Free profile creation\n• Access to all features\n• No hidden fees\n\n🏢 **For Companies:**\n• Subscription-based pricing\n• Free trial available\n• Custom packages available\n\n💡 **Your success is our success - no fees for job seekers!**',
          keywords: ['free', 'cost', 'price', 'fee', 'charge', 'payment'],
          related: ['account', 'premium', 'features']
        }
      ]
    },
    'Job Search': {
      icon: '🔍',
      priority: 2,
      questions: [
        {
          id: 'js1',
          question: 'How do I search for jobs effectively?',
          answer: '🔍 **Smart Job Search Strategy:**\n\n**Search Techniques:**\n• 🔑 Use specific keywords (e.g., "React developer" not just "developer")\n• 🏢 Filter by company, department, or job type\n• 📍 Set location preferences\n• 💰 Use salary ranges if applicable\n• 📅 Sort by posting date for newest opportunities\n\n**Advanced Tips:**\n• 🎯 Save search criteria for quick access\n• 📧 Set up job alerts\n• 🔄 Check back daily for new postings\n• 📱 Use the mobile app for on-the-go searching\n\n💡 **I can help you find jobs! Just tell me what you\'re looking for.**',
          keywords: ['search', 'find jobs', 'job search', 'look for', 'techniques'],
          related: ['filters', 'keywords', 'alerts']
        },
        {
          id: 'js2',
          question: 'What job filters are available?',
          answer: '🎛️ **Available Job Filters:**\n\n**Basic Filters:**\n• 🏢 Company name\n• 📁 Department/Category\n• 💼 Job type (Full-time, Part-time, Contract)\n• 📍 Location/Remote options\n• 💰 Salary range\n\n**Advanced Filters:**\n• 📅 Posting date\n• 🎯 Experience level\n• 🏷️ Skills required\n• 📊 Education requirements\n• 🏭 Industry\n\n💡 **Combine multiple filters for the most relevant results!**',
          keywords: ['filters', 'filter options', 'refine', 'narrow down', 'search options'],
          related: ['search', 'job types', 'salary']
        },
        {
          id: 'js3',
          question: 'How often are new jobs posted?',
          answer: '📅 **Job Posting Frequency:**\n\n📊 **Posting Schedule:**\n• 🌞 **Daily:** 50+ new positions\n• 📈 **Weekly:** 300+ new opportunities\n• 🎯 **Peak Times:** Monday-Wednesday mornings\n• 🏢 **Active Companies:** 100+ employers\n\n🔔 **Stay Updated:**\n• Set up job alerts for instant notifications\n• Check "New This Week" section\n• Follow companies of interest\n• Ask me for daily job summaries\n\n💡 **New opportunities appear every day - check back often!**',
          keywords: ['new jobs', 'posting frequency', 'how often', 'updates', 'fresh'],
          related: ['alerts', 'companies', 'search']
        }
      ]
    },
    'Applications': {
      icon: '📝',
      priority: 3,
      questions: [
        {
          id: 'ap1',
          question: 'How do I apply for a job?',
          answer: '📝 **Application Process:**\n\n**Step-by-Step:**\n1. 🔍 **Find the job** - Search or browse listings\n2. 📋 **Review details** - Read requirements carefully\n3. 📄 **Prepare documents** - Update resume if needed\n4. 🎯 **Click "Apply"** - Fill out the application form\n5. ✅ **Submit** - Review and send your application\n6. 📊 **Track** - Monitor status in your dashboard\n\n💡 **Tip:** Tailor your resume for each position for better results!',
          keywords: ['apply', 'application', 'how to apply', 'submit', 'process'],
          related: ['resume', 'track', 'status']
        },
        {
          id: 'ap2',
          question: 'What application statuses mean?',
          answer: '📊 **Application Status Guide:**\n\n🟡 **Pending** - Your application is under review\n🟠 **In Review** - Being evaluated by hiring team\n🔵 **Interview Stage** - Selected for interviews\n🟢 **Accepted** - Congratulations! You got the job\n🔴 **Rejected** - Not selected this time\n⚪ **Withdrawn** - You removed your application\n\n⏱️ **Typical Timeline:**\n• Review: 3-7 days\n• Response: 1-2 weeks\n• Interview process: 2-4 weeks\n\n💡 **I can help you track your application status!**',
          keywords: ['status', 'pending', 'accepted', 'rejected', 'interview', 'what does'],
          related: ['track', 'interview', 'follow up']
        },
        {
          id: 'ap3',
          question: 'Can I withdraw my application?',
          answer: '↩️ **Withdrawing Applications:**\n\n✅ **Yes, you can withdraw anytime!**\n\n**How to Withdraw:**\n1. 📊 Go to "My Applications"\n2. 🎯 Find the specific application\n3. ⚙️ Click "Options" or "More"\n4. ↩️ Select "Withdraw Application"\n5. ✅ Confirm your decision\n\n**Important Notes:**\n• 🚫 Cannot undo withdrawal\n• 📧 Company will be notified\n• 🔄 You can reapply later if position is still open\n\n💡 **Withdraw professionally - it maintains your reputation!**',
          keywords: ['withdraw', 'remove', 'cancel', 'delete application', 'undo'],
          related: ['apply', 'status', 'reapply']
        }
      ]
    },
    'Resume & Profile': {
      icon: '📄',
      priority: 4,
      questions: [
        {
          id: 'rp1',
          question: 'How to write a good resume?',
          answer: '📄 **Resume Writing Guide:**\n\n**Structure:**\n1. 🎯 **Contact Info** - Name, phone, email, LinkedIn\n2. 📝 **Professional Summary** - 2-3 sentence pitch\n3. 💼 **Experience** - Reverse chronological order\n4. 🎓 **Education** - Degrees and certifications\n5. 🛠️ **Skills** - Technical and soft skills\n6. 🏆 **Achievements** - Quantifiable results\n\n**Best Practices:**\n• 📏 Keep it 1-2 pages max\n• 🔍 Use keywords from job descriptions\n• 📊 Include metrics and achievements\n• ✅ Proofread carefully\n• 🎨 Clean, professional format\n\n💡 **I can review your resume and provide suggestions!**',
          keywords: ['resume', 'cv', 'write', 'format', 'tips', 'good resume'],
          related: ['profile', 'skills', 'experience']
        },
        {
          id: 'rp2',
          question: 'What skills should I include?',
          answer: '🛠️ **Skills to Include:**\n\n**Technical Skills (by category):**\n• 💻 **Programming:** JavaScript, Python, Java, C#\n• 🌐 **Web:** React, Node.js, HTML/CSS, SQL\n• ☁️ **Cloud:** AWS, Azure, Google Cloud\n• 📊 **Data:** Excel, Tableau, Power BI\n• 🎨 **Design:** Figma, Adobe Creative Suite\n\n**Soft Skills:**\n• 🗣️ Communication\n• 👥 Teamwork\n• 🎯 Problem-solving\n• ⏰ Time management\n• 🧠 Critical thinking\n\n💡 **Include skills that match your target jobs!**',
          keywords: ['skills', 'what skills', 'technical skills', 'soft skills', 'abilities'],
          related: ['resume', 'profile', 'jobs']
        },
        {
          id: 'rp3',
          question: 'How to update my profile?',
          answer: '🔄 **Updating Your Profile:**\n\n**Steps to Update:**\n1. 👤 Go to "My Profile"\n2. ✏️ Click "Edit Profile"\n3. 📝 Update any section\n4. 💾 Save changes\n\n**What to Update Regularly:**\n• 📞 Contact information\n• 💼 Current job title\n• 🛠️ New skills learned\n• 🏆 Recent achievements\n• 📚 New certifications\n• 🎯 Career objectives\n\n⏰ **Update Frequency:**\n• 📅 Monthly reviews recommended\n• 🚀 After completing new projects\n• 📚 When learning new skills\n\n💡 **Keep your profile fresh for the best opportunities!**',
          keywords: ['update profile', 'edit profile', 'change', 'modify', 'keep current'],
          related: ['profile', 'skills', 'experience']
        }
      ]
    },
    'Interviews': {
      icon: '🎤',
      priority: 5,
      questions: [
        {
          id: 'in1',
          question: 'How to prepare for an interview?',
          answer: '🎤 **Interview Preparation Guide:**\n\n**Before the Interview:**\n• 🏢 Research the company thoroughly\n• 📋 Study the job description\n• 🎯 Prepare your "elevator pitch"\n• 📝 Practice common questions\n• 💡 Prepare questions to ask\n• 👔 Choose professional attire\n\n**Day of Interview:**\n• ⏰ Arrive 10-15 minutes early\n• 📱 Bring copies of your resume\n• 😊 Maintain positive body language\n• 🗣️ Speak clearly and confidently\n• 🤝 Show enthusiasm and interest\n\n**After the Interview:**\n• 📧 Send thank-you note within 24 hours\n• 📝 Reflect on your performance\n• ⏰ Follow up if no response in 1 week\n\n💡 **Practice makes perfect - do mock interviews!**',
          keywords: ['interview preparation', 'prepare', 'practice', 'tips', 'ready'],
          related: ['common questions', 'thank you', 'follow up']
        },
        {
          id: 'in2',
          question: 'Common interview questions?',
          answer: '❓ **Common Interview Questions:**\n\n**About You:**\n• "Tell me about yourself"\n• "What are your strengths/weaknesses?"\n• "Why do you want this job?"\n• "Where do you see yourself in 5 years?"\n\n**Experience-Based:**\n• "Describe a challenging project"\n• "How do you handle pressure?"\n• "Tell me about a time you failed"\n• "How do you work in a team?"\n\n**Situational:**\n• "How would you handle...?"\n• "What would you do if...?"\n\n💡 **Use the STAR method: Situation, Task, Action, Result**',
          keywords: ['interview questions', 'common questions', 'what to expect', 'prepare'],
          related: ['interview preparation', 'star method', 'answers']
        },
        {
          id: 'in3',
          question: 'What to ask the interviewer?',
          answer: '🤔 **Questions to Ask Interviewers:**\n\n**About the Role:**\n• "What does success look like in this position?"\n• "What are the biggest challenges?"\n• "How is performance measured?"\n\n**About the Team:**\n• "Can you describe the team culture?"\n• "How do team members collaborate?"\n• "What are the team\'s current goals?"\n\n**About Growth:**\n• "What development opportunities exist?"\n• "How does the company support learning?"\n• "What career paths are available?"\n\n**About Company:**\n• "What are the company\'s biggest goals?"\n• "How does this role contribute to success?"\n\n💡 **Ask 3-5 thoughtful questions to show your interest!**',
          keywords: ['ask interviewer', 'questions to ask', 'what should I ask', 'interview'],
          related: ['interview preparation', 'company research', 'follow up']
        }
      ]
    },
    'Salary & Benefits': {
      icon: '💰',
      priority: 6,
      questions: [
        {
          id: 'sb1',
          question: 'How to research salary expectations?',
          answer: '💰 **Salary Research Guide:**\n\n**Research Sources:**\n• 📊 Industry salary reports\n• 🌐 Glassdoor, LinkedIn Salary\n• 💼 Company career pages\n• 🤝 Professional networks\n• 🎯 Job posting ranges\n\n**Factors to Consider:**\n• 📍 Geographic location\n• 📈 Years of experience\n• 🏫 Education level\n• 🏢 Company size\n• 🏭 Industry standards\n• 🛠️ Specialized skills\n\n**My Help:**\n• Ask me "What\'s the salary for [job title]?"\n• I\'ll provide estimates and trends\n• Get negotiation tips and market data\n\n💡 **Research gives you confidence in negotiations!**',
          keywords: ['salary research', 'salary expectations', 'how much', 'market rate'],
          related: ['negotiation', 'benefits', 'market insights']
        },
        {
          id: 'sb2',
          question: 'How to negotiate salary?',
          answer: '💪 **Salary Negotiation Guide:**\n\n**Preparation:**\n• 📊 Research market rates\n• 🎯 Know your worth\n• 📝 Prepare your case\n• 🎯 Set your range\n\n**During Negotiation:**\n• ⏰ Wait for the offer first\n• 🗣️ Express enthusiasm\n• 📈 Present your research\n• 💼 Highlight your value\n• 🤝 Be flexible\n\n**Key Phrases:**\n• "Based on my research..."\n• "Given my experience in..."\n• "I\'m flexible on..."\n• "Is there room for...?"\n\n💡 **I can provide specific negotiation tips for your role!**',
          keywords: ['negotiate', 'negotiation', 'salary negotiation', 'ask for more'],
          related: ['salary research', 'benefits', 'offer']
        },
        {
          id: 'sb3',
          question: 'What benefits should I look for?',
          answer: '🎁 **Benefits to Consider:**\n\n**Health & Wellness:**\n• 🏥 Health insurance (medical, dental, vision)\n• 💊 Mental health support\n• 🏋️ Gym memberships\n• 🧘 Wellness programs\n\n**Financial:**\n• 💰 401(k)/retirement plans\n• 📈 Stock options/RSUs\n• 💵 Performance bonuses\n• 🏦 Financial planning\n\n**Work-Life:**\n• 🏠 Remote work options\n• ⏰ Flexible hours\n• 📅 Paid time off\n• 🏖️ Parental leave\n\n**Growth:**\n• 📚 Training budgets\n• 🎓 Tuition reimbursement\n• 📈 Career development\n• 👥 Mentorship programs\n\n💡 **Total compensation includes more than just salary!**',
          keywords: ['benefits', 'perks', 'compensation', 'package', 'what to look for'],
          related: ['salary', 'negotiation', 'offer']
        }
      ]
    },
    'Technical Issues': {
      icon: '🔧',
      priority: 7,
      questions: [
        {
          id: 'ti1',
          question: 'I forgot my password, what do I do?',
          answer: '🔐 **Password Recovery:**\n\n**Reset Steps:**\n1. 🔗 Go to login page\n2. 🔘 Click "Forgot Password"\n3. 📧 Enter your email address\n4. 📬 Check your email for reset link\n5. 🔑 Create new password\n6. ✅ Login with new password\n\n**Tips:**\n• 📬 Check spam folder for reset email\n• ⏰ Reset link expires in 24 hours\n• 🔒 Use strong, unique password\n• 📝 Save password securely\n\n**Still Stuck?**\n• 📞 Contact support if email doesn\'t arrive\n• 💬 Ask me for help with account issues\n\n💡 **Use password manager for better security!**',
          keywords: ['forgot password', 'reset password', 'can\'t login', 'password recovery'],
          related: ['login', 'account', 'security']
        },
        {
          id: 'ti2',
          question: 'Why can\'t I upload my resume?',
          answer: '📄 **Resume Upload Issues:**\n\n**Common Problems:**\n• 📏 File size too large (max 5MB)\n• 📄 Unsupported format (use PDF, DOC, DOCX)\n• 🐛 Browser issues\n• 🌐 Network connection\n\n**Solutions:**\n1. 📏 Check file size (compress if needed)\n2. 📄 Convert to PDF format\n3. 🔄 Try different browser\n4. 🌐 Check internet connection\n5. 🔄 Clear browser cache\n6. 📱 Try mobile app\n\n**Still Having Issues?**\n• 📧 Contact technical support\n• 💬 Describe the error message\n• 🖼️ Screenshot helps diagnose\n\n💡 **PDF format works best for resume uploads!**',
          keywords: ['upload resume', 'can\'t upload', 'file upload', 'error', 'issue'],
          related: ['profile', 'resume', 'technical support']
        },
        {
          id: 'ti3',
          question: 'How to contact technical support?',
          answer: '📞 **Technical Support Options:**\n\n**Contact Methods:**\n• 📧 Email: support@zeroeffort.com\n• 💬 Live chat: Available 9 AM - 6 PM\n• 📱 Phone: 1-800-ZERO-EFF\n• 📝 Support ticket: Submit in portal\n\n**Response Times:**\n• ⚡ **Urgent issues:** 1-2 hours\n• 🔥 **High priority:** 4-8 hours\n• 📊 **Standard:** 24-48 hours\n• 📝 **General:** 3-5 days\n\n**Before Contacting:**\n• 🔍 Check FAQ section\n• 🔄 Try basic troubleshooting\n• 📸 Prepare error details\n• 🖥️ Note browser and device\n\n💡 **I can help solve many issues instantly!**',
          keywords: ['support', 'help', 'contact', 'technical support', 'customer service'],
          related: ['forgot password', 'upload issues', 'bugs']
        }
      ]
    }
  },

  // Quick access categories for common needs
  quickAccess: {
    'Popular': ['gs1', 'js1', 'ap1', 'in1'],
    'First Time User': ['gs1', 'gs2', 'js1', 'ap1'],
    'Job Search Help': ['js1', 'js2', 'js3', 'rp1'],
    'Application Help': ['ap1', 'ap2', 'ap3', 'rp1'],
    'Interview Prep': ['in1', 'in2', 'in3'],
    'Salary & Benefits': ['sb1', 'sb2', 'sb3']
  }
};

export class ZeloFAQ {
  constructor() {
    this.faqData = faqDatabase;
    this.searchIndex = this.buildSearchIndex();
  }

  buildSearchIndex() {
    const index = {};
    
    Object.values(this.faqData.categories).forEach(category => {
      category.questions.forEach(faq => {
        // Index by question
        const questionWords = faq.question.toLowerCase().split(' ');
        questionWords.forEach(word => {
          if (word.length > 2) {
            if (!index[word]) index[word] = [];
            index[word].push(faq.id);
          }
        });

        // Index by keywords
        faq.keywords.forEach(keyword => {
          const keyWords = keyword.toLowerCase().split(' ');
          keyWords.forEach(word => {
            if (word.length > 2) {
              if (!index[word]) index[word] = [];
              if (!index[word].includes(faq.id)) {
                index[word].push(faq.id);
              }
            }
          });
        });
      });
    });

    return index;
  }

  searchFAQs(query, limit = 5) {
    const words = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const scores = {};

    words.forEach(word => {
      const matches = this.searchIndex[word] || [];
      matches.forEach(faqId => {
        scores[faqId] = (scores[faqId] || 0) + 1;
      });
    });

    // Sort by score and get top results
    const sortedResults = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([faqId]) => this.getFAQById(faqId));

    return sortedResults;
  }

  getFAQById(id) {
    for (const category of Object.values(this.faqData.categories)) {
      const faq = category.questions.find(q => q.id === id);
      if (faq) {
        return {
          ...faq,
          category: Object.keys(this.faqData.categories).find(
            catName => this.faqData.categories[catName] === category
          )
        };
      }
    }
    return null;
  }

  getFAQsByCategory(categoryName) {
    const category = this.faqData.categories[categoryName];
    if (!category) return [];

    return category.questions.map(faq => ({
      ...faq,
      category: categoryName
    }));
  }

  getQuickAccessFAQs(accessType) {
    const faqIds = this.faqData.quickAccess[accessType] || [];
    return faqIds.map(id => this.getFAQById(id)).filter(Boolean);
  }

  getAllCategories() {
    return Object.entries(this.faqData.categories).map(([name, data]) => ({
      name,
      icon: data.icon,
      questionCount: data.questions.length,
      priority: data.priority
    })).sort((a, b) => a.priority - b.priority);
  }

  getRelatedFAQs(faqId, limit = 3) {
    const faq = this.getFAQById(faqId);
    if (!faq || !faq.related) return [];

    const related = [];
    faq.related.forEach(topic => {
      const results = this.searchFAQs(topic, 2);
      related.push(...results.filter(r => r.id !== faqId));
    });

    return related.slice(0, limit);
  }

  // Generate FAQ suggestions based on context
  generateSuggestions(context = {}) {
    const suggestions = [];

    // Based on user profile
    if (context.isNewUser) {
      suggestions.push(...this.getQuickAccessFAQs('First Time User'));
    }

    // Based on current page/activity
    if (context.currentPage === 'jobs') {
      suggestions.push(...this.getQuickAccessFAQs('Job Search Help'));
    }

    if (context.currentPage === 'applications') {
      suggestions.push(...this.getQuickAccessFAQs('Application Help'));
    }

    // Default popular FAQs
    if (suggestions.length === 0) {
      suggestions.push(...this.getQuickAccessFAQs('Popular'));
    }

    return suggestions.slice(0, 3);
  }

  // Format FAQ for chat response
  formatFAQResponse(faq) {
    return {
      text: faq.answer,
      suggestions: [
        'Tell me more',
        ...this.getRelatedFAQs(faq.id).map(r => r.question),
        'Ask something else'
      ],
      metadata: {
        type: 'faq',
        category: faq.category,
        faqId: faq.id
      }
    };
  }
}

export const zeloFAQ = new ZeloFAQ();
