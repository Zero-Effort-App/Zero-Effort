// Zelo's Advanced Knowledge Base for Job Search Assistance

export const zeloResponses = {
  greetings: {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    responses: [
      "👋 Hi there! I'm Zelo, your AI job search assistant! Ready to find your dream job?",
      "😊 Great to see you! I'm here to help you navigate the job market. What are you looking for today?",
      "🎯 Hello! Let's find you the perfect opportunity! What type of role interests you?"
    ],
    suggestions: ['Show me available jobs', 'Find tech positions', 'Tell me about companies']
  },

  jobSearch: {
    patterns: ['job', 'position', 'opening', 'vacancy', 'work', 'employment', 'career'],
    responses: {
      available: (jobsCount) => ({
        text: `🎯 There are currently **${jobsCount} active job openings** available! I can help you find the perfect match. Would you like me to show you all positions or filter by something specific?`,
        suggestions: ['Show me all jobs', 'Find IT positions', 'Filter by department']
      }),
      
      it: (itJobs) => ({
        text: `💻 I found **${itJobs.length} IT/tech positions** available:\n\n${itJobs.slice(0, 3).map(job => 
          `• **${job.title}** at ${job.companies.name}\n  ${job.type || 'Full-time'}${job.department ? ` • ${job.department}` : ''}`
        ).join('\n\n')}\n\nWant details about any of these tech roles?`,
        suggestions: ['Tell me more', 'Show all tech jobs', 'What about entry-level?']
      }),

      marketing: (marketingJobs) => ({
        text: `📈 Found **${marketingJobs.length} marketing positions**:\n\n${marketingJobs.slice(0, 3).map(job => 
          `• **${job.title}** at ${job.companies.name}\n  ${job.type || 'Full-time'}`
        ).join('\n\n')}\n\nInterested in any of these marketing roles?`,
        suggestions: ['Show more marketing jobs', 'What about sales?', 'Find creative roles']
      }),

      remote: (remoteJobs) => ({
        text: `🏠 **${remoteJobs.length} remote positions** available:\n\n${remoteJobs.slice(0, 3).map(job => 
          `• **${job.title}** at ${job.companies.name}\n  Remote • ${job.type || 'Full-time'}`
        ).join('\n\n')}\n\nWant to see more remote opportunities?`,
        suggestions: ['Show all remote jobs', 'Hybrid positions?', 'Office-based roles']
      }),

      entryLevel: (entryJobs) => ({
        text: `🌱 **${entryJobs.length} entry-level positions** perfect for starting your career:\n\n${entryJobs.slice(0, 3).map(job => 
          `• **${job.title}** at ${job.companies.name}\n  ${job.type || 'Full-time'}`
        ).join('\n\n')}\n\nThese are great opportunities to grow!`,
        suggestions: ['Show more entry jobs', 'Internships?', 'What skills do I need?']
      })
    }
  },

  companyInfo: {
    patterns: ['company', 'companies', 'employer', 'organization', 'business'],
    responses: {
      hiring: (companies, jobsCount) => ({
        text: `🏢 **${companies.length} companies** are actively hiring! Here are the top recruiters:\n\n${companies.slice(0, 4).map(company => {
          const jobCount = jobsCount.filter(job => job.company_id === company.id).length;
          return `• **${company.name}**\n  ${company.industry || 'Technology'} • ${jobCount} opening${jobCount !== 1 ? 's' : ''}`;
        }).join('\n\n')}\n\nWould you like to know more about any of these companies?`,
        suggestions: ['Tell me about tech companies', 'Which has most jobs?', 'Company cultures?']
      }),

      tech: (techCompanies) => ({
        text: `🚀 **${techCompanies.length} technology companies** in the park:\n\n${techCompanies.slice(0, 4).map(company => 
          `• **${company.name}**\n  ${company.industry || 'Technology'}`
        ).join('\n\n')}\n\nThese companies offer innovative work environments!`,
        suggestions: ['Which tech companies hire?', 'Startup opportunities?', 'Large tech firms?']
      }),

      culture: () => ({
        text: "🏛️ Each company has its unique culture! Here's what you can discover:\n\n• **Company profiles** show values and mission\n• **Job descriptions** reveal team dynamics\n• **Employee benefits** indicate work-life balance\n• **Growth opportunities** show career paths\n\nWhat type of work environment appeals to you?",
        suggestions: ['Innovative cultures', 'Traditional companies', 'Startup vibes', 'Work-life balance']
      })
    }
  },

  applicationHelp: {
    patterns: ['apply', 'application', 'resume', 'cv', 'cover letter', 'interview'],
    responses: {
      process: () => ({
        text: "📝 Here's your application roadmap:\n\n1. **🔍 Find Jobs** - Browse and filter positions\n2. **📋 Update Profile** - Add resume and skills\n3. **🎯 Apply** - Submit applications directly\n4. **📊 Track** - Monitor application status\n5. **📞 Prepare** - Get ready for interviews\n\nWhere would you like to start?",
        suggestions: ['Browse jobs now', 'Update my profile', 'Application tips']
      }),

      resume: () => ({
        text: "📄 **Resume Tips for Success:**\n\n• **Tailor** your resume to each job\n• **Highlight** relevant achievements\n• **Use keywords** from job descriptions\n• **Keep it concise** - 1-2 pages max\n• **Proofread** carefully\n• **Save as PDF** for consistency\n\nWant me to help you find jobs matching your resume?",
        suggestions: ['Find matching jobs', 'Resume templates', 'Skill keywords']
      }),

      interview: () => ({
        text: "🎤 **Interview Preparation Guide:**\n\n**Before:**\n• Research the company thoroughly\n• Practice common questions\n• Prepare your own questions\n• Plan your outfit and logistics\n\n**During:**\n• Be authentic and enthusiastic\n• Use STAR method for behavioral questions\n• Ask thoughtful questions\n• Send thank-you note\n\nNeed specific interview advice?",
        suggestions: ['Common questions', 'Technical interviews', 'Salary negotiation']
      })
    }
  },

  skills: {
    patterns: ['skill', 'qualification', 'requirement', 'experience', 'ability'],
    responses: {
      general: () => ({
        text: "🎓 **Skills & Requirements Guide:**\n\n**Technical Skills:**\n• Programming languages, tools, software\n• Certifications and technical knowledge\n\n**Soft Skills:**\n• Communication, teamwork, leadership\n• Problem-solving, adaptability\n\n**Experience:**\n• Years in field/role\n• Project achievements\n• Industry knowledge\n\nWhat specific skills do you have? I can find matching jobs!",
        suggestions: ["I have programming skills", "I'm good with people", "Creative skills", "Analytical background"]
      }),

      programming: () => ({
        text: "💻 **Programming & Tech Skills:**\n\nHigh-demand skills include:\n• **JavaScript/React** - Frontend development\n• **Python** - Data science, AI, backend\n• **Java/C#** - Enterprise applications\n• **SQL** - Database management\n• **Cloud platforms** - AWS, Azure, GCP\n\nWhich programming languages do you know?",
        suggestions: ['JavaScript jobs', 'Python positions', 'Full-stack roles', 'DevOps opportunities']
      })
    }
  },

  careerAdvice: {
    patterns: ['career', 'advice', 'growth', 'development', 'future', 'path'],
    responses: {
      general: () => ({
        text: "🚀 **Career Development Insights:**\n\n**Growth Strategies:**\n• **Continuous learning** - Online courses, certifications\n• **Networking** - Industry events, LinkedIn\n• **Mentorship** - Find experienced guides\n• **Side projects** - Build your portfolio\n\n**Industry Trends:**\n• Remote work opportunities expanding\n• AI/ML skills increasingly valuable\n• Soft skills matter more than ever\n\nWhat's your career focus area?",
        suggestions: ['Tech career paths', 'Leadership development', 'Industry trends', 'Skill development']
      })
    }
  },

  help: {
    patterns: ['help', 'what can you do', 'capabilities', 'features', 'how to use'],
    responses: {
      overview: () => ({
        text: "🤖 **Zelo's Superpowers:**\n\n🔍 **Job Discovery**\n• Find current openings\n• Filter by skills, type, company\n• Personalized recommendations\n\n🏢 **Company Intelligence**\n• Research hiring companies\n• Compare cultures & benefits\n• Industry insights\n\n📋 **Application Guidance**\n• Resume optimization tips\n• Interview preparation\n• Application tracking\n\n💡 **Career Coaching**\n• Skill development advice\n• Industry trend analysis\n• Growth strategies\n\nWhat would you like to explore first?",
        suggestions: ['Find jobs now', 'Research companies', 'Application help', 'Career advice']
      })
    }
  },

  fallback: {
    responses: [
      "🤔 I'm not sure about that, but I'm great at finding jobs and company info! Try asking about available positions or hiring companies.",
      "😅 Let me help with what I know best - jobs, companies, and applications! What type of work are you looking for?",
      "🎯 I can definitely help with your job search! Ask me about available positions, company information, or application tips."
    ],
    suggestions: ['Show available jobs', 'Which companies hire?', 'Help with applications', 'Career advice']
  }
};

export const analyzeUserIntent = (input) => {
  const lowerInput = input.toLowerCase();
  
  // Check each category
  for (const [category, data] of Object.entries(zeloResponses)) {
    if (category === 'fallback') continue;
    
    if (data.patterns) {
      const hasMatch = data.patterns.some(pattern => 
        lowerInput.includes(pattern.toLowerCase())
      );
      
      if (hasMatch) {
        return { category, intent: category, matched: true };
      }
    }
  }
  
  return { category: 'fallback', intent: 'fallback', matched: false };
};

export const generateZeloResponse = async (input, jobsData, companiesData) => {
  const intent = analyzeUserIntent(input);
  const category = zeloResponses[intent.category];
  
  if (!category || intent.category === 'fallback') {
    const fallbackResponses = zeloResponses.fallback.responses;
    return {
      text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      suggestions: zeloResponses.fallback.suggestions
    };
  }

  // Handle specific response types based on context
  if (intent.category === 'jobSearch') {
    if (input.includes('available') || input.includes('open') || input.includes('current')) {
      return category.responses.available(jobsData.length);
    }
    
    if (input.includes('it') || input.includes('tech') || input.includes('software') || input.includes('developer')) {
      const itJobs = jobsData.filter(job => 
        job.title.toLowerCase().includes('developer') || 
        job.title.toLowerCase().includes('software') || 
        job.title.toLowerCase().includes('it') ||
        job.department?.toLowerCase().includes('it') ||
        job.department?.toLowerCase().includes('tech')
      );
      return category.responses.it(itJobs);
    }
    
    if (input.includes('marketing') || input.includes('sales') || input.includes('creative')) {
      const marketingJobs = jobsData.filter(job => 
        job.title.toLowerCase().includes('marketing') || 
        job.title.toLowerCase().includes('sales') ||
        job.department?.toLowerCase().includes('marketing')
      );
      return category.responses.marketing(marketingJobs);
    }
    
    if (input.includes('remote') || input.includes('work from home') || input.includes('wfh')) {
      const remoteJobs = jobsData.filter(job => 
        job.type?.toLowerCase().includes('remote') ||
        job.title.toLowerCase().includes('remote')
      );
      return category.responses.remote(remoteJobs);
    }
    
    if (input.includes('entry') || input.includes('junior') || input.includes('starter') || input.includes('beginner')) {
      const entryJobs = jobsData.filter(job => 
        job.title.toLowerCase().includes('junior') ||
        job.title.toLowerCase().includes('entry') ||
        job.title.toLowerCase().includes('associate')
      );
      return category.responses.entryLevel(entryJobs);
    }
  }

  if (intent.category === 'companyInfo') {
    if (input.includes('hiring') || input.includes('recruiting') || input.includes('looking for')) {
      const hiringCompanies = [...new Set(jobsData.map(job => job.companies))];
      return category.responses.hiring(hiringCompanies, jobsData);
    }
    
    if (input.includes('tech') || input.includes('it') || input.includes('software')) {
      const techCompanies = companiesData.filter(company => 
        company.industry?.toLowerCase().includes('tech') || 
        company.industry?.toLowerCase().includes('it') ||
        company.industry?.toLowerCase().includes('software')
      );
      return category.responses.tech(techCompanies);
    }
    
    if (input.includes('culture') || input.includes('environment') || input.includes('vibe')) {
      return category.responses.culture();
    }
  }

  if (intent.category === 'applicationHelp') {
    if (input.includes('process') || input.includes('how') || input.includes('steps')) {
      return category.responses.process();
    }
    
    if (input.includes('resume') || input.includes('cv')) {
      return category.responses.resume();
    }
    
    if (input.includes('interview')) {
      return category.responses.interview();
    }
  }

  if (intent.category === 'skills') {
    if (input.includes('programming') || input.includes('coding') || input.includes('developer')) {
      return category.responses.programming();
    }
    
    return category.responses.general();
  }

  if (intent.category === 'careerAdvice') {
    return category.responses.general();
  }

  if (intent.category === 'help') {
    return category.responses.overview();
  }

  // Default responses for greetings
  if (intent.category === 'greetings') {
    const responses = category.responses;
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      suggestions: category.suggestions
    };
  }

  // Fallback for unhandled specific cases
  return {
    text: "🤔 I can help with jobs, companies, and applications! Could you rephrase your question or try one of the suggested topics?",
    suggestions: ['Show available jobs', 'Which companies hire?', 'Application help']
  };
};
