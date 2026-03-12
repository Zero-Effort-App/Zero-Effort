// Salary Insights and Market Data for Zelo

export const salaryInsights = {
  // Salary ranges by job type and experience (sample data - in real app this would come from database/API)
  getSalaryRanges: () => ({
    'Software Engineer': {
      entry: 45000,
      mid: 75000,
      senior: 120000,
      lead: 150000
    },
    'Product Manager': {
      entry: 55000,
      mid: 85000,
      senior: 130000,
      lead: 160000
    },
    'UX Designer': {
      entry: 40000,
      mid: 70000,
      senior: 110000,
      lead: 140000
    },
    'Marketing Manager': {
      entry: 40000,
      mid: 65000,
      senior: 95000,
      lead: 120000
    },
    'Data Analyst': {
      entry: 42000,
      mid: 68000,
      senior: 105000,
      lead: 130000
    },
    'Sales Representative': {
      entry: 35000,
      mid: 55000,
      senior: 80000,
      lead: 100000
    }
  }),

  // Estimate salary based on job title and experience
  estimateSalary: (jobTitle, experienceLevel = 'mid') => {
    const ranges = this.getSalaryRanges();
    
    // Normalize job title
    const normalizedTitle = this.normalizeJobTitle(jobTitle);
    
    // Find closest match
    const matchedTitle = Object.keys(ranges).find(title => 
      normalizedTitle.includes(title.toLowerCase()) || 
      title.toLowerCase().includes(normalizedTitle)
    );
    
    if (matchedTitle && ranges[matchedTitle][experienceLevel]) {
      return {
        estimated: ranges[matchedTitle][experienceLevel],
        range: {
          min: ranges[matchedTitle][experienceLevel] * 0.8,
          max: ranges[matchedTitle][experienceLevel] * 1.2
        },
        confidence: matchedTitle.toLowerCase() === normalizedTitle ? 'high' : 'medium'
      };
    }
    
    // Return average if no match
    const allSalaries = Object.values(ranges).flatMap(r => Object.values(r));
    const avgSalary = allSalaries.reduce((a, b) => a + b, 0) / allSalaries.length;
    
    return {
      estimated: Math.round(avgSalary),
      range: {
        min: Math.round(avgSalary * 0.7),
        max: Math.round(avgSalary * 1.3)
      },
      confidence: 'low'
    };
  },

  normalizeJobTitle: (title) => {
    return title.toLowerCase()
      .replace(/sr\.?|senior|lead|principal|chief/g, '')
      .replace(/jr\.?|junior|associate|entry/g, '')
      .replace(/engineer|developer|designer|manager|analyst/g, '')
      .trim();
  },

  // Get market trends and insights
  getMarketInsights: async () => {
    return {
      trendingSkills: [
        { skill: 'React', growth: '+15%', demand: 'high' },
        { skill: 'Python', growth: '+12%', demand: 'high' },
        { skill: 'Cloud Computing', growth: '+18%', demand: 'high' },
        { skill: 'Data Science', growth: '+20%', demand: 'very_high' },
        { skill: 'DevOps', growth: '+14%', demand: 'high' }
      ],
      hotIndustries: [
        { industry: 'Technology', growth: '+22%', positions: 145 },
        { industry: 'Healthcare', growth: '+18%', positions: 89 },
        { industry: 'Finance', growth: '+15%', positions: 67 },
        { industry: 'E-commerce', growth: '+25%', positions: 54 }
      ],
      salaryTrends: {
        'Technology': '+8%',
        'Healthcare': '+6%',
        'Finance': '+5%',
        'Marketing': '+4%'
      }
    };
  },

  // Compare salaries across companies
  compareCompanySalaries: (companies, jobTitle) => {
    // This would use real data in production
    const baseSalary = this.estimateSalary(jobTitle);
    
    return companies.map(company => ({
      company: company.name,
      estimatedSalary: baseSalary.estimated + (Math.random() - 0.5) * 20000,
      benefits: this.generateBenefits(company),
      culture: this.generateCultureInsights(company)
    })).sort((a, b) => b.estimatedSalary - a.estimatedSalary);
  },

  generateBenefits: (company) => {
    const benefits = [
      'Health Insurance', '401k Match', 'Remote Work Options', 
      'Flexible Hours', 'Professional Development', 'Stock Options'
    ];
    
    // Randomly assign benefits based on company size/type
    const count = company.industry === 'Technology' ? 5 : 3;
    return benefits
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  },

  generateCultureInsights: (company) => {
    const cultures = [
      'Fast-paced and innovative',
      'Collaborative and supportive',
      'Results-driven and ambitious',
      'Work-life balance focused',
      'Learning and growth oriented'
    ];
    
    return cultures[Math.floor(Math.random() * cultures.length)];
  },

  // Get negotiation tips
  getNegotiationTips: (jobTitle, experienceLevel) => {
    const salary = this.estimateSalary(jobTitle, experienceLevel);
    
    return {
      baseRange: salary.range,
      tips: [
        `Research shows similar positions pay between $${salary.range.min.toLocaleString()} - $${salary.range.max.toLocaleString()}`,
        'Always negotiate - most companies expect it',
        'Consider total compensation, not just base salary',
        'Timing matters - negotiate after receiving an offer',
        'Be prepared to walk away if the offer is too low'
      ],
      leveragePoints: [
        'Your unique skills and experience',
        'Market demand for your role',
        'Company financial health',
        'Internal equity considerations',
        'Geographic location factors'
      ]
    };
  }
};
