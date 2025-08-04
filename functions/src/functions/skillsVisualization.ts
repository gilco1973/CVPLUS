/**
 * Cloud Functions for Skills Visualization
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { skillsVisualizationService } from '../services/skills-visualization.service';
import { EnhancedJob } from '../types/enhanced-models';

/**
 * Generate skills visualization data
 */
export const generateSkillsVisualization = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      if (!job.parsedData) {
        throw new functions.https.HttpsError('failed-precondition', 'CV must be parsed first');
      }

      // Update status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.skillsVisualization': {
          enabled: true,
          status: 'processing',
          processedAt: new Date()
        }
      });

      // Generate skills visualization
      console.log('Analyzing skills for visualization...');
      const visualization = await skillsVisualizationService.analyzeSkills(job.parsedData);

      // Generate chart data
      const chartData = skillsVisualizationService.generateSkillsMatrix(visualization);

      // Store visualization data
      const visualizationData = {
        ...visualization,
        chartData,
        generatedAt: new Date()
      };

      await admin.firestore().collection('jobs').doc(jobId).update({
        'interactiveData.skillsVisualization': visualizationData,
        'enhancedFeatures.skillsVisualization': {
          enabled: true,
          status: 'completed',
          data: {
            technicalCategories: visualization.technical.length,
            softCategories: visualization.soft.length,
            totalSkills: visualization.technical.reduce((sum, cat) => sum + cat.skills.length, 0) +
                        visualization.soft.reduce((sum, cat) => sum + cat.skills.length, 0),
            languages: visualization.languages.length,
            certifications: visualization.certifications.length
          },
          processedAt: new Date()
        }
      });

      return {
        success: true,
        visualization: visualizationData
      };
    } catch (error: any) {
      console.error('Error generating skills visualization:', error);
      
      // Update error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.skillsVisualization': {
          enabled: false,
          status: 'failed',
          error: error.message,
          processedAt: new Date()
        }
      });
      
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Update skills data manually
 */
export const updateSkillsData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, skillsUpdate } = data;
  if (!jobId || !skillsUpdate) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID and skills update are required');
  }

  try {
    // Get job and verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Update parsed data with new skills
    const updatedParsedData = {
      ...job.parsedData,
      skills: {
        ...job.parsedData?.skills,
        ...skillsUpdate
      }
    };

    await admin.firestore().collection('jobs').doc(jobId).update({
      parsedData: updatedParsedData,
      'parsedDataUpdatedAt': new Date()
    });

    // Regenerate visualization if it exists
    if (job.enhancedFeatures?.skillsVisualization?.enabled) {
      const visualization = await skillsVisualizationService.analyzeSkills(updatedParsedData);
      const chartData = skillsVisualizationService.generateSkillsMatrix(visualization);

      await admin.firestore().collection('jobs').doc(jobId).update({
        'interactiveData.skillsVisualization': {
          ...visualization,
          chartData,
          generatedAt: new Date()
        }
      });
    }

    return {
      success: true,
      message: 'Skills updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating skills:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get skills insights and recommendations
 */
export const getSkillsInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, targetRole, industry } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    // Get job and verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    const visualization = job.interactiveData?.skillsVisualization;
    if (!visualization) {
      throw new functions.https.HttpsError('failed-precondition', 'Skills visualization not generated');
    }

    // Generate insights
    const insights = {
      topSkills: getTopSkills(visualization),
      skillGaps: await identifySkillGaps(visualization, targetRole, industry),
      marketDemand: await getMarketDemandData(visualization),
      recommendations: generateRecommendations(visualization, targetRole),
      competitiveAnalysis: analyzeCompetitiveness(visualization)
    };

    return {
      success: true,
      insights
    };
  } catch (error: any) {
    console.error('Error getting skills insights:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Export skills data in various formats
 */
export const exportSkillsData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId, format = 'json' } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  if (!['json', 'csv', 'pdf'].includes(format)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid export format');
  }

  try {
    // Get job and verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    const visualization = job.interactiveData?.skillsVisualization;
    if (!visualization) {
      throw new functions.https.HttpsError('failed-precondition', 'Skills visualization not generated');
    }

    let exportData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(visualization, null, 2);
        contentType = 'application/json';
        filename = `skills-${jobId}.json`;
        break;

      case 'csv':
        exportData = generateCSVExport(visualization);
        contentType = 'text/csv';
        filename = `skills-${jobId}.csv`;
        break;

      case 'pdf':
        // TODO: Implement PDF generation
        throw new functions.https.HttpsError('unimplemented', 'PDF export not yet implemented');

      default:
        throw new functions.https.HttpsError('invalid-argument', 'Unknown format');
    }

    // Store temporarily and generate download URL
    const bucket = admin.storage().bucket();
    const file = bucket.file(`temp-exports/${context.auth.uid}/${filename}`);
    
    await file.save(exportData, {
      metadata: { contentType }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    return {
      success: true,
      downloadUrl: url,
      filename
    };
  } catch (error: any) {
    console.error('Error exporting skills data:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Add skill endorsement
 */
export const endorseSkill = functions.https.onCall(async (data, context) => {
  const { jobId, skillName, endorserInfo } = data;
  
  if (!jobId || !skillName) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID and skill name are required');
  }

  try {
    // Get job (public endpoint, no auth required for viewing)
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    
    // Check if public profile exists
    const publicProfile = await admin.firestore()
      .collection('publicProfiles')
      .doc(jobId)
      .get();
      
    if (!publicProfile.exists) {
      throw new functions.https.HttpsError('failed-precondition', 'Public profile not available');
    }

    // Create endorsement
    const endorsement = {
      id: admin.firestore().collection('endorsements').doc().id,
      jobId,
      skillName,
      endorser: endorserInfo || {
        name: 'Anonymous',
        isVerified: false
      },
      endorsedAt: new Date(),
      ipHash: data.ipHash || 'unknown'
    };

    // Store endorsement
    await admin.firestore()
      .collection('endorsements')
      .doc(endorsement.id)
      .set(endorsement);

    // Update skill endorsement count
    await admin.firestore().collection('jobs').doc(jobId).update({
      [`skillEndorsements.${skillName}`]: admin.firestore.FieldValue.increment(1)
    });

    return {
      success: true,
      endorsementId: endorsement.id
    };
  } catch (error: any) {
    console.error('Error endorsing skill:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Helper functions

function getTopSkills(visualization: any): any[] {
  const allSkills: any[] = [];
  
  // Collect all skills with their levels
  [...(visualization.technical || []), ...(visualization.soft || [])].forEach(category => {
    category.skills.forEach((skill: any) => {
      allSkills.push({
        name: skill.name,
        level: skill.level,
        category: category.name,
        type: visualization.technical.includes(category) ? 'technical' : 'soft',
        yearsOfExperience: skill.yearsOfExperience
      });
    });
  });
  
  // Sort by level and return top 10
  return allSkills
    .sort((a, b) => b.level - a.level)
    .slice(0, 10);
}

async function identifySkillGaps(
  visualization: any,
  targetRole?: string,
  industry?: string
): Promise<any> {
  // Common skills by role/industry (simplified)
  const roleSkills: Record<string, string[]> = {
    'software engineer': ['javascript', 'python', 'git', 'docker', 'aws', 'testing'],
    'data scientist': ['python', 'r', 'sql', 'machine learning', 'statistics', 'visualization'],
    'product manager': ['agile', 'analytics', 'roadmapping', 'stakeholder management'],
    'designer': ['figma', 'sketch', 'prototyping', 'user research', 'html/css']
  };
  
  const industrySkills: Record<string, string[]> = {
    'fintech': ['security', 'compliance', 'payment systems', 'blockchain'],
    'healthcare': ['hipaa', 'ehr', 'clinical knowledge', 'patient care'],
    'ecommerce': ['seo', 'conversion optimization', 'analytics', 'marketing']
  };
  
  // Get current skills
  const currentSkills = new Set<string>();
  [...(visualization.technical || []), ...(visualization.soft || [])].forEach(category => {
    category.skills.forEach((skill: any) => {
      currentSkills.add(skill.name.toLowerCase());
    });
  });
  
  // Identify gaps
  const gaps: string[] = [];
  
  if (targetRole && roleSkills[targetRole.toLowerCase()]) {
    roleSkills[targetRole.toLowerCase()].forEach(skill => {
      if (!Array.from(currentSkills).some(s => s.includes(skill))) {
        gaps.push(skill);
      }
    });
  }
  
  if (industry && industrySkills[industry.toLowerCase()]) {
    industrySkills[industry.toLowerCase()].forEach(skill => {
      if (!Array.from(currentSkills).some(s => s.includes(skill))) {
        gaps.push(skill);
      }
    });
  }
  
  return {
    missingSkills: [...new Set(gaps)],
    recommendations: gaps.length > 0 
      ? `Consider developing skills in: ${gaps.slice(0, 3).join(', ')}`
      : 'Your skill set aligns well with the target role/industry'
  };
}

async function getMarketDemandData(visualization: any): Promise<any> {
  // Simplified market demand data (in production, would use real job market APIs)
  const highDemandSkills = [
    'python', 'javascript', 'react', 'aws', 'docker', 'kubernetes',
    'machine learning', 'data analysis', 'agile', 'leadership'
  ];
  
  const demandData: any[] = [];
  
  [...(visualization.technical || []), ...(visualization.soft || [])].forEach(category => {
    category.skills.forEach((skill: any) => {
      const isHighDemand = highDemandSkills.some(hds => 
        skill.name.toLowerCase().includes(hds)
      );
      
      demandData.push({
        skill: skill.name,
        demand: isHighDemand ? 'high' : 'moderate',
        trend: isHighDemand ? 'growing' : 'stable'
      });
    });
  });
  
  return {
    highDemandSkills: demandData.filter(d => d.demand === 'high'),
    marketAlignment: demandData.filter(d => d.demand === 'high').length / demandData.length
  };
}

function generateRecommendations(visualization: any, targetRole?: string): string[] {
  const recommendations: string[] = [];
  
  // Check for certification opportunities
  if (visualization.certifications.length < 3) {
    recommendations.push('Consider obtaining industry-recognized certifications to validate your skills');
  }
  
  // Check for language skills
  if (visualization.languages.length < 2) {
    recommendations.push('Learning additional languages can broaden your career opportunities');
  }
  
  // Check skill depth
  const expertSkills = [...(visualization.technical || []), ...(visualization.soft || [])]
    .flatMap(cat => cat.skills)
    .filter(skill => skill.level >= 8);
    
  if (expertSkills.length < 3) {
    recommendations.push('Focus on deepening expertise in your core skills to reach expert level');
  }
  
  // Role-specific recommendations
  if (targetRole?.toLowerCase().includes('lead') || targetRole?.toLowerCase().includes('manager')) {
    const hasLeadership = visualization.soft?.some((cat: any) => 
      cat.skills.some((skill: any) => skill.name.toLowerCase().includes('leadership'))
    );
    
    if (!hasLeadership) {
      recommendations.push('Develop leadership and management skills for senior roles');
    }
  }
  
  return recommendations;
}

function analyzeCompetitiveness(visualization: any): any {
  const totalSkills = [...(visualization.technical || []), ...(visualization.soft || [])]
    .reduce((sum, cat) => sum + cat.skills.length, 0);
    
  const expertSkills = [...(visualization.technical || []), ...(visualization.soft || [])]
    .flatMap(cat => cat.skills)
    .filter(skill => skill.level >= 8).length;
    
  const certificationScore = Math.min(visualization.certifications.length * 10, 30);
  const languageScore = Math.min(visualization.languages.length * 5, 15);
  
  const competitivenessScore = Math.min(
    100,
    (totalSkills * 2) + (expertSkills * 5) + certificationScore + languageScore
  );
  
  return {
    score: competitivenessScore,
    level: competitivenessScore >= 80 ? 'Highly Competitive' :
           competitivenessScore >= 60 ? 'Competitive' :
           competitivenessScore >= 40 ? 'Moderately Competitive' : 'Developing',
    strengths: identifyStrengths(visualization),
    improvements: identifyImprovements(visualization)
  };
}

function identifyStrengths(visualization: any): string[] {
  const strengths: string[] = [];
  
  const technicalCount = visualization.technical?.reduce((sum: number, cat: any) => 
    sum + cat.skills.length, 0) || 0;
    
  if (technicalCount > 10) {
    strengths.push('Strong technical skill portfolio');
  }
  
  if (visualization.certifications?.length > 2) {
    strengths.push('Well-certified professional');
  }
  
  if (visualization.languages?.length > 2) {
    strengths.push('Multilingual capabilities');
  }
  
  return strengths;
}

function identifyImprovements(visualization: any): string[] {
  const improvements: string[] = [];
  
  const softSkillsCount = visualization.soft?.reduce((sum: number, cat: any) => 
    sum + cat.skills.length, 0) || 0;
    
  if (softSkillsCount < 5) {
    improvements.push('Develop more soft skills');
  }
  
  if (!visualization.certifications || visualization.certifications.length === 0) {
    improvements.push('Obtain professional certifications');
  }
  
  return improvements;
}

function generateCSVExport(visualization: any): string {
  const rows: string[] = ['Category,Skill,Level,Years of Experience,Type'];
  
  [...(visualization.technical || []), ...(visualization.soft || [])].forEach(category => {
    const type = visualization.technical.includes(category) ? 'Technical' : 'Soft';
    category.skills.forEach((skill: any) => {
      rows.push(`"${category.name}","${skill.name}",${skill.level},${skill.yearsOfExperience || 'N/A'},${type}`);
    });
  });
  
  // Add languages
  rows.push('\nLanguages');
  rows.push('Language,Proficiency');
  visualization.languages?.forEach((lang: any) => {
    rows.push(`"${lang.language}","${lang.proficiency}"`);
  });
  
  // Add certifications
  rows.push('\nCertifications');
  rows.push('Name,Issuer,Date');
  visualization.certifications?.forEach((cert: any) => {
    rows.push(`"${cert.name}","${cert.issuer}","${new Date(cert.date).toLocaleDateString()}"`);
  });
  
  return rows.join('\n');
}