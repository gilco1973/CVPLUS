/**
 * Role Profiles Data
 * 
 * Comprehensive role profile definitions for the five core domains:
 * - Software Engineer
 * - Engineering Manager  
 * - HR Specialist
 * - AI Product Expert
 * - Data Scientist
 */

import {
  RoleProfile,
  RoleCategory,
  ExperienceLevel,
  CVSection
} from '../types/role-profile.types';

export const roleProfilesData: Omit<RoleProfile, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Software Engineer Profile
  {
    name: 'Software Engineer',
    category: RoleCategory.ENGINEERING,
    description: 'Designs, develops, and maintains software applications using various programming languages and frameworks. Focuses on writing clean, efficient code and collaborating with cross-functional teams.',
    keywords: [
      'software development', 'programming', 'coding', 'application development',
      'web development', 'mobile development', 'full-stack', 'backend', 'frontend',
      'APIs', 'databases', 'testing', 'debugging', 'version control', 'agile'
    ],
    requiredSkills: [
      'JavaScript', 'Python', 'Java', 'C++', 'Git', 'SQL', 'HTML/CSS',
      'Data Structures', 'Algorithms', 'Object-Oriented Programming'
    ],
    preferredSkills: [
      'React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'Kubernetes',
      'MongoDB', 'PostgreSQL', 'REST APIs', 'GraphQL', 'Testing Frameworks',
      'CI/CD', 'Linux', 'System Design', 'Microservices'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Fintech', 'Healthcare', 'E-commerce', 'SaaS'],
    
    matchingCriteria: {
      titleKeywords: [
        'software engineer', 'software developer', 'full stack developer',
        'backend developer', 'frontend developer', 'web developer',
        'application developer', 'systems engineer', 'programmer'
      ],
      skillKeywords: [
        'javascript', 'python', 'java', 'react', 'node.js', 'sql',
        'git', 'html', 'css', 'api', 'database', 'testing', 'agile'
      ],
      industryKeywords: [
        'tech', 'technology', 'software', 'startup', 'fintech',
        'saas', 'e-commerce', 'digital', 'platform'
      ],
      experienceKeywords: [
        'developed', 'built', 'implemented', 'designed', 'created',
        'maintained', 'optimized', 'debugged', 'tested', 'deployed',
        'collaborated', 'integrated', 'automated', 'refactored'
      ],
      educationKeywords: [
        'computer science', 'software engineering', 'computer engineering',
        'information technology', 'mathematics', 'engineering'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Experienced Software Engineer with [X] years of expertise in [PRIMARY TECHNOLOGIES]. Proven track record of developing scalable applications that serve [USER COUNT] users and processing [DATA VOLUME] daily. Skilled in full-stack development with strong foundation in [TECHNICAL EXPERTISE] and passion for solving complex technical challenges.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Programming Languages',
            skills: ['JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'Go'],
            priority: 1
          },
          {
            name: 'Frontend Technologies',
            skills: ['React', 'Vue.js', 'Angular', 'HTML5', 'CSS3', 'SASS'],
            priority: 2
          },
          {
            name: 'Backend Technologies',
            skills: ['Node.js', 'Express.js', 'Django', 'Spring Boot', 'FastAPI'],
            priority: 2
          },
          {
            name: 'Databases',
            skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'DynamoDB'],
            priority: 3
          },
          {
            name: 'Cloud & DevOps',
            skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions'],
            priority: 3
          },
          {
            name: 'Tools & Methodologies',
            skills: ['Git', 'Jest', 'Agile', 'Scrum', 'TDD', 'REST APIs'],
            priority: 4
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Developed [FEATURE/COMPONENT] using [TECHNOLOGY] resulting in [QUANTIFIABLE_OUTCOME]',
          achievementTemplate: 'Successfully implemented [PROJECT] which improved [METRIC] by [PERCENTAGE]',
          quantificationGuide: 'Include metrics like performance improvements, user engagement, code coverage, or bug reduction',
          actionVerbs: ['Developed', 'Built', 'Implemented', 'Created', 'Designed', 'Contributed', 'Collaborated']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Architected and developed [SYSTEM/FEATURE] serving [USER_COUNT] users, improving [PERFORMANCE_METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Led development of [PROJECT] resulting in [BUSINESS_IMPACT] and [TECHNICAL_IMPROVEMENT]',
          quantificationGuide: 'Focus on scalability, performance, user impact, and technical leadership',
          actionVerbs: ['Architected', 'Led', 'Optimized', 'Scaled', 'Mentored', 'Delivered', 'Integrated']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Spearheaded [INITIATIVE] across [TEAM_SIZE] teams, reducing [METRIC] by [PERCENTAGE] and enabling [BUSINESS_OUTCOME]',
          achievementTemplate: 'Designed and implemented [ARCHITECTURE] supporting [SCALE] concurrent users with [RELIABILITY_METRIC] uptime',
          quantificationGuide: 'Emphasize system design, cross-team impact, mentoring, and business value',
          actionVerbs: ['Spearheaded', 'Architected', 'Mentored', 'Influenced', 'Established', 'Transformed']
        }
      ],
      
      achievementTemplates: [
        'Built a [PRODUCT/FEATURE] that increased user engagement by [PERCENTAGE]',
        'Optimized application performance, reducing load times by [TIME] and server costs by [AMOUNT]',
        'Implemented automated testing suite achieving [PERCENTAGE] code coverage',
        'Delivered [NUMBER] production releases with zero downtime',
        'Mentored [NUMBER] junior developers on best practices and code quality'
      ],
      
      keywordOptimization: [
        'agile development', 'test-driven development', 'code review',
        'performance optimization', 'scalable architecture', 'API design',
        'database optimization', 'security best practices', 'clean code',
        'continuous integration', 'microservices', 'cloud computing'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.PROJECTS,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Programming Languages', 'Version Control', 'Problem Solving']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Engineering Manager Profile
  {
    name: 'Engineering Manager',
    category: RoleCategory.MANAGEMENT,
    description: 'Leads and manages engineering teams while maintaining technical expertise. Balances people management, project delivery, and technical strategy to drive team success and product development.',
    keywords: [
      'team leadership', 'people management', 'technical leadership', 'project management',
      'software development', 'agile', 'scrum', 'team building', 'mentoring',
      'performance management', 'hiring', 'strategy', 'cross-functional collaboration'
    ],
    requiredSkills: [
      'Team Leadership', 'People Management', 'Project Management', 'Technical Strategy',
      'Agile/Scrum', 'Performance Management', 'Hiring', 'Communication', 'Mentoring'
    ],
    preferredSkills: [
      'Software Development', 'System Architecture', 'Product Management',
      'Stakeholder Management', 'OKRs', 'Budget Management', 'Process Improvement',
      'Cross-functional Collaboration', 'Technical Roadmapping', 'Risk Management'
    ],
    experienceLevel: ExperienceLevel.SENIOR,
    industryFocus: ['Technology', 'Fintech', 'Healthcare', 'E-commerce', 'SaaS', 'Consulting'],
    
    matchingCriteria: {
      titleKeywords: [
        'engineering manager', 'team lead', 'technical manager', 'development manager',
        'software engineering manager', 'technical lead', 'team leader',
        'engineering director', 'head of engineering'
      ],
      skillKeywords: [
        'team leadership', 'people management', 'project management', 'agile',
        'scrum', 'mentoring', 'hiring', 'performance management', 'strategy'
      ],
      industryKeywords: [
        'tech', 'technology', 'software', 'startup', 'fintech',
        'saas', 'enterprise', 'digital', 'platform'
      ],
      experienceKeywords: [
        'led', 'managed', 'mentored', 'hired', 'built', 'scaled',
        'delivered', 'collaborated', 'coordinated', 'facilitated',
        'established', 'improved', 'developed', 'guided'
      ],
      educationKeywords: [
        'computer science', 'engineering', 'mba', 'management',
        'business administration', 'technology management'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Results-driven Engineering Manager with [X] years of experience leading high-performing teams of [TEAM_SIZE] engineers. Successfully delivered [NUMBER] major products/features serving [USER_BASE] users while maintaining [QUALITY_METRIC]. Expertise in scaling engineering organizations, implementing agile practices, and driving technical strategy aligned with business objectives.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Leadership & Management',
            skills: ['Team Leadership', 'People Management', 'Performance Management', 'Mentoring', 'Hiring'],
            priority: 1
          },
          {
            name: 'Project & Process Management',
            skills: ['Agile/Scrum', 'Project Management', 'Process Improvement', 'OKRs', 'Risk Management'],
            priority: 2
          },
          {
            name: 'Technical Skills',
            skills: ['Software Development', 'System Architecture', 'Technical Strategy', 'Code Review'],
            priority: 3
          },
          {
            name: 'Business & Strategy',
            skills: ['Stakeholder Management', 'Product Strategy', 'Budget Management', 'Cross-functional Collaboration'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 6
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led team of [TEAM_SIZE] engineers delivering [PROJECT/PRODUCT] resulting in [BUSINESS_IMPACT]',
          achievementTemplate: 'Built and scaled engineering team from [INITIAL_SIZE] to [FINAL_SIZE] while maintaining [QUALITY_METRIC]',
          quantificationGuide: 'Focus on team size, delivery metrics, business impact, and process improvements',
          actionVerbs: ['Led', 'Managed', 'Built', 'Scaled', 'Delivered', 'Established', 'Improved']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Directed [NUMBER] cross-functional teams across [PROJECTS/INITIATIVES], achieving [OUTCOME] and improving [METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Established engineering practices and processes that reduced [METRIC] by [PERCENTAGE] across [SCOPE]',
          quantificationGuide: 'Emphasize organizational impact, process improvements, and strategic initiatives',
          actionVerbs: ['Directed', 'Established', 'Transformed', 'Architected', 'Influenced', 'Championed']
        }
      ],
      
      achievementTemplates: [
        'Built and led a team of [NUMBER] engineers delivering [PRODUCT] to [USER_COUNT] users',
        'Reduced engineering team turnover from [PERCENTAGE] to [PERCENTAGE] through improved processes',
        'Implemented agile practices that increased delivery velocity by [PERCENTAGE]',
        'Successfully hired and onboarded [NUMBER] engineers expanding team capabilities',
        'Established technical roadmap aligned with business strategy, delivering [OUTCOME]'
      ],
      
      keywordOptimization: [
        'team building', 'technical leadership', 'agile transformation',
        'engineering culture', 'talent acquisition', 'cross-functional collaboration',
        'technical strategy', 'performance optimization', 'process improvement',
        'stakeholder management', 'product development', 'engineering excellence'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.ACHIEVEMENTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 5,
      criticalSkills: ['Team Leadership', 'People Management', 'Technical Background']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // HR Specialist Profile
  {
    name: 'HR Specialist',
    category: RoleCategory.HR,
    description: 'Manages human resources functions including recruitment, employee relations, performance management, and organizational development. Ensures compliance with employment laws and fosters positive workplace culture.',
    keywords: [
      'human resources', 'recruitment', 'talent acquisition', 'employee relations',
      'performance management', 'onboarding', 'compliance', 'benefits administration',
      'organizational development', 'workplace culture', 'training', 'compensation'
    ],
    requiredSkills: [
      'Talent Acquisition', 'Employee Relations', 'Performance Management', 'HRIS',
      'Employment Law', 'Benefits Administration', 'Interview Skills', 'Communication'
    ],
    preferredSkills: [
      'Organizational Development', 'Change Management', 'Training & Development',
      'Compensation Analysis', 'Diversity & Inclusion', 'Employee Engagement',
      'HR Analytics', 'Conflict Resolution', 'Policy Development'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Consulting', 'Retail'],
    
    matchingCriteria: {
      titleKeywords: [
        'hr specialist', 'human resources specialist', 'hr generalist', 'recruiter',
        'talent acquisition specialist', 'hr coordinator', 'people operations',
        'hr business partner', 'employee relations specialist'
      ],
      skillKeywords: [
        'recruitment', 'talent acquisition', 'employee relations', 'hris',
        'performance management', 'benefits', 'compliance', 'onboarding',
        'interviewing', 'hr policies', 'employment law'
      ],
      industryKeywords: [
        'hr', 'human resources', 'people', 'talent', 'corporate',
        'enterprise', 'consulting', 'services', 'organization'
      ],
      experienceKeywords: [
        'recruited', 'hired', 'onboarded', 'managed', 'developed',
        'implemented', 'coordinated', 'facilitated', 'administered',
        'counseled', 'trained', 'supported', 'maintained'
      ],
      educationKeywords: [
        'human resources', 'psychology', 'business administration',
        'organizational psychology', 'industrial relations', 'management'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Dedicated HR Specialist with [X] years of experience in talent acquisition, employee relations, and organizational development. Successfully recruited [NUMBER] professionals across various roles while maintaining [RETENTION_RATE] employee retention rate. Expertise in HRIS systems, compliance management, and creating positive workplace cultures that drive employee engagement.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Core HR Functions',
            skills: ['Talent Acquisition', 'Employee Relations', 'Performance Management', 'Onboarding'],
            priority: 1
          },
          {
            name: 'Systems & Compliance',
            skills: ['HRIS', 'Employment Law', 'Benefits Administration', 'Policy Development'],
            priority: 2
          },
          {
            name: 'People Development',
            skills: ['Training & Development', 'Organizational Development', 'Change Management', 'Coaching'],
            priority: 3
          },
          {
            name: 'Analytics & Strategy',
            skills: ['HR Analytics', 'Compensation Analysis', 'Diversity & Inclusion', 'Employee Engagement'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 6
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Managed [HR_FUNCTION] for [EMPLOYEE_COUNT] employees, achieving [OUTCOME] and improving [METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Successfully recruited [NUMBER] candidates with [TIME_TO_FILL] average time-to-fill',
          quantificationGuide: 'Include metrics like hiring numbers, retention rates, time-to-fill, employee satisfaction scores',
          actionVerbs: ['Recruited', 'Onboarded', 'Coordinated', 'Administered', 'Supported', 'Facilitated']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led [HR_INITIATIVE] across [DEPARTMENT/ORGANIZATION] resulting in [BUSINESS_IMPACT] and [EMPLOYEE_OUTCOME]',
          achievementTemplate: 'Implemented [HR_PROGRAM] that improved employee engagement scores by [PERCENTAGE]',
          quantificationGuide: 'Focus on program implementation, process improvements, and organizational impact',
          actionVerbs: ['Implemented', 'Developed', 'Led', 'Established', 'Improved', 'Streamlined']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Spearheaded [STRATEGIC_INITIATIVE] impacting [SCOPE] and delivering [BUSINESS_VALUE]',
          achievementTemplate: 'Designed and executed [HR_STRATEGY] that supported company growth from [SIZE] to [SIZE] employees',
          quantificationGuide: 'Emphasize strategic impact, organizational transformation, and business alignment',
          actionVerbs: ['Spearheaded', 'Transformed', 'Architected', 'Influenced', 'Championed', 'Drove']
        }
      ],
      
      achievementTemplates: [
        'Reduced time-to-fill for open positions by [PERCENTAGE] through process optimization',
        'Achieved [PERCENTAGE] employee retention rate through improved engagement initiatives',
        'Successfully onboarded [NUMBER] new hires with [SATISFACTION_SCORE] satisfaction rating',
        'Implemented HRIS system that streamlined processes for [EMPLOYEE_COUNT] employees',
        'Developed training programs that improved employee performance ratings by [PERCENTAGE]'
      ],
      
      keywordOptimization: [
        'employee engagement', 'talent management', 'workforce planning',
        'organizational culture', 'performance improvement', 'compliance management',
        'change management', 'employee development', 'diversity and inclusion',
        'hr metrics', 'strategic hr', 'people analytics'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PROJECTS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Human Resources', 'Communication', 'Employee Relations']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // AI Product Expert Profile
  {
    name: 'AI Product Expert',
    category: RoleCategory.BUSINESS,
    description: 'Specializes in AI and machine learning product development, strategy, and implementation. Bridges technical AI capabilities with business requirements to drive innovative AI-powered solutions.',
    keywords: [
      'artificial intelligence', 'machine learning', 'product management', 'ai strategy',
      'deep learning', 'natural language processing', 'computer vision', 'data science',
      'ai ethics', 'model deployment', 'product strategy', 'technical product management'
    ],
    requiredSkills: [
      'AI/ML Fundamentals', 'Product Management', 'Data Analysis', 'Python',
      'Technical Communication', 'Stakeholder Management', 'Product Strategy', 'Agile'
    ],
    preferredSkills: [
      'Deep Learning', 'NLP', 'Computer Vision', 'MLOps', 'Cloud Platforms',
      'AI Ethics', 'Model Evaluation', 'A/B Testing', 'User Research', 'Go-to-Market'
    ],
    experienceLevel: ExperienceLevel.SENIOR,
    industryFocus: ['Technology', 'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Automotive'],
    
    matchingCriteria: {
      titleKeywords: [
        'ai product manager', 'ml product manager', 'ai product expert',
        'machine learning product manager', 'technical product manager',
        'ai strategy', 'ai consultant', 'ml engineer', 'data scientist'
      ],
      skillKeywords: [
        'artificial intelligence', 'machine learning', 'deep learning',
        'product management', 'python', 'tensorflow', 'pytorch',
        'nlp', 'computer vision', 'data analysis', 'ml models'
      ],
      industryKeywords: [
        'ai', 'machine learning', 'artificial intelligence', 'tech',
        'startup', 'saas', 'data', 'analytics', 'automation'
      ],
      experienceKeywords: [
        'developed', 'implemented', 'deployed', 'trained', 'optimized',
        'launched', 'managed', 'analyzed', 'designed', 'built',
        'collaborated', 'researched', 'evaluated', 'scaled'
      ],
      educationKeywords: [
        'computer science', 'data science', 'machine learning',
        'artificial intelligence', 'mathematics', 'statistics', 'engineering'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Strategic AI Product Expert with [X] years of experience developing and launching AI-powered products that serve [USER_COUNT] users and process [DATA_VOLUME] daily. Proven track record of translating complex AI/ML capabilities into business value, with expertise in [AI_DOMAINS] and successful delivery of [NUMBER] production ML models achieving [PERFORMANCE_METRIC] accuracy.',
      
      skillsStructure: {
        categories: [
          {
            name: 'AI/ML Technologies',
            skills: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'MLOps'],
            priority: 1
          },
          {
            name: 'Product Management',
            skills: ['Product Strategy', 'Stakeholder Management', 'User Research', 'Go-to-Market', 'Agile'],
            priority: 1
          },
          {
            name: 'Technical Skills',
            skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL', 'Cloud Platforms', 'APIs'],
            priority: 2
          },
          {
            name: 'Business & Strategy',
            skills: ['AI Strategy', 'Data Analysis', 'A/B Testing', 'Performance Metrics', 'Business Intelligence'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 7
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Developed and launched [AI_PRODUCT/FEATURE] using [ML_TECHNIQUE] that improved [BUSINESS_METRIC] by [PERCENTAGE]',
          achievementTemplate: 'Successfully deployed [NUMBER] ML models to production serving [SCALE] with [PERFORMANCE_METRIC] performance',
          quantificationGuide: 'Focus on AI/ML model performance, business impact, user adoption, and technical achievements',
          actionVerbs: ['Developed', 'Deployed', 'Optimized', 'Implemented', 'Launched', 'Trained', 'Analyzed']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Led AI product strategy for [PRODUCT/DOMAIN] resulting in [BUSINESS_OUTCOME] and enabling [TECHNICAL_CAPABILITY]',
          achievementTemplate: 'Architected and executed AI roadmap that increased [BUSINESS_METRIC] by [PERCENTAGE] across [USER_BASE]',
          quantificationGuide: 'Emphasize strategic impact, cross-functional leadership, and transformational outcomes',
          actionVerbs: ['Led', 'Architected', 'Transformed', 'Pioneered', 'Established', 'Influenced', 'Drove']
        }
      ],
      
      achievementTemplates: [
        'Built and deployed [NUMBER] production ML models with [ACCURACY/PERFORMANCE] performance',
        'Launched AI product feature that increased user engagement by [PERCENTAGE]',
        'Reduced model inference time by [PERCENTAGE] while maintaining [ACCURACY] accuracy',
        'Led cross-functional team to deliver AI solution processing [DATA_VOLUME] daily',
        'Established ML infrastructure that scaled to support [USER_COUNT] concurrent users'
      ],
      
      keywordOptimization: [
        'ai product development', 'machine learning systems', 'model deployment',
        'ai strategy', 'data-driven decisions', 'ml infrastructure',
        'ai ethics', 'model performance', 'technical product management',
        'ai transformation', 'intelligent systems', 'predictive analytics'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.PROJECTS
      ],
      optionalSections: [
        CVSection.EDUCATION,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PUBLICATIONS
      ],
      minExperienceYears: 3,
      criticalSkills: ['AI/ML Knowledge', 'Product Management', 'Technical Communication']
    },
    
    version: '1.0.0',
    isActive: true
  },

  // Data Scientist Profile
  {
    name: 'Data Scientist',
    category: RoleCategory.DATA,
    description: 'Analyzes complex datasets to extract insights and build predictive models that drive business decisions. Combines statistical analysis, machine learning, and domain expertise to solve challenging problems.',
    keywords: [
      'data science', 'machine learning', 'statistical analysis', 'data mining',
      'predictive modeling', 'data visualization', 'big data', 'python', 'r',
      'sql', 'statistics', 'analytics', 'algorithms', 'experimentation'
    ],
    requiredSkills: [
      'Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualization',
      'Pandas', 'NumPy', 'Scikit-learn', 'Data Analysis', 'Hypothesis Testing'
    ],
    preferredSkills: [
      'TensorFlow', 'PyTorch', 'R', 'Spark', 'Hadoop', 'Tableau', 'Power BI',
      'AWS', 'GCP', 'Deep Learning', 'NLP', 'Time Series Analysis', 'A/B Testing'
    ],
    experienceLevel: ExperienceLevel.MID,
    industryFocus: ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Consulting', 'Research'],
    
    matchingCriteria: {
      titleKeywords: [
        'data scientist', 'machine learning engineer', 'data analyst',
        'research scientist', 'quantitative analyst', 'ml engineer',
        'data science consultant', 'analytics consultant'
      ],
      skillKeywords: [
        'python', 'sql', 'machine learning', 'statistics', 'data analysis',
        'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch',
        'data visualization', 'statistical modeling', 'predictive modeling'
      ],
      industryKeywords: [
        'data', 'analytics', 'research', 'tech', 'fintech',
        'healthcare', 'consulting', 'startup', 'enterprise'
      ],
      experienceKeywords: [
        'analyzed', 'modeled', 'predicted', 'developed', 'implemented',
        'optimized', 'built', 'trained', 'evaluated', 'visualized',
        'experimented', 'researched', 'discovered', 'improved'
      ],
      educationKeywords: [
        'data science', 'statistics', 'mathematics', 'computer science',
        'physics', 'engineering', 'economics', 'analytics'
      ]
    },
    
    enhancementTemplates: {
      professionalSummary: 'Experienced Data Scientist with [X] years of expertise in machine learning and statistical analysis. Successfully developed [NUMBER] predictive models that improved business outcomes by [PERCENTAGE]. Proficient in Python, SQL, and advanced analytics with proven ability to translate complex data into actionable insights for stakeholders.',
      
      skillsStructure: {
        categories: [
          {
            name: 'Programming & Tools',
            skills: ['Python', 'R', 'SQL', 'Pandas', 'NumPy', 'Jupyter'],
            priority: 1
          },
          {
            name: 'Machine Learning',
            skills: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'XGBoost', 'Deep Learning'],
            priority: 1
          },
          {
            name: 'Statistics & Analysis',
            skills: ['Statistical Modeling', 'Hypothesis Testing', 'A/B Testing', 'Time Series Analysis'],
            priority: 2
          },
          {
            name: 'Data & Visualization',
            skills: ['Data Visualization', 'Tableau', 'Matplotlib', 'Seaborn', 'Power BI'],
            priority: 2
          },
          {
            name: 'Big Data & Cloud',
            skills: ['Spark', 'Hadoop', 'AWS', 'GCP', 'Docker', 'MLOps'],
            priority: 3
          }
        ],
        displayFormat: 'categorized',
        maxSkillsPerCategory: 8
      },
      
      experienceEnhancements: [
        {
          roleLevel: 'junior',
          bulletPointTemplate: 'Developed [MODEL_TYPE] model using [TECHNIQUE] that achieved [PERFORMANCE_METRIC] and improved [BUSINESS_OUTCOME]',
          achievementTemplate: 'Built predictive model that increased [BUSINESS_METRIC] by [PERCENTAGE] using [DATASET_SIZE] records',
          quantificationGuide: 'Include model performance metrics, dataset sizes, business impact, and accuracy measures',
          actionVerbs: ['Developed', 'Built', 'Analyzed', 'Implemented', 'Trained', 'Evaluated', 'Optimized']
        },
        {
          roleLevel: 'mid',
          bulletPointTemplate: 'Led data science project analyzing [DATA_SOURCE] to identify [INSIGHTS] resulting in [BUSINESS_IMPACT]',
          achievementTemplate: 'Designed and deployed [ML_SYSTEM] processing [DATA_VOLUME] daily with [PERFORMANCE] latency',
          quantificationGuide: 'Focus on project leadership, complex analysis, system design, and scalable solutions',
          actionVerbs: ['Led', 'Designed', 'Architected', 'Collaborated', 'Delivered', 'Scaled', 'Automated']
        },
        {
          roleLevel: 'senior',
          bulletPointTemplate: 'Established data science practice for [DOMAIN] enabling [CAPABILITY] and driving [STRATEGIC_OUTCOME]',
          achievementTemplate: 'Architected ML infrastructure supporting [SCALE] models with [RELIABILITY] uptime across [BUSINESS_UNITS]',
          quantificationGuide: 'Emphasize strategic initiatives, infrastructure development, and organization-wide impact',
          actionVerbs: ['Established', 'Transformed', 'Pioneered', 'Influenced', 'Mentored', 'Championed']
        }
      ],
      
      achievementTemplates: [
        'Developed predictive model with [ACCURACY]% accuracy that saved [AMOUNT] annually',
        'Analyzed [DATA_SIZE] dataset to identify insights that increased revenue by [PERCENTAGE]',
        'Built recommendation system that improved user engagement by [PERCENTAGE]',
        'Implemented A/B testing framework that optimized [METRIC] across [USER_BASE] users',
        'Created automated data pipeline processing [VOLUME] records daily with [ACCURACY] reliability'
      ],
      
      keywordOptimization: [
        'predictive analytics', 'statistical modeling', 'data mining',
        'machine learning algorithms', 'big data analysis', 'data-driven insights',
        'quantitative analysis', 'experimental design', 'feature engineering',
        'model deployment', 'business intelligence', 'advanced analytics'
      ]
    },
    
    validationRules: {
      requiredSections: [
        CVSection.PROFESSIONAL_SUMMARY,
        CVSection.EXPERIENCE,
        CVSection.SKILLS,
        CVSection.EDUCATION
      ],
      optionalSections: [
        CVSection.PROJECTS,
        CVSection.CERTIFICATIONS,
        CVSection.ACHIEVEMENTS,
        CVSection.PUBLICATIONS
      ],
      minExperienceYears: 2,
      criticalSkills: ['Python/R', 'Statistics', 'Machine Learning', 'Data Analysis']
    },
    
    version: '1.0.0',
    isActive: true
  }
];