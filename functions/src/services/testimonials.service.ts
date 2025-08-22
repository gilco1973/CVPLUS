import { ParsedCV } from './cvParsing.service';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface Testimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  relationship: 'manager' | 'colleague' | 'client' | 'subordinate' | 'mentor';
  content: string;
  rating: number;
  date: Date;
  avatar?: string;
  linkedinUrl?: string;
  verified: boolean;
  skills?: string[];
  context?: string; // Project or context where they worked together
}

interface TestimonialsCarousel {
  testimonials: Testimonial[];
  layout: {
    style: 'carousel' | 'grid' | 'cards' | 'slider';
    autoplay: boolean;
    showNavigation: boolean;
    showDots: boolean;
    itemsPerView: number;
    spacing: number;
  };
  filters: {
    byRelationship: boolean;
    bySkills: boolean;
    byRating: boolean;
    showOnlyVerified: boolean;
  };
  analytics: {
    totalTestimonials: number;
    averageRating: number;
    relationshipBreakdown: Record<string, number>;
    topSkillsMentioned: { skill: string; mentions: number }[];
    verificationRate: number;
  };
  display: {
    primaryColor: string;
    accentColor: string;
    showCompanyLogos: boolean;
    showLinkedInLinks: boolean;
    showRatings: boolean;
    truncateLength: number;
  };
}

export class TestimonialsService {
  private db = admin.firestore();

  async generateTestimonialsCarousel(parsedCV: ParsedCV, jobId: string): Promise<TestimonialsCarousel> {
    try {
      // Extract potential testimonial data from CV
      const potentialTestimonials = await this.extractPotentialTestimonials(parsedCV);
      
      // Generate AI-enhanced testimonials based on work history
      const generatedTestimonials = await this.generateTestimonialsFromWorkHistory(parsedCV);
      
      // Combine and process testimonials
      const allTestimonials = [...potentialTestimonials, ...generatedTestimonials];
      
      // Create carousel configuration
      const carousel: TestimonialsCarousel = {
        testimonials: allTestimonials,
        layout: {
          style: 'carousel',
          autoplay: true,
          showNavigation: true,
          showDots: true,
          itemsPerView: 3,
          spacing: 20
        },
        filters: {
          byRelationship: true,
          bySkills: true,
          byRating: true,
          showOnlyVerified: false
        },
        analytics: this.calculateAnalytics(allTestimonials),
        display: {
          primaryColor: '#0EA5E9',
          accentColor: '#06B6D4',
          showCompanyLogos: true,
          showLinkedInLinks: true,
          showRatings: true,
          truncateLength: 150
        }
      };

      // Store in Firestore
      await this.db.collection('jobs').doc(jobId).collection('features').doc('testimonials').set({
        carousel,
        generatedAt: FieldValue.serverTimestamp(),
        status: 'completed'
      });

      return carousel;
    } catch (error) {
      throw new Error('Failed to generate testimonials carousel');
    }
  }

  private async extractPotentialTestimonials(parsedCV: ParsedCV): Promise<Testimonial[]> {
    const testimonials: Testimonial[] = [];
    
    // Look for references, recommendations, or testimonials sections  
    const sections = (parsedCV as any).sections || {};
    
    for (const [sectionName, content] of Object.entries(sections)) {
      if (this.isTestimonialSection(sectionName)) {
        const extracted = this.parseTestimonialContent(content as string);
        testimonials.push(...extracted);
      }
    }

    return testimonials;
  }

  private isTestimonialSection(sectionName: string): boolean {
    const testimonialKeywords = [
      'references', 'recommendations', 'testimonials', 
      'endorsements', 'feedback', 'reviews'
    ];
    return testimonialKeywords.some(keyword => 
      sectionName.toLowerCase().includes(keyword)
    );
  }

  private parseTestimonialContent(content: string): Testimonial[] {
    // Simple parsing - in production would use more sophisticated NLP
    const testimonials: Testimonial[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentTestimonial: Partial<Testimonial> = {};
    
    for (const line of lines) {
      if (line.includes('"') || line.includes('"')) {
        // This looks like a quote
        currentTestimonial.content = line.replace(/["""]/g, '').trim();
      } else if (line.includes('@') || line.includes('linkedin')) {
        // This might be contact info
        if (line.includes('linkedin')) {
          currentTestimonial.linkedinUrl = line.trim();
        }
      } else if (currentTestimonial.content && !currentTestimonial.name) {
        // This might be attribution
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          currentTestimonial.name = parts[0];
          currentTestimonial.title = parts[1];
          if (parts.length > 2) {
            currentTestimonial.company = parts[2];
          }
        }
        
        if (currentTestimonial.name && currentTestimonial.content) {
          testimonials.push({
            id: `extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: currentTestimonial.name,
            title: currentTestimonial.title || 'Professional Contact',
            company: currentTestimonial.company || 'Unknown',
            relationship: 'colleague',
            content: currentTestimonial.content,
            rating: 5,
            date: new Date(),
            verified: false,
            linkedinUrl: currentTestimonial.linkedinUrl
          } as Testimonial);
          
          currentTestimonial = {};
        }
      }
    }
    
    return testimonials;
  }

  private async generateTestimonialsFromWorkHistory(parsedCV: ParsedCV): Promise<Testimonial[]> {
    const testimonials: Testimonial[] = [];
    const workExperience = parsedCV.experience || [];
    
    for (const job of workExperience.slice(0, 3)) { // Generate for last 3 jobs
      const testimonial = await this.generateTestimonialForJob(job, parsedCV);
      if (testimonial) {
        testimonials.push(testimonial);
      }
    }
    
    return testimonials;
  }

  private async generateTestimonialForJob(job: any, parsedCV: ParsedCV): Promise<Testimonial | null> {
    try {
      // Generate realistic testimonial based on job details
      const skills = parsedCV.skills?.technical?.slice(0, 3) || ['leadership', 'teamwork', 'problem-solving'];
      const accomplishments = job.accomplishments || job.description || [];
      
      const testimonialTemplates = [
        `{name} consistently delivered exceptional results during our time working together at {company}. Their expertise in {skills} made a significant impact on our projects. I would highly recommend them for any {title} role.`,
        `Working with {name} was a pleasure. They demonstrated outstanding {skills} skills and always went above and beyond expectations. Their contributions to {project} were invaluable.`,
        `{name} is one of the most dedicated professionals I've had the opportunity to work with. Their {skills} expertise and positive attitude made them an essential team member at {company}.`,
        `I had the privilege of working alongside {name} at {company}. Their {skills} skills and ability to {accomplishment} set them apart as a top performer in their field.`
      ];
      
      const template = testimonialTemplates[Math.floor(Math.random() * testimonialTemplates.length)];
      const randomSkill = skills[Math.floor(Math.random() * skills.length)];
      const accomplishment = Array.isArray(accomplishments) ? accomplishments[0] : 'deliver results';
      
      // Generate colleague details
      const firstNames = ['Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Amanda', 'Christopher', 'Michelle', 'Daniel'];
      const lastNames = ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
      const titles = ['Senior Manager', 'Team Lead', 'Director', 'Project Manager', 'Senior Developer', 'VP of Operations'];
      
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const colleagueTitle = titles[Math.floor(Math.random() * titles.length)];
      
      const content = template
        .replace('{name}', parsedCV.personalInfo?.name || 'this professional')
        .replace('{company}', job.company || job.organization || 'the organization')
        .replace('{skills}', randomSkill)
        .replace('{title}', job.title || job.position || 'professional')
        .replace('{project}', 'our key initiatives')
        .replace('{accomplishment}', accomplishment);
      
      return {
        id: `generated-${job.company}-${Date.now()}`,
        name: `${firstName} ${lastName}`,
        title: colleagueTitle,
        company: job.company || job.organization || 'Professional Network',
        relationship: Math.random() > 0.5 ? 'manager' : 'colleague',
        content,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        date: new Date(job.endDate || Date.now()),
        verified: false,
        skills: [randomSkill],
        context: job.title || job.position
      };
    } catch (error) {
      return null;
    }
  }

  private calculateAnalytics(testimonials: Testimonial[]): TestimonialsCarousel['analytics'] {
    const totalTestimonials = testimonials.length;
    const averageRating = testimonials.reduce((sum, t) => sum + t.rating, 0) / totalTestimonials || 0;
    
    const relationshipBreakdown: Record<string, number> = {};
    const skillMentions: Record<string, number> = {};
    let verifiedCount = 0;
    
    testimonials.forEach(testimonial => {
      // Count relationships
      relationshipBreakdown[testimonial.relationship] = (relationshipBreakdown[testimonial.relationship] || 0) + 1;
      
      // Count skill mentions
      if (testimonial.skills) {
        testimonial.skills.forEach(skill => {
          skillMentions[skill] = (skillMentions[skill] || 0) + 1;
        });
      }
      
      // Count verified
      if (testimonial.verified) {
        verifiedCount++;
      }
    });
    
    const topSkillsMentioned = Object.entries(skillMentions)
      .map(([skill, mentions]) => ({ skill, mentions }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);
    
    return {
      totalTestimonials,
      averageRating: Math.round(averageRating * 10) / 10,
      relationshipBreakdown,
      topSkillsMentioned,
      verificationRate: Math.round((verifiedCount / totalTestimonials) * 100) || 0
    };
  }

  async addTestimonial(jobId: string, testimonial: Partial<Testimonial>): Promise<Testimonial> {
    const newTestimonial: Testimonial = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: testimonial.name || '',
      title: testimonial.title || '',
      company: testimonial.company || '',
      relationship: testimonial.relationship || 'colleague',
      content: testimonial.content || '',
      rating: testimonial.rating || 5,
      date: new Date(),
      verified: false,
      ...testimonial
    };

    // Add to existing carousel
    const carouselDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('testimonials').get();
    
    if (carouselDoc.exists) {
      const data = carouselDoc.data();
      const carousel = data?.carousel as TestimonialsCarousel;
      
      carousel.testimonials.push(newTestimonial);
      carousel.analytics = this.calculateAnalytics(carousel.testimonials);
      
      await carouselDoc.ref.update({ carousel });
    }

    return newTestimonial;
  }

  async updateTestimonial(jobId: string, testimonialId: string, updates: Partial<Testimonial>): Promise<void> {
    const carouselDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('testimonials').get();
    
    if (carouselDoc.exists) {
      const data = carouselDoc.data();
      const carousel = data?.carousel as TestimonialsCarousel;
      
      const testimonialIndex = carousel.testimonials.findIndex(t => t.id === testimonialId);
      if (testimonialIndex !== -1) {
        carousel.testimonials[testimonialIndex] = { ...carousel.testimonials[testimonialIndex], ...updates };
        carousel.analytics = this.calculateAnalytics(carousel.testimonials);
        
        await carouselDoc.ref.update({ carousel });
      }
    }
  }

  async removeTestimonial(jobId: string, testimonialId: string): Promise<void> {
    const carouselDoc = await this.db.collection('jobs').doc(jobId).collection('features').doc('testimonials').get();
    
    if (carouselDoc.exists) {
      const data = carouselDoc.data();
      const carousel = data?.carousel as TestimonialsCarousel;
      
      carousel.testimonials = carousel.testimonials.filter(t => t.id !== testimonialId);
      carousel.analytics = this.calculateAnalytics(carousel.testimonials);
      
      await carouselDoc.ref.update({ carousel });
    }
  }
}