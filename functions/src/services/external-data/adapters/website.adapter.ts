/**
 * Personal Website Scraper Adapter
 * 
 * Extracts portfolio projects, blog posts, and testimonials
 * from personal websites
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { 
  PersonalWebsite,
  PortfolioProject,
  BlogPost,
  Testimonial
} from '../types';

export class WebsiteAdapter {
  private readonly userAgent = 'CVPlus-Bot/1.0 (CV Enhancement Service)';
  private readonly timeout = 10000; // 10 seconds
  
  constructor() {
    logger.info('[WEBSITE-ADAPTER] Website adapter initialized');
  }

  /**
   * Fetch and parse personal website data
   */
  async fetchData(websiteUrl: string): Promise<PersonalWebsite> {
    try {
      logger.info('[WEBSITE-ADAPTER] Fetching website data', { websiteUrl });
      
      // Validate URL
      if (!this.isValidUrl(websiteUrl)) {
        throw new Error('Invalid website URL');
      }
      
      // Fetch the main page
      const html = await this.fetchPage(websiteUrl);
      const $ = cheerio.load(html);
      
      // Extract metadata
      const metadata = this.extractMetadata($, websiteUrl);
      
      // Discover relevant pages
      const pages = await this.discoverPages($, websiteUrl);
      
      // Extract content from discovered pages
      const [portfolioProjects, blogPosts, testimonials] = await Promise.all([
        this.extractPortfolioProjects($, pages),
        this.extractBlogPosts($, pages),
        this.extractTestimonials($, pages)
      ]);
      
      const website: PersonalWebsite = {
        url: websiteUrl,
        title: metadata.title,
        description: metadata.description,
        lastUpdated: metadata.lastUpdated,
        portfolioProjects,
        blogPosts,
        testimonials
      };
      
      logger.info('[WEBSITE-ADAPTER] Website data extracted', {
        url: websiteUrl,
        projectsCount: portfolioProjects.length,
        postsCount: blogPosts.length
      });
      
      return website;
      
    } catch (error) {
      logger.error('[WEBSITE-ADAPTER] Failed to fetch website data', error);
      throw new Error(`Website fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch a web page
   */
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout,
        maxRedirects: 3
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Website not found');
      }
      throw error;
    }
  }

  /**
   * Extract metadata from the page
   */
  private extractMetadata($: cheerio.CheerioAPI, url: string): any {
    return {
      title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
      description: $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content') || '',
      lastUpdated: $('meta[name="last-modified"]').attr('content') || 
                   new Date().toISOString()
    };
  }

  /**
   * Discover relevant pages on the website
   */
  private async discoverPages($: cheerio.CheerioAPI, baseUrl: string): Promise<Map<string, string>> {
    const pages = new Map<string, string>();
    const baseUrlObj = new URL(baseUrl);
    
    // Common page patterns to look for
    const patterns = [
      'portfolio', 'projects', 'work', 'blog', 'posts', 'articles',
      'testimonials', 'reviews', 'about', 'resume', 'cv'
    ];
    
    // Find navigation links
    $('nav a, header a, .navigation a, .menu a').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().toLowerCase();
      
      if (href && patterns.some(pattern => text.includes(pattern))) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          if (absoluteUrl.startsWith(baseUrlObj.origin)) {
            pages.set(text, absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });
    
    return pages;
  }

  /**
   * Extract portfolio projects
   */
  private async extractPortfolioProjects(
    $: cheerio.CheerioAPI,
    pages: Map<string, string>
  ): Promise<PortfolioProject[]> {
    const projects: PortfolioProject[] = [];
    
    // Look for portfolio/projects page
    const portfolioUrl = Array.from(pages.entries())
      .find(([key]) => key.includes('portfolio') || key.includes('project'))?.[1];
    
    if (portfolioUrl) {
      try {
        const html = await this.fetchPage(portfolioUrl);
        const page$ = cheerio.load(html);
        
        // Common portfolio selectors
        const selectors = [
          '.portfolio-item', '.project', '.work-item',
          'article.project', 'div.portfolio-entry'
        ];
        
        for (const selector of selectors) {
          page$(selector).each((_, elem) => {
            const project = this.parseProject(page$(elem));
            if (project.title) {
              projects.push(project);
            }
          });
          
          if (projects.length > 0) break;
        }
      } catch (error) {
        logger.warn('[WEBSITE-ADAPTER] Failed to fetch portfolio page', { portfolioUrl });
      }
    }
    
    // Also check main page for projects
    $('.portfolio-item, .project, .work-item').each((_, elem) => {
      const project = this.parseProject($(elem));
      if (project.title) {
        projects.push(project);
      }
    });
    
    return projects.slice(0, 10); // Limit to 10 projects
  }

  /**
   * Parse a project element
   */
  private parseProject(elem: any): PortfolioProject {
    const $ = elem;
    
    return {
      title: $.find('h2, h3, h4, .title, .project-title').first().text().trim(),
      description: $.find('p, .description, .summary').first().text().trim(),
      url: $.find('a').first().attr('href'),
      imageUrl: $.find('img').first().attr('src'),
      technologies: this.extractTechnologies($),
      role: $.find('.role').text().trim(),
      duration: $.find('.duration, .date').text().trim()
    };
  }

  /**
   * Extract technologies from project
   */
  private extractTechnologies($elem: any): string[] {
    const techs: string[] = [];
    
    $elem.find('.tech, .technology, .skill, .tag').each((_: any, elem: any) => {
      const tech = cheerio.load(elem)('*').text().trim();
      if (tech && tech.length < 30) {
        techs.push(tech);
      }
    });
    
    return techs;
  }

  /**
   * Extract blog posts
   */
  private async extractBlogPosts(
    $: cheerio.CheerioAPI,
    pages: Map<string, string>
  ): Promise<BlogPost[]> {
    const posts: BlogPost[] = [];
    
    // Look for blog page
    const blogUrl = Array.from(pages.entries())
      .find(([key]) => key.includes('blog') || key.includes('article'))?.[1];
    
    if (blogUrl) {
      try {
        const html = await this.fetchPage(blogUrl);
        const page$ = cheerio.load(html);
        
        // Common blog post selectors
        page$('article, .post, .blog-post, .entry').each((_, elem) => {
          const post = this.parseBlogPost(page$(elem));
          if (post.title) {
            posts.push(post);
          }
        });
      } catch (error) {
        logger.warn('[WEBSITE-ADAPTER] Failed to fetch blog page', { blogUrl });
      }
    }
    
    return posts.slice(0, 10); // Limit to 10 posts
  }

  /**
   * Parse a blog post element
   */
  private parseBlogPost(elem: any): BlogPost {
    const $ = elem;
    
    const title = $.find('h2, h3, .title, .post-title').first().text().trim();
    const url = $.find('a').first().attr('href') || '';
    const excerpt = $.find('p, .excerpt, .summary').first().text().trim();
    const dateText = $.find('.date, .published, time').first().text().trim();
    
    const tags: string[] = [];
    $.find('.tag, .category').each((_, tagElem) => {
      const tag = $(tagElem).text().trim();
      if (tag) tags.push(tag);
    });
    
    return {
      title,
      url,
      excerpt,
      publishedDate: this.parseDate(dateText),
      tags,
      readTime: this.estimateReadTime(excerpt)
    };
  }

  /**
   * Extract testimonials
   */
  private async extractTestimonials(
    $: cheerio.CheerioAPI,
    pages: Map<string, string>
  ): Promise<Testimonial[]> {
    const testimonials: Testimonial[] = [];
    
    // Look for testimonials page
    const testimonialsUrl = Array.from(pages.entries())
      .find(([key]) => key.includes('testimonial') || key.includes('review'))?.[1];
    
    if (testimonialsUrl) {
      try {
        const html = await this.fetchPage(testimonialsUrl);
        const page$ = cheerio.load(html);
        
        page$('.testimonial, .review, blockquote').each((_, elem) => {
          const testimonial = this.parseTestimonial(page$(elem));
          if (testimonial.text && testimonial.author) {
            testimonials.push(testimonial);
          }
        });
      } catch (error) {
        logger.warn('[WEBSITE-ADAPTER] Failed to fetch testimonials page', { testimonialsUrl });
      }
    }
    
    // Also check main page
    $('.testimonial, .review, blockquote.testimonial').each((_, elem) => {
      const testimonial = this.parseTestimonial($(elem));
      if (testimonial.text && testimonial.author) {
        testimonials.push(testimonial);
      }
    });
    
    return testimonials.slice(0, 5); // Limit to 5 testimonials
  }

  /**
   * Parse a testimonial element
   */
  private parseTestimonial(elem: any): Testimonial {
    const $ = elem;
    
    const text = $.find('p, .text, .content').first().text().trim() ||
                 $.text().trim();
    const author = $.find('.author, .name, cite').first().text().trim();
    const role = $.find('.role, .title, .position').first().text().trim();
    const company = $.find('.company, .organization').first().text().trim();
    
    // Extract rating if present
    const ratingText = $.find('.rating, .stars').attr('data-rating') ||
                      $.find('.rating, .stars').text();
    const rating = ratingText ? parseFloat(ratingText) : undefined;
    
    return {
      author,
      role,
      company,
      text,
      rating
    };
  }

  /**
   * Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Parse date string
   */
  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Invalid date
    }
    
    return undefined;
  }

  /**
   * Estimate reading time
   */
  private estimateReadTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}