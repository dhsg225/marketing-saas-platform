const { query } = require('./config');

async function fixCategoryConstraint() {
  try {
    console.log('🔧 Fixing document category constraint...');
    
    // First, let's see what the current constraint allows
    const currentConstraint = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'client_reference_documents_document_category_check'
    `);
    
    console.log('Current constraint:', currentConstraint.rows);
    
    // Drop the existing constraint
    await query(`
      ALTER TABLE client_reference_documents 
      DROP CONSTRAINT IF EXISTS client_reference_documents_document_category_check
    `);
    
    console.log('✅ Dropped existing constraint');
    
    // Add the new constraint with all categories including content_calendar
    await query(`
      ALTER TABLE client_reference_documents 
      ADD CONSTRAINT client_reference_documents_document_category_check 
      CHECK (document_category IN (
        'general', 
        'menu', 
        'brand_guidelines', 
        'price_list', 
        'operational_guidelines', 
        'legal_documents', 
        'marketing_materials', 
        'reference_images',
        'content_calendar'
      ))
    `);
    
    console.log('✅ Added new constraint with content_calendar category');
    
    // Test the constraint
    const testResult = await query(`
      SELECT document_category, COUNT(*) 
      FROM client_reference_documents 
      GROUP BY document_category
    `);
    
    console.log('📊 Current document categories in use:', testResult.rows);
    
    console.log('🎉 Database constraint fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error);
    throw error;
  }
}

// Run the fix
fixCategoryConstraint()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
