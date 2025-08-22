// Quick test to check if templates are loading
console.log('Testing template imports...');

try {
  // Test if the file can be imported
  import('./src/data/professional-templates.js')
    .then(module => {
      console.log('✅ Templates loaded successfully');
      console.log('Available templates:', Object.keys(module.PROFESSIONAL_TEMPLATES));
      console.log('First template:', Object.values(module.PROFESSIONAL_TEMPLATES)[0]?.name);
    })
    .catch(error => {
      console.error('❌ Failed to load templates:', error.message);
    });
} catch (error) {
  console.error('❌ Import failed:', error.message);
}