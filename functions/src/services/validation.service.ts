/**
 * Comprehensive Input Validation Service
 * 
 * Provides robust input validation, sanitization, and security checks
 * for all portal generation inputs to prevent XSS, injection attacks,
 * and malformed data issues.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 */

import { ParsedCV } from '../types/job';
import { PortalConfig, PortalErrorCode } from '../types/portal';
import * as validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationOptions {
  allowHtml?: boolean;
  strictMode?: boolean;
  maxLength?: Record<string, number>;
  requiredFields?: string[];
  requireEmailValidation?: boolean;
  requireUrlValidation?: boolean;
  maxStringLength?: number;
  allowedImageExtensions?: string[];
  maxSkillsCount?: number;
  maxExperienceYears?: number;
}

export class ValidationService {
  private readonly defaultMaxLengths = {
    name: 100,
    email: 254,
    phone: 20,
    title: 200,
    summary: 2000,
    description: 1000,
    achievement: 500,
    skill: 50,
    company: 100,
    institution: 200,
    url: 2048,
    text: 500
  };

  private readonly allowedUrlProtocols = ['http:', 'https:'];
  private readonly forbiddenUrlPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /ftp:/i
  ];

  private readonly htmlSanitizeOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  };

  /**
   * Validate complete CV data
   */
  validateCV(cv: ParsedCV, options: ValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedCV = this.deepClone(cv);

    try {
      // Validate personal information (required)
      if (!cv.personalInfo) {
        errors.push({
          field: 'personalInfo',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Personal information is required',
          severity: 'error'
        });
        return { isValid: false, errors };
      }

      // Validate and sanitize personal info
      const personalInfoResult = this.validatePersonalInfo(cv.personalInfo);
      errors.push(...personalInfoResult.errors);
      if (personalInfoResult.sanitizedData) {
        sanitizedCV.personalInfo = personalInfoResult.sanitizedData;
      }

      // Validate summary
      if (cv.summary) {
        const summaryResult = this.validateText(cv.summary, 'summary', this.defaultMaxLengths.summary);
        errors.push(...summaryResult.errors);
        if (summaryResult.sanitizedData) {
          sanitizedCV.summary = summaryResult.sanitizedData;
        }
      }

      // Validate experience
      if (cv.experience) {
        const experienceResult = this.validateExperience(cv.experience);
        errors.push(...experienceResult.errors);
        if (experienceResult.sanitizedData) {
          sanitizedCV.experience = experienceResult.sanitizedData;
        }
      }

      // Validate skills
      if (cv.skills) {
        if (Array.isArray(cv.skills)) {
          const skillsResult = this.validateSkills(cv.skills);
          errors.push(...skillsResult.errors);
          if (skillsResult.sanitizedData) {
            sanitizedCV.skills = skillsResult.sanitizedData;
          }
        } else {
          // Handle skills as object (technical, soft, etc.)
          sanitizedCV.skills = cv.skills;
        }
      }

      // Validate education
      if (cv.education) {
        const educationResult = this.validateEducation(cv.education);
        errors.push(...educationResult.errors);
        if (educationResult.sanitizedData) {
          sanitizedCV.education = educationResult.sanitizedData;
        }
      }

      // Validate projects
      if (cv.projects) {
        const projectsResult = this.validateProjects(cv.projects);
        errors.push(...projectsResult.errors);
        if (projectsResult.sanitizedData) {
          sanitizedCV.projects = projectsResult.sanitizedData;
        }
      }

      // Validate certifications
      if (cv.certifications) {
        const certificationsResult = this.validateCertifications(cv.certifications);
        errors.push(...certificationsResult.errors);
        if (certificationsResult.sanitizedData) {
          sanitizedCV.certifications = certificationsResult.sanitizedData;
        }
      }

      const hasErrors = errors.some(error => error.severity === 'error');
      
      return {
        isValid: !hasErrors,
        errors,
        sanitizedData: hasErrors ? undefined : sanitizedCV
      };

    } catch (error) {
      console.error('[VALIDATION] CV validation failed:', error);
      errors.push({
        field: 'general',
        code: 'VALIDATION_ERROR',
        message: 'Internal validation error occurred',
        severity: 'error'
      });

      return { isValid: false, errors };
    }
  }

  /**
   * Validate personal information
   */
  private validatePersonalInfo(personalInfo: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized = { ...personalInfo };

    // Validate name (required)
    if (!personalInfo.name || typeof personalInfo.name !== 'string' || !personalInfo.name.trim()) {
      errors.push({
        field: 'personalInfo.name',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Name is required',
        severity: 'error'
      });
    } else {
      const nameResult = this.validateText(personalInfo.name, 'name', this.defaultMaxLengths.name);
      errors.push(...nameResult.errors);
      if (nameResult.sanitizedData) {
        sanitized.name = nameResult.sanitizedData;
      }
    }

    // Validate email (required)
    if (!personalInfo.email || typeof personalInfo.email !== 'string' || !personalInfo.email.trim()) {
      errors.push({
        field: 'personalInfo.email',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Email is required',
        severity: 'error'
      });
    } else {
      const emailResult = this.validateEmail(personalInfo.email);
      errors.push(...emailResult.errors);
      if (emailResult.sanitizedData) {
        sanitized.email = emailResult.sanitizedData;
      }
    }

    // Validate phone (optional)
    if (personalInfo.phone) {
      const phoneResult = this.validatePhone(personalInfo.phone);
      errors.push(...phoneResult.errors);
      if (phoneResult.sanitizedData) {
        sanitized.phone = phoneResult.sanitizedData;
      }
    }

    // Validate title (optional)
    if (personalInfo.title) {
      const titleResult = this.validateText(personalInfo.title, 'title', this.defaultMaxLengths.title);
      errors.push(...titleResult.errors);
      if (titleResult.sanitizedData) {
        sanitized.title = titleResult.sanitizedData;
      }
    }

    // Validate location (optional)
    if (personalInfo.location) {
      const locationResult = this.validateText(personalInfo.location, 'location', this.defaultMaxLengths.text);
      errors.push(...locationResult.errors);
      if (locationResult.sanitizedData) {
        sanitized.location = locationResult.sanitizedData;
      }
    }

    // Validate website (optional)
    if (personalInfo.website) {
      const websiteResult = this.validateUrl(personalInfo.website, 'website');
      errors.push(...websiteResult.errors);
      if (websiteResult.sanitizedData) {
        sanitized.website = websiteResult.sanitizedData;
      }
    }

    // Validate profile image URL (optional)
    if (personalInfo.profileImage) {
      const imageResult = this.validateImageUrl(personalInfo.profileImage);
      errors.push(...imageResult.errors);
      if (imageResult.sanitizedData) {
        sanitized.profileImage = imageResult.sanitizedData;
      }
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : sanitized
    };
  }

  /**
   * Validate experience array
   */
  private validateExperience(experience: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any[] = [];

    for (let i = 0; i < experience.length; i++) {
      const exp = experience[i];
      const sanitizedExp: any = {};

      // Validate company (required)
      if (!exp.company || typeof exp.company !== 'string' || !exp.company.trim()) {
        errors.push({
          field: `experience[${i}].company`,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Experience ${i + 1}: Company is required`,
          severity: 'error'
        });
      } else {
        const companyResult = this.validateText(exp.company, 'company', this.defaultMaxLengths.company);
        errors.push(...companyResult.errors.map(e => ({ ...e, field: `experience[${i}].${e.field}` })));
        if (companyResult.sanitizedData) {
          sanitizedExp.company = companyResult.sanitizedData;
        }
      }

      // Validate position (required)
      if (!exp.position || typeof exp.position !== 'string' || !exp.position.trim()) {
        errors.push({
          field: `experience[${i}].position`,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Experience ${i + 1}: Position is required`,
          severity: 'error'
        });
      } else {
        const positionResult = this.validateText(exp.position, 'position', this.defaultMaxLengths.title);
        errors.push(...positionResult.errors.map(e => ({ ...e, field: `experience[${i}].${e.field}` })));
        if (positionResult.sanitizedData) {
          sanitizedExp.position = positionResult.sanitizedData;
        }
      }

      // Validate dates
      if (exp.startDate) {
        const startDateResult = this.validateDate(exp.startDate, 'startDate');
        errors.push(...startDateResult.errors.map(e => ({ ...e, field: `experience[${i}].${e.field}` })));
        if (startDateResult.sanitizedData) {
          sanitizedExp.startDate = startDateResult.sanitizedData;
        }
      }

      if (exp.endDate) {
        const endDateResult = this.validateDate(exp.endDate, 'endDate');
        errors.push(...endDateResult.errors.map(e => ({ ...e, field: `experience[${i}].${e.field}` })));
        if (endDateResult.sanitizedData) {
          sanitizedExp.endDate = endDateResult.sanitizedData;
        }
      }

      // Validate date logic (start date should be before end date)
      if (sanitizedExp.startDate && sanitizedExp.endDate) {
        const startDate = new Date(sanitizedExp.startDate);
        const endDate = new Date(sanitizedExp.endDate);
        
        if (startDate >= endDate) {
          errors.push({
            field: `experience[${i}].dates`,
            code: 'INVALID_DATE_RANGE',
            message: `Experience ${i + 1}: Start date must be before end date`,
            severity: 'error'
          });
        }
      }

      // Validate description (optional)
      if (exp.description) {
        const descResult = this.validateText(exp.description, 'description', this.defaultMaxLengths.description);
        errors.push(...descResult.errors.map(e => ({ ...e, field: `experience[${i}].${e.field}` })));
        if (descResult.sanitizedData) {
          sanitizedExp.description = descResult.sanitizedData;
        }
      }

      // Validate achievements (optional array)
      if (exp.achievements && Array.isArray(exp.achievements)) {
        const sanitizedAchievements: string[] = [];
        for (let j = 0; j < exp.achievements.length; j++) {
          const achievement = exp.achievements[j];
          if (typeof achievement === 'string' && achievement.trim()) {
            const achResult = this.validateText(achievement, 'achievement', this.defaultMaxLengths.achievement);
            errors.push(...achResult.errors.map(e => ({ ...e, field: `experience[${i}].achievements[${j}]` })));
            if (achResult.sanitizedData) {
              sanitizedAchievements.push(achResult.sanitizedData);
            }
          }
        }
        if (sanitizedAchievements.length > 0) {
          sanitizedExp.achievements = sanitizedAchievements;
        }
      }

      // Validate technologies (optional array)
      if (exp.technologies && Array.isArray(exp.technologies)) {
        const sanitizedTechnologies: string[] = [];
        for (const tech of exp.technologies) {
          if (typeof tech === 'string' && tech.trim()) {
            const techResult = this.validateText(tech, 'technology', this.defaultMaxLengths.skill);
            if (techResult.sanitizedData) {
              sanitizedTechnologies.push(techResult.sanitizedData);
            }
          }
        }
        if (sanitizedTechnologies.length > 0) {
          sanitizedExp.technologies = sanitizedTechnologies;
        }
      }

      // Validate company logo URL (optional)
      if (exp.companyLogo) {
        const logoResult = this.validateImageUrl(exp.companyLogo);
        errors.push(...logoResult.errors.map(e => ({ ...e, field: `experience[${i}].companyLogo` })));
        if (logoResult.sanitizedData) {
          sanitizedExp.companyLogo = logoResult.sanitizedData;
        }
      }

      sanitized.push(sanitizedExp);
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : sanitized
    };
  }

  /**
   * Validate skills array
   */
  private validateSkills(skills: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any[] = [];
    const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const sanitizedSkill: any = {};

      // Validate skill name (required)
      if (!skill.name || typeof skill.name !== 'string' || !skill.name.trim()) {
        errors.push({
          field: `skills[${i}].name`,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Skill ${i + 1}: Name is required`,
          severity: 'error'
        });
      } else {
        const nameResult = this.validateText(skill.name, 'name', this.defaultMaxLengths.skill);
        errors.push(...nameResult.errors.map(e => ({ ...e, field: `skills[${i}].${e.field}` })));
        if (nameResult.sanitizedData) {
          sanitizedSkill.name = nameResult.sanitizedData;
        }
      }

      // Validate skill level
      if (skill.level) {
        if (!validLevels.includes(skill.level)) {
          errors.push({
            field: `skills[${i}].level`,
            code: 'INVALID_SKILL_LEVEL',
            message: `Skill ${i + 1}: Level must be one of: ${validLevels.join(', ')}`,
            severity: 'error'
          });
        } else {
          sanitizedSkill.level = skill.level;
        }
      }

      // Validate category (optional)
      if (skill.category) {
        const categoryResult = this.validateText(skill.category, 'category', this.defaultMaxLengths.skill);
        errors.push(...categoryResult.errors.map(e => ({ ...e, field: `skills[${i}].${e.field}` })));
        if (categoryResult.sanitizedData) {
          sanitizedSkill.category = categoryResult.sanitizedData;
        }
      }

      sanitized.push(sanitizedSkill);
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : sanitized
    };
  }

  /**
   * Validate education array
   */
  private validateEducation(education: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any[] = [];

    for (let i = 0; i < education.length; i++) {
      const edu = education[i];
      const sanitizedEdu: any = {};

      // Validate institution (required)
      if (!edu.institution || typeof edu.institution !== 'string' || !edu.institution.trim()) {
        errors.push({
          field: `education[${i}].institution`,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Education ${i + 1}: Institution is required`,
          severity: 'error'
        });
      } else {
        const instResult = this.validateText(edu.institution, 'institution', this.defaultMaxLengths.institution);
        errors.push(...instResult.errors.map(e => ({ ...e, field: `education[${i}].${e.field}` })));
        if (instResult.sanitizedData) {
          sanitizedEdu.institution = instResult.sanitizedData;
        }
      }

      // Validate degree (optional)
      if (edu.degree) {
        const degreeResult = this.validateText(edu.degree, 'degree', this.defaultMaxLengths.title);
        errors.push(...degreeResult.errors.map(e => ({ ...e, field: `education[${i}].${e.field}` })));
        if (degreeResult.sanitizedData) {
          sanitizedEdu.degree = degreeResult.sanitizedData;
        }
      }

      // Validate field (optional)
      if (edu.field) {
        const fieldResult = this.validateText(edu.field, 'field', this.defaultMaxLengths.title);
        errors.push(...fieldResult.errors.map(e => ({ ...e, field: `education[${i}].${e.field}` })));
        if (fieldResult.sanitizedData) {
          sanitizedEdu.field = fieldResult.sanitizedData;
        }
      }

      // Validate year (optional)
      if (edu.year) {
        const yearResult = this.validateYear(edu.year);
        errors.push(...yearResult.errors.map(e => ({ ...e, field: `education[${i}].${e.field}` })));
        if (yearResult.sanitizedData) {
          sanitizedEdu.year = yearResult.sanitizedData;
        }
      }

      // Validate GPA (optional)
      if (edu.gpa) {
        const gpaResult = this.validateGPA(edu.gpa);
        errors.push(...gpaResult.errors.map(e => ({ ...e, field: `education[${i}].${e.field}` })));
        if (gpaResult.sanitizedData) {
          sanitizedEdu.gpa = gpaResult.sanitizedData;
        }
      }

      sanitized.push(sanitizedEdu);
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : sanitized
    };
  }

  /**
   * Validate projects array
   */
  private validateProjects(projects: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any[] = [];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const sanitizedProject: any = {};

      // Validate project name (required)
      if (!project.name || typeof project.name !== 'string' || !project.name.trim()) {
        errors.push({
          field: `projects[${i}].name`,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Project ${i + 1}: Name is required`,
          severity: 'error'
        });
      } else {
        const nameResult = this.validateText(project.name, 'name', this.defaultMaxLengths.title);
        errors.push(...nameResult.errors.map(e => ({ ...e, field: `projects[${i}].${e.field}` })));
        if (nameResult.sanitizedData) {
          sanitizedProject.name = nameResult.sanitizedData;
        }
      }

      // Validate description (optional)
      if (project.description) {
        const descResult = this.validateText(project.description, 'description', this.defaultMaxLengths.description);
        errors.push(...descResult.errors.map(e => ({ ...e, field: `projects[${i}].${e.field}` })));
        if (descResult.sanitizedData) {
          sanitizedProject.description = descResult.sanitizedData;
        }
      }

      // Validate technologies (optional array)
      if (project.technologies && Array.isArray(project.technologies)) {
        const sanitizedTechnologies: string[] = [];
        for (const tech of project.technologies) {
          if (typeof tech === 'string' && tech.trim()) {
            const techResult = this.validateText(tech, 'technology', this.defaultMaxLengths.skill);
            if (techResult.sanitizedData) {
              sanitizedTechnologies.push(techResult.sanitizedData);
            }
          }
        }
        if (sanitizedTechnologies.length > 0) {
          sanitizedProject.technologies = sanitizedTechnologies;
        }
      }

      // Validate project URL (optional)
      if (project.url) {
        const urlResult = this.validateUrl(project.url, 'url');
        errors.push(...urlResult.errors.map(e => ({ ...e, field: `projects[${i}].${e.field}` })));
        if (urlResult.sanitizedData) {
          sanitizedProject.url = urlResult.sanitizedData;
        }
      }

      // Validate project images (optional array)
      if (project.images && Array.isArray(project.images)) {
        const sanitizedImages: string[] = [];
        for (let j = 0; j < project.images.length; j++) {
          const image = project.images[j];
          if (typeof image === 'string' && image.trim()) {
            const imageResult = this.validateImageUrl(image);
            errors.push(...imageResult.errors.map(e => ({ ...e, field: `projects[${i}].images[${j}]` })));
            if (imageResult.sanitizedData) {
              sanitizedImages.push(imageResult.sanitizedData);
            }
          }
        }
        if (sanitizedImages.length > 0) {
          sanitizedProject.images = sanitizedImages;
        }
      }

      sanitized.push(sanitizedProject);
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : sanitized
    };
  }

  /**
   * Validate certifications array
   */
  private validateCertifications(certifications: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any[] = [];

    for (let i = 0; i < certifications.length; i++) {
      const cert = certifications[i];
      const sanitizedCert: any = {};

      // Validate certification name (required)
      if (!cert.name || typeof cert.name !== 'string' || !cert.name.trim()) {
        errors.push({
          field: `certifications[${i}].name`,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Certification ${i + 1}: Name is required`,
          severity: 'error'
        });
      } else {
        const nameResult = this.validateText(cert.name, 'name', this.defaultMaxLengths.title);
        errors.push(...nameResult.errors.map(e => ({ ...e, field: `certifications[${i}].${e.field}` })));
        if (nameResult.sanitizedData) {
          sanitizedCert.name = nameResult.sanitizedData;
        }
      }

      // Validate issuer (optional)
      if (cert.issuer) {
        const issuerResult = this.validateText(cert.issuer, 'issuer', this.defaultMaxLengths.company);
        errors.push(...issuerResult.errors.map(e => ({ ...e, field: `certifications[${i}].${e.field}` })));
        if (issuerResult.sanitizedData) {
          sanitizedCert.issuer = issuerResult.sanitizedData;
        }
      }

      // Validate date (optional)
      if (cert.date) {
        const dateResult = this.validateDate(cert.date, 'date');
        errors.push(...dateResult.errors.map(e => ({ ...e, field: `certifications[${i}].${e.field}` })));
        if (dateResult.sanitizedData) {
          sanitizedCert.date = dateResult.sanitizedData;
        }
      }

      // Validate certificate image URL (optional)
      if (cert.certificateImage) {
        const imageResult = this.validateImageUrl(cert.certificateImage);
        errors.push(...imageResult.errors.map(e => ({ ...e, field: `certifications[${i}].certificateImage` })));
        if (imageResult.sanitizedData) {
          sanitizedCert.certificateImage = imageResult.sanitizedData;
        }
      }

      sanitized.push(sanitizedCert);
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : sanitized
    };
  }

  /**
   * Validate and sanitize text content
   */
  private validateText(text: string, fieldName: string, maxLength: number): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic validation
    if (typeof text !== 'string') {
      errors.push({
        field: fieldName,
        code: 'INVALID_TYPE',
        message: `${fieldName} must be a string`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Trim whitespace
    const trimmed = text.trim();

    // Check length
    if (trimmed.length > maxLength) {
      errors.push({
        field: fieldName,
        code: 'TEXT_TOO_LONG',
        message: `${fieldName} exceeds maximum length of ${maxLength} characters`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Sanitize HTML
    const sanitized = DOMPurify.sanitize(trimmed, this.htmlSanitizeOptions);

    // Check for dangerous patterns
    if (this.containsDangerousPatterns(sanitized)) {
      errors.push({
        field: fieldName,
        code: 'DANGEROUS_CONTENT',
        message: `${fieldName} contains potentially dangerous content`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: sanitized
    };
  }

  /**
   * Validate email address
   */
  private validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof email !== 'string') {
      errors.push({
        field: 'email',
        code: 'INVALID_TYPE',
        message: 'Email must be a string',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = email.trim().toLowerCase();

    if (!validator.isEmail(trimmed)) {
      errors.push({
        field: 'email',
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    if (trimmed.length > this.defaultMaxLengths.email) {
      errors.push({
        field: 'email',
        code: 'EMAIL_TOO_LONG',
        message: `Email exceeds maximum length of ${this.defaultMaxLengths.email} characters`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof phone !== 'string') {
      errors.push({
        field: 'phone',
        code: 'INVALID_TYPE',
        message: 'Phone must be a string',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = phone.trim();

    // Basic phone validation - allow international formats
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{7,18}$/;
    if (!phoneRegex.test(trimmed)) {
      errors.push({
        field: 'phone',
        code: 'INVALID_PHONE',
        message: 'Invalid phone number format',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    if (trimmed.length > this.defaultMaxLengths.phone) {
      errors.push({
        field: 'phone',
        code: 'PHONE_TOO_LONG',
        message: `Phone number exceeds maximum length of ${this.defaultMaxLengths.phone} characters`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Validate URL
   */
  private validateUrl(url: string, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof url !== 'string') {
      errors.push({
        field: fieldName,
        code: 'INVALID_TYPE',
        message: `${fieldName} must be a string`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = url.trim();

    if (!validator.isURL(trimmed, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    })) {
      errors.push({
        field: fieldName,
        code: 'INVALID_URL',
        message: `Invalid URL format for ${fieldName}`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Check for forbidden patterns
    for (const pattern of this.forbiddenUrlPatterns) {
      if (pattern.test(trimmed)) {
        errors.push({
          field: fieldName,
          code: 'FORBIDDEN_URL_PROTOCOL',
          message: `${fieldName} contains forbidden protocol or pattern`,
          severity: 'error'
        });
        return { isValid: false, errors };
      }
    }

    if (trimmed.length > this.defaultMaxLengths.url) {
      errors.push({
        field: fieldName,
        code: 'URL_TOO_LONG',
        message: `${fieldName} exceeds maximum length of ${this.defaultMaxLengths.url} characters`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Validate image URL
   */
  private validateImageUrl(url: string): ValidationResult {
    const urlResult = this.validateUrl(url, 'imageUrl');
    
    if (!urlResult.isValid) {
      return urlResult;
    }

    const errors: ValidationError[] = [];
    const trimmed = url.trim();

    // Check if URL looks like an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => 
      trimmed.toLowerCase().includes(ext)
    );

    if (!hasImageExtension) {
      errors.push({
        field: 'imageUrl',
        code: 'INVALID_IMAGE_URL',
        message: 'URL does not appear to be an image',
        severity: 'warning'
      });
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Validate date string
   */
  private validateDate(date: string, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof date !== 'string') {
      errors.push({
        field: fieldName,
        code: 'INVALID_TYPE',
        message: `${fieldName} must be a string`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = date.trim();

    // Validate ISO date format (YYYY-MM-DD)
    if (!validator.isISO8601(trimmed, { strict: true })) {
      errors.push({
        field: fieldName,
        code: 'INVALID_DATE',
        message: `${fieldName} must be in YYYY-MM-DD format`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Validate reasonable date range (1900-2100)
    const parsedDate = new Date(trimmed);
    const year = parsedDate.getFullYear();
    
    if (year < 1900 || year > 2100) {
      errors.push({
        field: fieldName,
        code: 'DATE_OUT_OF_RANGE',
        message: `${fieldName} year must be between 1900 and 2100`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Validate year
   */
  private validateYear(year: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof year !== 'string') {
      errors.push({
        field: 'year',
        code: 'INVALID_TYPE',
        message: 'Year must be a string',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = year.trim();
    const yearNum = parseInt(trimmed, 10);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      errors.push({
        field: 'year',
        code: 'INVALID_YEAR',
        message: 'Year must be between 1900 and 2100',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Validate GPA
   */
  private validateGPA(gpa: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof gpa !== 'string') {
      errors.push({
        field: 'gpa',
        code: 'INVALID_TYPE',
        message: 'GPA must be a string',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    const trimmed = gpa.trim();
    const gpaNum = parseFloat(trimmed);

    if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4.0) {
      errors.push({
        field: 'gpa',
        code: 'INVALID_GPA',
        message: 'GPA must be between 0.0 and 4.0',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors,
      sanitizedData: trimmed
    };
  }

  /**
   * Check for dangerous patterns in text
   */
  private containsDangerousPatterns(text: string): boolean {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload/i,
      /onerror/i,
      /onclick/i,
      /onmouseover/i,
      /data:text\/html/i,
      /data:application/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Deep clone object
   */
  private deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Validate portal configuration
   */
  validatePortalConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!config.jobId || typeof config.jobId !== 'string') {
      errors.push({
        field: 'jobId',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Job ID is required',
        severity: 'error'
      });
    }

    if (!config.userId || typeof config.userId !== 'string') {
      errors.push({
        field: 'userId',
        code: 'MISSING_REQUIRED_FIELD',
        message: 'User ID is required',
        severity: 'error'
      });
    }

    // Validate portal preferences if provided
    if (config.preferences) {
      // Validate template selection
      if (config.preferences.template && typeof config.preferences.template !== 'string') {
        errors.push({
          field: 'preferences.template',
          code: 'INVALID_TYPE',
          message: 'Template must be a string',
          severity: 'error'
        });
      }

      // Validate feature flags
      if (config.preferences.features) {
        const features = config.preferences.features;
        const booleanFields = ['enableChat', 'enableContactForm', 'enablePortfolio', 'enableAnalytics'];
        
        for (const field of booleanFields) {
          if (features[field] !== undefined && typeof features[field] !== 'boolean') {
            errors.push({
              field: `preferences.features.${field}`,
              code: 'INVALID_TYPE',
              message: `${field} must be a boolean`,
              severity: 'error'
            });
          }
        }
      }
    }

    const hasErrors = errors.some(error => error.severity === 'error');
    
    return {
      isValid: !hasErrors,
      errors,
      sanitizedData: hasErrors ? undefined : config
    };
  }
}