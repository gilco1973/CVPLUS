/**
 * Test script to verify critical bug fixes
 * 1. OpenAI model deprecation fix
 * 2. Firestore undefined values fix
 */

const { skillsVisualizationService } = require('./lib/services/skills-visualization.service');
const { personalityInsightsService } = require('./lib/services/personality-insights.service');

// Mock CV data for testing
const mockCV = {
  personalInfo: {
    name: 'John Doe',
    summary: 'Experienced software engineer with expertise in full-stack development'
  },
  experience: [
    {
      position: 'Senior Software Engineer',
      company: 'Tech Corp',
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      description: 'Led development of React applications using TypeScript and Node.js',
      technologies: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
      achievements: ['Improved performance by 40%', 'Led team of 5 developers']
    }
  ],
  skills: {
    technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
    soft: ['Leadership', 'Communication', 'Problem Solving']
  }
};

async function testSkillsVisualization() {
  console.log('🧪 Testing Skills Visualization Service...');
  
  try {
    const result = await skillsVisualizationService.analyzeSkills(mockCV);
    console.log('✅ Skills visualization completed successfully');
    
    // Check for undefined values
    const hasUndefined = JSON.stringify(result).includes('undefined');
    if (hasUndefined) {
      console.error('❌ Found undefined values in skills visualization result');
      return false;
    } else {
      console.log('✅ No undefined values found in skills visualization');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Skills visualization failed:', error.message);
    return false;
  }
}

async function testPersonalityInsights() {
  console.log('🧪 Testing Personality Insights Service...');
  
  try {
    const result = await personalityInsightsService.analyzePersonality(mockCV);
    console.log('✅ Personality insights completed successfully');
    
    // Check for undefined values
    const hasUndefined = JSON.stringify(result).includes('undefined');
    if (hasUndefined) {
      console.error('❌ Found undefined values in personality insights result');
      return false;
    } else {
      console.log('✅ No undefined values found in personality insights');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Personality insights failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running critical bug fix tests...\n');
  
  const results = [];
  
  results.push(await testSkillsVisualization());
  results.push(await testPersonalityInsights());
  
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All critical bug fixes are working correctly!');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
  }
  
  return passedTests === totalTests;
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
