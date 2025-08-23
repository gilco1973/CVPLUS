/* eslint-env node */
// Quick test to check if templates are loading
console.warn('Testing template imports...');

try {
  // Test if the file can be imported
  import('./src/data/professional-templates.js')
    .then(module => {
      console.warn('✅ Templates loaded successfully');
      console.warn('Available templates:', Object.keys(module.PROFESSIONAL_TEMPLATES));
      console.warn('First template:', Object.values(module.PROFESSIONAL_TEMPLATES)[0]?.name);
    })
    .catch(error => {
      console.error('❌ Failed to load templates:', error.message);
    });
} catch (error) {
  console.error('❌ Import failed:', error.message);
}