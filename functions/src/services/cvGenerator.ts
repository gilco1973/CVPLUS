import * as admin from 'firebase-admin';
import { ParsedCV } from './cvParser';

export class CVGenerator {
  async generateHTML(parsedCV: ParsedCV, template: string): Promise<string> {
    const templates: Record<string, (cv: ParsedCV) => string> = {
      modern: this.modernTemplate,
      classic: this.classicTemplate,
      creative: this.creativeTemplate,
    };

    const templateFn = templates[template] || templates.modern;
    return templateFn(parsedCV);
  }

  private modernTemplate(cv: ParsedCV): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e0e0e0;
        }
        .name {
            font-size: 36px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .contact {
            font-size: 14px;
            color: #666;
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #3498db;
            border-radius: 2px;
        }
        .summary {
            font-size: 16px;
            line-height: 1.8;
            color: #555;
            text-align: justify;
        }
        .experience-item, .education-item {
            margin-bottom: 25px;
            padding-left: 20px;
            border-left: 2px solid #e0e0e0;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 8px;
        }
        .position, .degree {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        .company, .institution {
            font-size: 16px;
            color: #3498db;
            margin-bottom: 5px;
        }
        .duration, .graduation-date {
            font-size: 14px;
            color: #666;
        }
        .description {
            font-size: 15px;
            color: #555;
            margin-bottom: 10px;
            line-height: 1.6;
        }
        .achievements {
            list-style: none;
            padding-left: 0;
        }
        .achievements li {
            font-size: 15px;
            color: #555;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        .achievements li::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: #3498db;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .skill-category {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .skill-category h4 {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .skill-list {
            list-style: none;
            font-size: 14px;
            color: #555;
        }
        .skill-list li {
            margin-bottom: 5px;
        }
        @media print {
            .container {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="name">${cv.personalInfo.name}</h1>
            <div class="contact">
                ${cv.personalInfo.email ? `<span>✉ ${cv.personalInfo.email}</span>` : ''}
                ${cv.personalInfo.phone ? `<span>☎ ${cv.personalInfo.phone}</span>` : ''}
                ${cv.personalInfo.location ? `<span>📍 ${cv.personalInfo.location}</span>` : ''}
                ${cv.personalInfo.linkedin ? `<span>💼 ${cv.personalInfo.linkedin}</span>` : ''}
            </div>
        </header>

        ${cv.summary ? `
        <section class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary">${cv.summary}</p>
        </section>
        ` : ''}

        ${cv.experience && cv.experience.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Experience</h2>
            ${cv.experience.map(exp => `
                <div class="experience-item">
                    <div class="item-header">
                        <h3 class="position">${exp.position}</h3>
                        <span class="duration">${exp.duration}</span>
                    </div>
                    <div class="company">${exp.company}</div>
                    ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
                    ${exp.achievements && exp.achievements.length > 0 ? `
                        <ul class="achievements">
                            ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.education && cv.education.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${cv.education.map(edu => `
                <div class="education-item">
                    <div class="item-header">
                        <h3 class="degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
                        <span class="graduation-date">${edu.graduationDate}</span>
                    </div>
                    <div class="institution">${edu.institution}</div>
                    ${edu.gpa ? `<p class="description">GPA: ${edu.gpa}</p>` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.skills && (cv.skills.technical?.length > 0 || cv.skills.soft?.length > 0 || cv.skills.languages?.length > 0) ? `
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-grid">
                ${cv.skills.technical?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Technical Skills</h4>
                        <ul class="skill-list">
                            ${cv.skills.technical.map(skill => `<li>${skill}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${cv.skills.soft?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Soft Skills</h4>
                        <ul class="skill-list">
                            ${cv.skills.soft.map(skill => `<li>${skill}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${cv.skills.languages?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Languages</h4>
                        <ul class="skill-list">
                            ${cv.skills.languages.map(lang => `<li>${lang}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </section>
        ` : ''}
    </div>
</body>
</html>`;
  }

  private classicTemplate(cv: ParsedCV): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.8;
            color: #222;
            background: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px double #333;
        }
        .name {
            font-size: 32px;
            font-weight: 400;
            color: #000;
            margin-bottom: 15px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .contact {
            font-size: 14px;
            color: #555;
            line-height: 1.6;
        }
        .contact span {
            margin: 0 10px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 400;
            color: #000;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
        }
        .summary {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
            text-align: justify;
            font-style: italic;
        }
        .experience-item, .education-item {
            margin-bottom: 30px;
        }
        .item-header {
            margin-bottom: 8px;
        }
        .position, .degree {
            font-size: 18px;
            font-weight: 600;
            color: #000;
        }
        .company, .institution {
            font-size: 16px;
            color: #333;
            font-style: italic;
            margin-bottom: 5px;
        }
        .duration, .graduation-date {
            font-size: 14px;
            color: #666;
            float: right;
        }
        .description {
            font-size: 15px;
            color: #333;
            margin-bottom: 10px;
            line-height: 1.7;
            clear: both;
        }
        .achievements {
            list-style: none;
            padding-left: 20px;
        }
        .achievements li {
            font-size: 15px;
            color: #333;
            margin-bottom: 8px;
            position: relative;
        }
        .achievements li::before {
            content: '•';
            position: absolute;
            left: -20px;
            color: #333;
        }
        .skills-section {
            margin-top: 20px;
        }
        .skill-category {
            margin-bottom: 15px;
        }
        .skill-category h4 {
            font-size: 16px;
            font-weight: 600;
            color: #000;
            display: inline;
        }
        .skill-list {
            display: inline;
            font-size: 15px;
            color: #333;
        }
        @media print {
            .container {
                padding: 40px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="name">${cv.personalInfo.name}</h1>
            <div class="contact">
                ${cv.personalInfo.email ? `<span>${cv.personalInfo.email}</span>` : ''}
                ${cv.personalInfo.phone ? `<span>•</span><span>${cv.personalInfo.phone}</span>` : ''}
                ${cv.personalInfo.location ? `<span>•</span><span>${cv.personalInfo.location}</span>` : ''}
            </div>
        </header>

        ${cv.summary ? `
        <section class="section">
            <h2 class="section-title">Summary</h2>
            <p class="summary">${cv.summary}</p>
        </section>
        ` : ''}

        ${cv.experience && cv.experience.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Professional Experience</h2>
            ${cv.experience.map(exp => `
                <div class="experience-item">
                    <div class="item-header">
                        <span class="duration">${exp.duration}</span>
                        <h3 class="position">${exp.position}</h3>
                        <div class="company">${exp.company}</div>
                    </div>
                    ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
                    ${exp.achievements && exp.achievements.length > 0 ? `
                        <ul class="achievements">
                            ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.education && cv.education.length > 0 ? `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${cv.education.map(edu => `
                <div class="education-item">
                    <div class="item-header">
                        <span class="graduation-date">${edu.graduationDate}</span>
                        <h3 class="degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
                        <div class="institution">${edu.institution}</div>
                    </div>
                    ${edu.gpa ? `<p class="description">GPA: ${edu.gpa}</p>` : ''}
                </div>
            `).join('')}
        </section>
        ` : ''}

        ${cv.skills && (cv.skills.technical?.length > 0 || cv.skills.soft?.length > 0) ? `
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-section">
                ${cv.skills.technical?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Technical:</h4>
                        <span class="skill-list"> ${cv.skills.technical.join(', ')}</span>
                    </div>
                ` : ''}
                ${cv.skills.soft?.length > 0 ? `
                    <div class="skill-category">
                        <h4>Professional:</h4>
                        <span class="skill-list"> ${cv.skills.soft.join(', ')}</span>
                    </div>
                ` : ''}
            </div>
        </section>
        ` : ''}
    </div>
</body>
</html>`;
  }

  private creativeTemplate(cv: ParsedCV): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 30px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.05) 10px,
                rgba(255,255,255,0.05) 20px
            );
            animation: slide 20s linear infinite;
        }
        @keyframes slide {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        .name {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .contact {
            font-size: 16px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }
        .contact span {
            margin-right: 20px;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 50px;
        }
        .section-title {
            font-size: 28px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 25px;
            position: relative;
            padding-left: 20px;
        }
        .section-title::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 2px;
        }
        .summary {
            font-size: 17px;
            line-height: 1.8;
            color: #555;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .experience-item, .education-item {
            margin-bottom: 35px;
            padding: 25px;
            background: #fafbfc;
            border-radius: 10px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .experience-item:hover, .education-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 10px;
        }
        .position, .degree {
            font-size: 20px;
            font-weight: 600;
            color: #333;
        }
        .company, .institution {
            font-size: 16px;
            color: #667eea;
            margin-bottom: 8px;
        }
        .duration, .graduation-date {
            font-size: 14px;
            color: #666;
            background: #e9ecef;
            padding: 4px 12px;
            border-radius: 20px;
        }
        .description {
            font-size: 15px;
            color: #555;
            margin-bottom: 12px;
            line-height: 1.7;
        }
        .achievements {
            list-style: none;
            padding-left: 0;
        }
        .achievements li {
            font-size: 15px;
            color: #555;
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
        }
        .achievements li::before {
            content: '✦';
            position: absolute;
            left: 0;
            color: #667eea;
            font-size: 16px;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
        }
        .skill-category {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            position: relative;
            overflow: hidden;
        }
        .skill-category::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .skill-category h4 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
        }
        .skill-list {
            list-style: none;
            font-size: 14px;
            color: #555;
        }
        .skill-list li {
            margin-bottom: 8px;
            padding: 8px 15px;
            background: rgba(255,255,255,0.8);
            border-radius: 20px;
            display: inline-block;
            margin-right: 8px;
            margin-bottom: 8px;
        }
        @media print {
            .container {
                box-shadow: none;
            }
            body {
                background: white;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="name">${cv.personalInfo.name}</h1>
            <div class="contact">
                ${cv.personalInfo.email ? `<span>✉ ${cv.personalInfo.email}</span>` : ''}
                ${cv.personalInfo.phone ? `<span>☎ ${cv.personalInfo.phone}</span>` : ''}
                ${cv.personalInfo.location ? `<span>📍 ${cv.personalInfo.location}</span>` : ''}
            </div>
        </header>

        <div class="content">
            ${cv.summary ? `
            <section class="section">
                <h2 class="section-title">About Me</h2>
                <p class="summary">${cv.summary}</p>
            </section>
            ` : ''}

            ${cv.experience && cv.experience.length > 0 ? `
            <section class="section">
                <h2 class="section-title">Experience</h2>
                ${cv.experience.map(exp => `
                    <div class="experience-item">
                        <div class="item-header">
                            <h3 class="position">${exp.position}</h3>
                            <span class="duration">${exp.duration}</span>
                        </div>
                        <div class="company">${exp.company}</div>
                        ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
                        ${exp.achievements && exp.achievements.length > 0 ? `
                            <ul class="achievements">
                                ${exp.achievements.map(ach => `<li>${ach}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `).join('')}
            </section>
            ` : ''}

            ${cv.education && cv.education.length > 0 ? `
            <section class="section">
                <h2 class="section-title">Education</h2>
                ${cv.education.map(edu => `
                    <div class="education-item">
                        <div class="item-header">
                            <h3 class="degree">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
                            <span class="graduation-date">${edu.graduationDate}</span>
                        </div>
                        <div class="institution">${edu.institution}</div>
                        ${edu.gpa ? `<p class="description">GPA: ${edu.gpa}</p>` : ''}
                    </div>
                `).join('')}
            </section>
            ` : ''}

            ${cv.skills && (cv.skills.technical?.length > 0 || cv.skills.soft?.length > 0) ? `
            <section class="section">
                <h2 class="section-title">Skills</h2>
                <div class="skills-grid">
                    ${cv.skills.technical?.length > 0 ? `
                        <div class="skill-category">
                            <h4>Technical Skills</h4>
                            <ul class="skill-list">
                                ${cv.skills.technical.map(skill => `<li>${skill}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${cv.skills.soft?.length > 0 ? `
                        <div class="skill-category">
                            <h4>Soft Skills</h4>
                            <ul class="skill-list">
                                ${cv.skills.soft.map(skill => `<li>${skill}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </section>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<{ pdfUrl: string; docxUrl: string; htmlUrl: string }> {
    const bucket = admin.storage().bucket();
    
    // Save HTML file
    const htmlFileName = `users/${userId}/generated/${jobId}/cv.html`;
    const htmlFile = bucket.file(htmlFileName);
    await htmlFile.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
      },
    });
    
    // Get signed URLs
    const [htmlUrl] = await htmlFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    // For now, PDF and DOCX generation are placeholders
    // These would require additional libraries and processing
    const pdfUrl = '';
    const docxUrl = '';
    
    return { pdfUrl, docxUrl, htmlUrl };
  }
}