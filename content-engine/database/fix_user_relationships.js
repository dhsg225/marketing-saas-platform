const { query } = require('./config');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

async function fixUserRelationships() {
  try {
    console.log('🔧 Fixing user relationships...');
    
    // Get the current user
    const userResult = await query('SELECT id, name, email FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('👤 User:', userResult.rows[0].name, userResult.rows[0].email);
    
    // Check if user has any organizations
    const orgCheck = await query(`
      SELECT o.id, o.name 
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = $1
    `, [userId]);
    
    console.log('🏢 User organizations:', orgCheck.rows.length);
    
    if (orgCheck.rows.length === 0) {
      console.log('⚠️ User has no organizations, creating default organization...');
      
      // Create a default organization
      const orgId = require('crypto').randomUUID();
      await query(`
        INSERT INTO organizations (id, name, description, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [orgId, 'Default Organization', 'Default organization for user']);
      
      // Add user to organization
      await query(`
        INSERT INTO user_organizations (user_id, organization_id, role, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [userId, orgId, 'admin']);
      
      console.log('✅ Created default organization:', orgId);
      
      // Create a default client
      const clientId = require('crypto').randomUUID();
      await query(`
        INSERT INTO clients (id, company_name, business_description, primary_contact_email, 
                           primary_contact_phone, organization_id, industry, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [clientId, 'Matt (property)', 'Property management client', 'matt@example.com', 
          '+1234567890', orgId, 'real_estate']);
      
      console.log('✅ Created default client:', clientId);
      
      // Create a default project
      const projectId = require('crypto').randomUUID();
      await query(`
        INSERT INTO projects (id, name, description, status, client_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [projectId, 'Matts Place (restaurant)', 'Restaurant marketing project', 'active', clientId]);
      
      console.log('✅ Created default project:', projectId);
      
      // Verify the relationships
      const verifyResult = await query(`
        SELECT 
          o.name as org_name,
          c.company_name as client_name,
          p.name as project_name
        FROM organizations o
        JOIN user_organizations uo ON o.id = uo.organization_id
        JOIN clients c ON c.organization_id = o.id
        JOIN projects p ON p.client_id = c.id
        WHERE uo.user_id = $1
      `, [userId]);
      
      console.log('📊 Verification result:', verifyResult.rows);
      
    } else {
      console.log('✅ User already has organizations');
      console.log('Organizations:', orgCheck.rows);
    }
    
    console.log('🎉 User relationships fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing user relationships:', error);
    throw error;
  }
}

fixUserRelationships()
  .then(() => console.log('✅ Script completed successfully'))
  .catch((err) => console.error('❌ Script failed:', err));
