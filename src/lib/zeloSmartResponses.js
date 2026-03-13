// Zelo's Smart Response System with Database Integration

import { zeloIntelligence } from './zeloIntelligence';
import { salaryInsights } from './salaryInsights';
import { zeloFAQ } from './zeloFAQ';

export class ZeloSmartResponses {
  constructor() {
    this.userContext = null;
  }

  setUserContext(userProfile, applications = []) {
    this.userContext = {
      profile: userProfile,
      applications: applications,
      lastUpdated: Date.now()
    };
  }

  async processSmartQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    try {
      // First check if it's a FAQ query
      if (this.isFAQQuery(lowerQuery)) {
        return await this.handleFAQQuery(query);
      }

      // Job search queries with intelligence
      if (this.isJobSearchQuery(lowerQuery)) {
        return await this.handleIntelligentJobSearch(query);
      }

      // Company intelligence queries
      if (this.isCompanyQuery(lowerQuery)) {
        return await this.handleCompanyIntelligence(query);
      }

      // Application tracking queries
      if (this.isApplicationQuery(lowerQuery)) {
        return await this.handleApplicationTracking(query);
      }

      // Recommendation queries
      if (this.isRecommendationQuery(lowerQuery)) {
        return await this.handleSmartRecommendations(query);
      }

      // Market insights queries
      if (this.isMarketQuery(lowerQuery)) {
        return await this.handleMarketInsights(query);
      }

      // Personalized advice queries
      if (this.isPersonalAdviceQuery(lowerQuery)) {
        return await this.handlePersonalAdvice(query);
      }

      // Fallback to enhanced general response with FAQ suggestions
      return this.generateEnhancedResponse(query);
    } catch (error) {
      console.error('Error in smart query processing:', error);
      return {
        text: "🤖 I'm processing your request, but encountered an issue. Could you try rephrasing your question?",
        suggestions: ['Show available jobs', 'Track my applications', 'Company information', 'Browse FAQs']
      };
    }
  }

  isFAQQuery(query) {
    const faqKeywords = ['how to', 'how do i', 'what is', 'what are', 'help with', 'faq', 'question', 'forgot', 'can\'t', 'unable to', 'issue', 'problem'];
    return faqKeywords.some(keyword => query.includes(keyword));
  }

  async handleFAQQuery(query) {
    // Search FAQs first
    const faqResults = zeloFAQ.searchFAQs(query, 3);
    
    if (faqResults.length > 0) {
      // Return the best matching FAQ
      const bestFAQ = faqResults[0];
      const response = zeloFAQ.formatFAQResponse(bestFAQ);
      
      // Add other FAQ suggestions if there are multiple matches
      if (faqResults.length > 1) {
        response.suggestions.unshift('Show more FAQ results');
      }
      
      return response;
    }

    // If no direct FAQ match, provide FAQ categories
    const categories = zeloFAQ.getAllCategories();
    const categoryList = categories.slice(0, 4).map(cat => 
      `${cat.icon} ${cat.name} (${cat.questionCount} questions)`
    ).join('\n');

    return {
      text: `📚 **I can help with frequently asked questions!**\n\n**Popular Categories:**\n${categoryList}\n\n💡 You can ask me about:\n• Getting started with the portal\n• Job search techniques\n• Application process\n• Interview preparation\n• Salary negotiation\n• Technical support\n\nWhat would you like to know?`,
      suggestions: [
        'Getting started guide',
        'How to search jobs',
        'Application tips',
        'Interview preparation',
        'Salary negotiation',
        'Technical help'
      ]
    };
  }

  isJobSearchQuery(query) {
    const jobKeywords = ['job', 'position', 'opening', 'vacancy', 'work', 'career', 'role', 'opportunity'];
    return jobKeywords.some(keyword => query.includes(keyword));
  }

  isCompanyQuery(query) {
    const companyKeywords = ['company', 'companies', 'employer', 'organization', 'business', 'firm'];
    return companyKeywords.some(keyword => query.includes(keyword));
  }

  isApplicationQuery(query) {
    const appKeywords = ['application', 'applied', 'status', 'interview', 'offer', 'rejected', 'pending'];
    return appKeywords.some(keyword => query.includes(keyword));
  }

  isRecommendationQuery(query) {
    const recKeywords = ['recommend', 'suggest', 'should i', 'what should', 'perfect for me', 'good fit'];
    return recKeywords.some(keyword => query.includes(keyword));
  }

  isMarketQuery(query) {
    const marketKeywords = ['market', 'trend', 'demand', 'popular', 'salary', 'average', 'industry', 'pay', 'compensation'];
    return marketKeywords.some(keyword => query.includes(keyword));
  }

  isPersonalAdviceQuery(query) {
    const adviceKeywords = ['advice', 'help me', 'improve', 'better', 'how to', 'tips', 'guidance'];
    return adviceKeywords.some(keyword => query.includes(keyword));
  }

  async handleIntelligentJobSearch(query) {
    const userProfile = this.userContext?.profile;
    const searchResults = await zeloIntelligence.intelligentJobSearch(query, userProfile);

    if (searchResults.jobs.length === 0) {
      return {
        text: `🔍 I couldn't find exact matches for "${query}". Here are some alternatives:\n\n• Try different keywords\n• Check for spelling variations\n• Browse all available jobs\n\nWould you like me to show you all current openings or help you refine your search?`,
        suggestions: ['Show all jobs', 'Browse by department', 'Help me search better']
      };
    }

    const response = `🎯 Found **${searchResults.totalMatches} matching positions**! Here are the top results:\n\n${searchResults.jobs.slice(0, 3).map((job, index) => 
      `**${index + 1}. ${job.title}** at ${job.companies.name}\n   📁 ${job.department || 'General'} • ${job.type || 'Full-time'}\n   📅 Posted ${this.formatDate(job.posted_at)}`
    ).join('\n\n')}`;

    const insights = searchResults.insights.length > 0 ? 
      `\n\n💡 **Insights:**\n${searchResults.insights.map(insight => `• ${insight}`).join('\n')}` : '';

    return {
      text: response + insights,
      suggestions: [
        'Tell me more about the first job',
        'Show more results',
        'Refine my search',
        'Get company information'
      ],
      data: searchResults
    };
  }

  async handleCompanyIntelligence(query) {
    // Extract company name from query
    const companyMatch = query.match(/(?:about|tell me|info on)\s+([^?]+)/i);
    const companyName = companyMatch ? companyMatch[1].trim() : this.extractCompanyFromQuery(query);

    if (!companyName) {
      return {
        text: "🏢 I can provide detailed company information! Which company would you like to know about? I can tell you about:\n\n• Current job openings\n• Company culture insights\n• Department breakdowns\n• Market position\n\nJust mention the company name!",
        suggestions: ['Tell me about tech companies', 'Which companies are hiring?', 'Compare companies']
      };
    }

    const companyInfo = await zeloIntelligence.getCompanyIntelligence(companyName);

    if (companyInfo.error) {
      return {
        text: `❌ I couldn't find information about "${companyName}". Here are some options:\n\n• Check the spelling\n• Try a partial name\n• Browse all hiring companies\n\nWould you like me to show you all available companies?`,
        suggestions: ['Show all companies', 'Search by industry', 'Top hiring companies']
      };
    }

    const { company, jobs, insights } = companyInfo;
    
    let response = `🏢 **${company.name}**\n\n📊 **Company Overview:**\n• Industry: ${company.industry || 'Technology'}\n• Status: ${company.is_active ? 'Active' : 'Inactive'}\n• Open Positions: ${insights.totalJobs}\n• Market Position: ${insights.marketPosition}\n\n`;

    if (insights.departments.length > 0) {
      response += `🏗️ **Departments Hiring:** ${insights.departments.join(', ')}\n\n`;
    }

    if (jobs.length > 0) {
      response += `💼 **Current Openings:**\n${jobs.slice(0, 3).map((job, index) => 
        `**${index + 1}.** ${job.title} (${job.department || 'General'})`
      ).join('\n')}`;
    }

    return {
      text: response,
      suggestions: [
        'Show all jobs at this company',
        'Compare with other companies',
        'Application tips for this company'
      ],
      data: companyInfo
    };
  }

  async handleApplicationTracking(query) {
    if (!this.userContext?.profile) {
      return {
        text: "📋 To track your applications, I'll need to access your profile. Please make sure you're logged in, and I can provide detailed insights about your application status!",
        suggestions: ['Login to track applications', 'Browse jobs instead', 'Application tips']
      };
    }

    const insights = await zeloIntelligence.getApplicationInsights(this.userContext.profile.id);
    
    let response = `📊 **Your Application Dashboard**\n\n📈 **Statistics:**\n• Total Applications: ${insights.totalApplications}\n• Pending: ${insights.pendingApplications}\n• Interview Stage: ${insights.interviewStage}\n• Accepted: ${insights.acceptedApplications}\n• Success Rate: ${insights.successRate}%\n`;

    if (insights.recommendations.length > 0) {
      response += `\n💡 **Recommendations:**\n${insights.recommendations.map(rec => `• ${rec}`).join('\n')}\n`;
    }

    if (insights.marketTrends.hotSkills.length > 0) {
      response += `\n🔥 **Hot Skills in Market:** ${insights.marketTrends.hotSkills.join(', ')}`;
    }

    return {
      text: response,
      suggestions: [
        'Show my recent applications',
        'Improve my success rate',
        'Find jobs matching my skills'
      ],
      data: insights
    };
  }

  async handleSmartRecommendations(query) {
    if (!this.userContext?.profile) {
      return {
        text: "🎯 To provide personalized recommendations, I'd like to know more about you! Based on your skills and preferences, I can suggest the perfect opportunities.\n\nWhat type of work are you looking for?",
        suggestions: ['IT/Tech positions', 'Marketing roles', 'Entry-level jobs', 'Remote work']
      };
    }

    const recommendations = await zeloIntelligence.getSmartRecommendations(
      this.userContext.profile, 
      this.userContext.applications
    );

    if (recommendations.length === 0) {
      return {
        text: "🤔 I don't have enough information to make personalized recommendations yet. Let me help you in other ways:\n\n• Browse all available jobs\n• Update your profile with skills\n• Tell me about your experience\n\nWhat would you prefer?",
        suggestions: ['Browse all jobs', 'Update my profile', 'General job search']
      };
    }

    const response = `🎯 **Personalized Recommendations for You**\n\n${recommendations.slice(0, 3).map((job, index) => 
      `**${index + 1}. ${job.title}** at ${job.companies.name}\n   💡 ${job.recommendationReason}\n   📁 ${job.department || 'General'} • ${job.type || 'Full-time'}`
    ).join('\n\n')}`;

    return {
      text: response,
      suggestions: [
        'Tell me more about these jobs',
        'Update my preferences',
        'Show more recommendations'
      ],
      data: recommendations
    };
  }

  async handleMarketInsights(query) {
    const stats = await zeloIntelligence.getLiveStats();
    const recentHires = await zeloIntelligence.getRecentHires();
    const marketData = await salaryInsights.getMarketInsights();

    // Check if this is a salary-specific query
    if (query.toLowerCase().includes('salary') || query.toLowerCase().includes('pay') || query.toLowerCase().includes('compensation')) {
      return this.handleSalaryInsights(query);
    }

    let response = `📊 **Job Market Insights**\n\n🏢 **Market Overview:**\n• Active Companies: ${stats.totalCompanies}\n• Open Positions: ${stats.totalJobs}\n• Total Applications: ${stats.totalApplications}\n• Active Events: ${stats.totalEvents}\n\n`;

    response += `🔥 **Trending Skills:**\n${marketData.trendingSkills.slice(0, 3).map(skill => 
      `• ${skill.skill}: ${skill.growth} growth (${skill.demand} demand)`
    ).join('\n')}\n\n`;

    response += `🏭 **Hot Industries:**\n${marketData.hotIndustries.slice(0, 3).map(industry => 
      `• ${industry.industry}: ${industry.growth} growth (${industry.positions} positions)`
    ).join('\n')}`;

    if (recentHires.length > 0) {
      response += `\n\n🎉 **Recent Hiring Activity:** ${recentHires.length} people hired recently`;
    }

    return {
      text: response,
      suggestions: [
        'Salary information',
        'Negotiation tips',
        'Industry breakdown',
        'Skill trends'
      ],
      data: { stats, recentHires, marketData }
    };
  }

  async handleSalaryInsights(query) {
    // Extract job title from query
    const jobTitleMatch = query.match(/(?:salary|pay|compensation for?|what does? a?)([^?]+)/i);
    const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : 'Software Engineer';

    const salary = salaryInsights.estimateSalary(jobTitle);
    const negotiationTips = salaryInsights.getNegotiationTips(jobTitle, 'mid');
    const marketData = await salaryInsights.getMarketInsights();

    let response = `💰 **Salary Insights for ${jobTitle}**\n\n📈 **Estimated Salary:**\n• Base: $${salary.estimated.toLocaleString()}/year\n• Range: $${salary.range.min.toLocaleString()} - $${salary.range.max.toLocaleString()}/year\n• Confidence: ${salary.confidence}\n\n`;

    response += `🎯 **Market Trends:**\n• Tech salaries growing ${marketData.salaryTrends.Technology} annually\n• High-demand skills see 10-15% premium\n• Remote positions often pay 5-10% more\n\n`;

    response += `💡 **Quick Negotiation Tips:**\n${negotiationTips.tips.slice(0, 3).map((tip, index) => 
      `${index + 1}. ${tip}`
    ).join('\n')}`;

    return {
      text: response,
      suggestions: [
        'Compare company salaries',
        'Detailed negotiation guide',
        'Benefits breakdown',
        'Other job salaries'
      ],
      data: { salary, negotiationTips, marketData }
    };
  }

  async handlePersonalAdvice(query) {
    const userProfile = this.userContext?.profile;
    
    if (!userProfile) {
      return {
        text: "💡 **General Career Advice:**\n\n📋 **Application Strategy:**\n• Apply to 5-10 jobs weekly for best results\n• Tailor your resume for each position\n• Follow up within a week of applying\n\n🎯 **Skill Development:**\n• Focus on in-demand skills in your field\n• Consider certifications for credibility\n• Build a portfolio of projects\n\n🤝 **Networking:**\n• Connect with professionals on LinkedIn\n• Attend industry events\n• Request informational interviews\n\nWhat specific area would you like advice on?",
        suggestions: ['Resume writing tips', 'Interview preparation', 'Skill development', 'Job search strategy']
      };
    }

    // Personalized advice based on user data
    const insights = await zeloIntelligence.getApplicationInsights(userProfile.id);
    
    let advice = "💡 **Personalized Career Advice**\n\n";

    if (insights.successRate < 20 && insights.totalApplications > 5) {
      advice += "📈 **Application Strategy:**\n• Your success rate could improve - consider refining your resume\n• Target positions that closely match your experience\n• Practice interview skills with mock interviews\n\n";
    }

    if (insights.applicationRate < 2) {
      advice += "🚀 **Increase Activity:**\n• Aim for 3-5 applications per week\n• Set aside dedicated time for job searching\n• Use job alerts to stay informed\n\n";
    }

    advice += "🎯 **Next Steps:**\n• Update your profile with latest skills\n• Request recommendations from colleagues\n• Consider expanding your search criteria\n\nWhat would you like to focus on improving?";

    return {
      text: advice,
      suggestions: [
        'Improve my resume',
        'Interview preparation',
        'Skill development plan',
        'Search strategy tips'
      ],
      data: insights
    };
  }

  generateEnhancedResponse(query) {
    // Generate contextual FAQ suggestions
    const context = {
      isNewUser: !this.userContext?.profile || this.userContext.applications.length === 0,
      currentPage: 'general' // This could be determined from the current route
    };
    
    const faqSuggestions = zeloFAQ.generateSuggestions(context);
    
    return {
      text: `🤖 I'm here to help with your job search! I can assist with:\n\n🔍 **Smart Job Search** - Find positions matching your skills\n🏢 **Company Intelligence** - Deep insights about employers\n📊 **Application Tracking** - Monitor your progress\n🎯 **Personal Recommendations** - Jobs perfect for you\n📈 **Market Insights** - Industry trends and data\n💡 **Career Advice** - Personalized guidance\n📚 **FAQ & Help** - Quick answers to common questions\n\nTry asking me about specific jobs, companies, your applications, or browse frequently asked questions!`,
      suggestions: [
        'Find jobs for me',
        'Track my applications',
        'Company research',
        'Career advice',
        ...faqSuggestions.slice(0, 2).map(faq => faq.question)
      ]
    };
  }

  extractCompanyFromQuery(query) {
    // Simple company name extraction - could be enhanced with NLP
    const words = query.split(' ');
    const companyIndex = words.findIndex(word => 
      ['company', 'about', 'tell', 'me'].includes(word.toLowerCase())
    );
    
    if (companyIndex >= 0 && companyIndex < words.length - 1) {
      return words.slice(companyIndex + 1).join(' ').replace(/[?!]/g, '');
    }
    return null;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const days = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  }
}

export const zeloSmartResponses = new ZeloSmartResponses();
