// Zelo's Advanced Intelligence Engine - Real-time Database Integration

import { 
  getJobs, 
  getCompanies, 
  getMyApplications, 
  getCompanyJobs,
  getCompanyProfile,
  getRecentHires,
  getLiveStats
} from './db';

// Advanced query processing and intelligent responses
export class ZeloIntelligence {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Cache management
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  // Smart job search with multiple filters
  async intelligentJobSearch(query, userProfile = null) {
    const cacheKey = `jobs_${JSON.stringify(query)}_${userProfile?.id || 'anonymous'}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      let jobs = await getJobs(true);
      let companies = await getCompanies(true);

      // Apply intelligent filters based on query
      const filters = this.parseQueryFilters(query);
      
      if (filters.keywords?.length > 0) {
        jobs = this.filterByKeywords(jobs, filters.keywords);
      }

      if (filters.department) {
        jobs = this.filterByDepartment(jobs, filters.department);
      }

      if (filters.type) {
        jobs = this.filterByJobType(jobs, filters.type);
      }

      if (filters.experience) {
        jobs = this.filterByExperience(jobs, filters.experience);
      }

      if (filters.company) {
        jobs = this.filterByCompany(jobs, filters.company, companies);
      }

      // Personalized ranking if user profile available
      if (userProfile) {
        jobs = this.rankJobsForUser(jobs, userProfile);
      }

      const result = {
        jobs: jobs.slice(0, 10), // Top 10 results
        totalMatches: jobs.length,
        filters: filters,
        insights: this.generateJobInsights(jobs, filters)
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error in intelligent job search:', error);
      throw error;
    }
  }

  // Parse natural language query into structured filters
  parseQueryFilters(query) {
    const filters = {};
    const lowerQuery = query.toLowerCase();

    // Keywords extraction
    const keywordPatterns = {
      'javascript|react|frontend|ui|ux': ['javascript', 'react', 'frontend', 'ui', 'ux'],
      'python|data|science|machine learning|ai': ['python', 'data science', 'machine learning', 'ai'],
      'java|spring|backend|enterprise': ['java', 'spring', 'backend', 'enterprise'],
      'marketing|sales|business development': ['marketing', 'sales', 'business development'],
      'design|creative|graphic|visual': ['design', 'creative', 'graphic', 'visual'],
      'accounting|finance|financial': ['accounting', 'finance', 'financial']
    };

    for (const [pattern, keywords] of Object.entries(keywordPatterns)) {
      if (new RegExp(pattern).test(lowerQuery)) {
        filters.keywords = keywords;
        break;
      }
    }

    // Department detection
    const departments = ['it', 'engineering', 'marketing', 'sales', 'hr', 'finance', 'operations'];
    for (const dept of departments) {
      if (lowerQuery.includes(dept)) {
        filters.department = dept;
        break;
      }
    }

    // Job type detection
    if (lowerQuery.includes('remote') || lowerQuery.includes('work from home')) {
      filters.type = 'remote';
    } else if (lowerQuery.includes('hybrid')) {
      filters.type = 'hybrid';
    } else if (lowerQuery.includes('onsite') || lowerQuery.includes('office')) {
      filters.type = 'onsite';
    }

    // Experience level
    if (lowerQuery.includes('entry') || lowerQuery.includes('junior') || lowerQuery.includes('beginner')) {
      filters.experience = 'entry';
    } else if (lowerQuery.includes('senior') || lowerQuery.includes('lead') || lowerQuery.includes('experienced')) {
      filters.experience = 'senior';
    } else if (lowerQuery.includes('manager') || lowerQuery.includes('head') || lowerQuery.includes('director')) {
      filters.experience = 'management';
    }

    return filters;
  }

  filterByKeywords(jobs, keywords) {
    return jobs.filter(job => {
      const searchText = `${job.title} ${job.description || ''} ${job.department || ''}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }

  filterByDepartment(jobs, department) {
    return jobs.filter(job => 
      job.department?.toLowerCase() === department.toLowerCase() ||
      job.title.toLowerCase().includes(department.toLowerCase())
    );
  }

  filterByJobType(jobs, type) {
    return jobs.filter(job => 
      job.type?.toLowerCase() === type.toLowerCase() ||
      (job.description || '').toLowerCase().includes(type.toLowerCase())
    );
  }

  filterByExperience(jobs, experience) {
    const experienceKeywords = {
      entry: ['entry', 'junior', 'associate', 'intern'],
      senior: ['senior', 'lead', 'principal', 'expert'],
      management: ['manager', 'head', 'director', 'vp', 'chief']
    };

    const keywords = experienceKeywords[experience] || [];
    return jobs.filter(job => {
      const searchText = `${job.title} ${job.description || ''}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword));
    });
  }

  filterByCompany(jobs, company, companies) {
    const matchedCompanies = companies.filter(c => 
      c.name.toLowerCase().includes(company.toLowerCase())
    );
    
    if (matchedCompanies.length === 0) return jobs;
    
    const companyIds = matchedCompanies.map(c => c.id);
    return jobs.filter(job => companyIds.includes(job.company_id));
  }

  rankJobsForUser(jobs, userProfile) {
    // Simple ranking based on profile data
    return jobs.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // Boost jobs matching user's skills (if available)
      if (userProfile.skills) {
        const aMatch = userProfile.skills.some(skill => 
          a.title.toLowerCase().includes(skill.toLowerCase()) ||
          (a.description || '').toLowerCase().includes(skill.toLowerCase())
        );
        const bMatch = userProfile.skills.some(skill => 
          b.title.toLowerCase().includes(skill.toLowerCase()) ||
          (b.description || '').toLowerCase().includes(skill.toLowerCase())
        );
        
        scoreA += aMatch ? 10 : 0;
        scoreB += bMatch ? 10 : 0;
      }

      // Boost recently posted jobs
      const daysA = Math.floor((Date.now() - new Date(a.posted_at)) / (1000 * 60 * 60 * 24));
      const daysB = Math.floor((Date.now() - new Date(b.posted_at)) / (1000 * 60 * 60 * 24));
      scoreA += Math.max(0, 5 - daysA);
      scoreB += Math.max(0, 5 - daysB);

      return scoreB - scoreA;
    });
  }

  generateJobInsights(jobs, filters) {
    const insights = [];

    if (jobs.length === 0) {
      insights.push("No exact matches found. Try adjusting your search terms.");
      return insights;
    }

    // Top companies
    const companyCounts = jobs.reduce((acc, job) => {
      const companyName = job.companies?.name || 'Unknown';
      acc[companyName] = (acc[companyName] || 0) + 1;
      return acc;
    }, {});

    const topCompany = Object.entries(companyCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (topCompany) {
      insights.push(`🏢 ${topCompany[0]} has the most openings (${topCompany[1]} positions)`);
    }

    // Department insights
    const deptCounts = jobs.reduce((acc, job) => {
      const dept = job.department || 'General';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const topDept = Object.entries(deptCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (topDept && topDept[0] !== 'General') {
      insights.push(`📊 Most jobs are in ${topDept[0]} department`);
    }

    // Job types
    const typeCounts = jobs.reduce((acc, job) => {
      const type = job.type || 'Not specified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const remoteCount = typeCounts['remote'] || 0;
    if (remoteCount > 0) {
      insights.push(`🏠 ${remoteCount} remote positions available`);
    }

    return insights;
  }

  // Company intelligence and comparison
  async getCompanyIntelligence(companyName) {
    try {
      const companies = await getCompanies(true);
      const company = companies.find(c => 
        c.name.toLowerCase().includes(companyName.toLowerCase())
      );

      if (!company) {
        return { error: "Company not found" };
      }

      const jobs = await getCompanyJobs(company.id);
      const stats = await getLiveStats();

      return {
        company,
        jobs: jobs || [],
        insights: {
          totalJobs: jobs.length,
          activeJobs: jobs.filter(j => j.status === 'active').length,
          departments: [...new Set(jobs.map(j => j.department).filter(Boolean))],
          jobTypes: [...new Set(jobs.map(j => j.type).filter(Boolean))],
          marketPosition: this.calculateMarketPosition(company, stats)
        }
      };
    } catch (error) {
      console.error('Error getting company intelligence:', error);
      throw error;
    }
  }

  calculateMarketPosition(company, stats) {
    // Simple market position calculation
    const totalCompanies = stats.totalCompanies || 1;
    const marketShare = (1 / totalCompanies) * 100; // Simplified

    if (marketShare > 20) return "Market Leader";
    if (marketShare > 10) return "Strong Contender";
    if (marketShare > 5) return "Growing Player";
    return "Emerging Company";
  }

  // Application tracking and insights
  async getApplicationInsights(applicantId) {
    try {
      const applications = await getMyApplications(applicantId);
      const recentHires = await getRecentHires();

      const insights = {
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        interviewStage: applications.filter(a => a.status === 'interview').length,
        rejectedApplications: applications.filter(a => a.status === 'rejected').length,
        acceptedApplications: applications.filter(a => a.status === 'accepted').length,
        applicationRate: this.calculateApplicationRate(applications),
        successRate: this.calculateSuccessRate(applications),
        recommendations: this.generateApplicationRecommendations(applications),
        marketTrends: this.analyzeMarketTrends(applications, recentHires)
      };

      return insights;
    } catch (error) {
      console.error('Error getting application insights:', error);
      throw error;
    }
  }

  calculateApplicationRate(applications) {
    if (applications.length === 0) return 0;
    
    const daysSinceFirst = Math.floor((Date.now() - new Date(applications[applications.length - 1].applied_at)) / (1000 * 60 * 60 * 24));
    return daysSinceFirst > 0 ? (applications.length / daysSinceFirst).toFixed(2) : 0;
  }

  calculateSuccessRate(applications) {
    if (applications.length === 0) return 0;
    const successful = applications.filter(a => a.status === 'accepted').length;
    return ((successful / applications.length) * 100).toFixed(1);
  }

  generateApplicationRecommendations(applications) {
    const recommendations = [];

    if (applications.length === 0) {
      recommendations.push("Start applying to jobs to build your application history");
      return recommendations;
    }

    const pendingCount = applications.filter(a => a.status === 'pending').length;
    if (pendingCount > 5) {
      recommendations.push("Consider following up on pending applications");
    }

    const rejectedCount = applications.filter(a => a.status === 'rejected').length;
    const successRate = this.calculateSuccessRate(applications);
    
    if (successRate < 20 && applications.length > 5) {
      recommendations.push("Consider improving your resume or targeting different roles");
    }

    const recentApplications = applications.filter(a => 
      Math.floor((Date.now() - new Date(a.applied_at)) / (1000 * 60 * 60 * 24)) <= 7
    ).length;

    if (recentApplications < 2) {
      recommendations.push("Increase your application rate for better results");
    }

    return recommendations;
  }

  analyzeMarketTrends(applications, recentHires) {
    // Analyze what types of positions are getting hired
    const hiredPositions = recentHires.map(h => h.jobs.title);
    const appliedPositions = applications.map(a => a.jobs.title);

    const trends = {
      hotSkills: this.extractHotSkills(hiredPositions),
      applicationGaps: this.findApplicationGaps(appliedPositions, hiredPositions),
      successPatterns: this.findSuccessPatterns(applications)
    };

    return trends;
  }

  extractHotSkills(positions) {
    // Simple skill extraction from job titles
    const skills = ['javascript', 'python', 'react', 'java', 'marketing', 'sales'];
    const skillCounts = {};

    skills.forEach(skill => {
      skillCounts[skill] = positions.filter(pos => 
        pos.toLowerCase().includes(skill)
      ).length;
    });

    return Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([skill]) => skill);
  }

  findApplicationGaps(applied, hired) {
    // Find positions that are getting hired but user hasn't applied to
    const hiredSet = new Set(hired.map(h => h.toLowerCase()));
    const appliedSet = new Set(applied.map(a => a.toLowerCase()));
    
    const gaps = [...hiredSet].filter(h => !appliedSet.has(h));
    return gaps.slice(0, 3);
  }

  findSuccessPatterns(applications) {
    const successful = applications.filter(a => a.status === 'accepted');
    const patterns = [];

    if (successful.length > 0) {
      const commonTypes = {};
      successful.forEach(app => {
        const type = app.jobs.type || 'unknown';
        commonTypes[type] = (commonTypes[type] || 0) + 1;
      });

      const mostSuccessfulType = Object.entries(commonTypes)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostSuccessfulType) {
        patterns.push(`Most success with ${mostSuccessfulType[0]} positions`);
      }
    }

    return patterns;
  }

  // Proactive job recommendations
  async getSmartRecommendations(userProfile, applicationHistory = []) {
    try {
      const allJobs = await getJobs(true);
      const appliedJobIds = applicationHistory.map(a => a.job_id);

      // Filter out already applied jobs
      const availableJobs = allJobs.filter(job => !appliedJobIds.includes(job.id));

      // Score jobs based on user profile
      const scoredJobs = availableJobs.map(job => ({
        ...job,
        score: this.calculateJobScore(job, userProfile, applicationHistory)
      }));

      // Return top recommendations
      return scoredJobs
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(job => ({
          ...job,
          recommendationReason: this.explainRecommendation(job, userProfile)
        }));
    } catch (error) {
      console.error('Error getting smart recommendations:', error);
      throw error;
    }
  }

  calculateJobScore(job, userProfile, applicationHistory) {
    let score = 0;

    // Skills matching
    if (userProfile.skills) {
      const skillMatches = userProfile.skills.filter(skill => 
        job.title.toLowerCase().includes(skill.toLowerCase()) ||
        (job.description || '').toLowerCase().includes(skill.toLowerCase())
      ).length;
      score += skillMatches * 20;
    }

    // Experience level matching
    if (userProfile.experience_level) {
      const jobExperience = this.inferJobExperience(job.title);
      if (jobExperience === userProfile.experience_level) {
        score += 15;
      }
    }

    // Application history patterns
    const similarApplications = applicationHistory.filter(app => 
      app.jobs.department === job.department
    );
    if (similarApplications.length > 0) {
      score += 10;
    }

    // Recency bonus
    const daysSincePosted = Math.floor((Date.now() - new Date(job.posted_at)) / (1000 * 60 * 60 * 24));
    score += Math.max(0, 10 - daysSincePosted);

    return score;
  }

  inferJobExperience(title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('senior') || lowerTitle.includes('lead')) return 'senior';
    if (lowerTitle.includes('junior') || lowerTitle.includes('entry')) return 'entry';
    if (lowerTitle.includes('manager') || lowerTitle.includes('director')) return 'management';
    return 'mid';
  }

  explainRecommendation(job, userProfile) {
    const reasons = [];

    if (userProfile.skills) {
      const matchingSkills = userProfile.skills.filter(skill => 
        job.title.toLowerCase().includes(skill.toLowerCase())
      );
      if (matchingSkills.length > 0) {
        reasons.push(`Matches your ${matchingSkills.join('/')} skills`);
      }
    }

    const daysSincePosted = Math.floor((Date.now() - new Date(job.posted_at)) / (1000 * 60 * 60 * 24));
    if (daysSincePosted <= 3) {
      reasons.push('Recently posted');
    }

    if (reasons.length === 0) {
      reasons.push('Popular in your area');
    }

    return reasons.join(' • ');
  }
}

export const zeloIntelligence = new ZeloIntelligence();
