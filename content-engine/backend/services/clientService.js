const { query } = require('../../database/config');

class ClientService {
  constructor() {
    console.log('🏢 ClientService initialized');
  }

  // Client Management
  async createClient(clientData) {
    const { 
      organization_id, 
      company_name, 
      industry, 
      business_type,
      website,
      phone,
      email,
      address,
      city,
      state,
      country,
      postal_code,
      annual_revenue,
      employee_count,
      established_year,
      business_description,
      account_status,
      subscription_tier,
      billing_cycle,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
      primary_contact_role,
      account_manager_id
    } = clientData;
    
    try {
      const result = await query(
        `INSERT INTO clients (
          organization_id, company_name, industry, business_type, website, phone, email,
          address, city, state, country, postal_code, annual_revenue, employee_count,
          established_year, business_description, account_status, subscription_tier,
          billing_cycle, primary_contact_name, primary_contact_email, primary_contact_phone,
          primary_contact_role, account_manager_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) RETURNING *`,
        [
          organization_id, company_name, industry, business_type, website, phone, email,
          address, city, state, country, postal_code, annual_revenue, employee_count,
          established_year, business_description, account_status, subscription_tier,
          billing_cycle, primary_contact_name, primary_contact_email, primary_contact_phone,
          primary_contact_role, account_manager_id
        ]
      );
      
      console.log('✅ Client created:', result.rows[0].company_name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to create client:', error.message);
      throw error;
    }
  }

  async getClientsByOrganization(organization_id) {
    try {
      const result = await query(
        `SELECT c.*, 
                u.name as account_manager_name,
                COUNT(p.id) as project_count,
                COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_projects,
                COALESCE(SUM(p.budget), 0) as total_revenue
         FROM clients c
         LEFT JOIN users u ON c.account_manager_id = u.id
         LEFT JOIN projects p ON p.client_id = c.id
         WHERE c.organization_id = $1
         GROUP BY c.id, u.name
         ORDER BY c.created_at DESC`,
        [organization_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch clients:', error.message);
      throw error;
    }
  }

  async getClientById(client_id) {
    try {
      const result = await query(
        `SELECT c.*, 
                u.name as account_manager_name,
                u.email as account_manager_email
         FROM clients c
         LEFT JOIN users u ON c.account_manager_id = u.id
         WHERE c.id = $1`,
        [client_id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to fetch client:', error.message);
      throw error;
    }
  }

  async updateClient(client_id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(client_id);

      const result = await query(
        `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      
      console.log('✅ Client updated:', result.rows[0].company_name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to update client:', error.message);
      throw error;
    }
  }

  async deleteClient(client_id) {
    try {
      const result = await query(
        'DELETE FROM clients WHERE id = $1 RETURNING *',
        [client_id]
      );
      
      console.log('✅ Client deleted:', result.rows[0]?.company_name);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to delete client:', error.message);
      throw error;
    }
  }

  // Project Management (Updated for new hierarchy)
  async createProject(projectData) {
    const {
      client_id,
      organization_id,
      name,
      description,
      project_type = 'campaign',
      industry,
      status = 'active',
      priority = 'medium',
      budget = null,
      start_date = null,
      end_date = null,
      project_manager_id = null,
      tags = null,
      settings = null,
    } = projectData;

    try {
      const result = await query(
        `INSERT INTO projects (
          client_id, organization_id, name, description, project_type, industry, status,
          priority, budget, start_date, end_date, project_manager_id, tags, settings
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        ) RETURNING *`,
        [
          client_id, organization_id, name, description, project_type, industry, status,
          priority, budget, start_date, end_date, project_manager_id, tags, settings,
        ],
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to create project:', error.message);
      throw error;
    }
  }
  async getProjectsByClient(client_id) {
    try {
      const result = await query(
        `SELECT p.*, 
                u.name as project_manager_name,
                COUNT(ptm.user_id) as team_member_count
         FROM projects p
         LEFT JOIN users u ON p.project_manager_id = u.id
         LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
         WHERE p.client_id = $1
         GROUP BY p.id, u.name
         ORDER BY p.created_at DESC`,
        [client_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error.message);
      throw error;
    }
  }

  async getProjectsByOrganization(organization_id) {
    try {
      const result = await query(
        `SELECT p.*, 
                c.company_name as client_name,
                u.name as project_manager_name,
                COUNT(ptm.user_id) as team_member_count
         FROM projects p
         JOIN clients c ON p.client_id = c.id
         LEFT JOIN users u ON p.project_manager_id = u.id
         LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
         WHERE p.organization_id = $1
         GROUP BY p.id, c.company_name, u.name
         ORDER BY p.created_at DESC`,
        [organization_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to fetch organization projects:', error.message);
      throw error;
    }
  }

  // Analytics and Reporting
  async getClientAnalytics(organization_id) {
    try {
      const result = await query(
        `SELECT 
          COUNT(DISTINCT c.id) as total_clients,
          COUNT(DISTINCT CASE WHEN c.account_status = 'active' THEN c.id END) as active_clients,
          COUNT(DISTINCT p.id) as total_projects,
          COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
          COALESCE(SUM(p.budget), 0) as total_revenue,
          COALESCE(AVG(p.budget), 0) as avg_project_value
         FROM clients c
         LEFT JOIN projects p ON p.client_id = c.id
         WHERE c.organization_id = $1`,
        [organization_id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to fetch client analytics:', error.message);
      throw error;
    }
  }

  async getClientPerformanceMetrics(client_id) {
    try {
      const result = await query(
        `SELECT 
          c.company_name,
          COUNT(p.id) as total_projects,
          COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_projects,
          COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects,
          COALESCE(SUM(p.budget), 0) as total_revenue,
          COALESCE(AVG(p.budget), 0) as avg_project_value,
          COUNT(cp.id) as total_content_pieces,
          COUNT(CASE WHEN cp.status = 'published' THEN 1 END) as published_content
         FROM clients c
         LEFT JOIN projects p ON p.client_id = c.id
         LEFT JOIN content_pieces cp ON cp.project_id = p.id
         WHERE c.id = $1
         GROUP BY c.id, c.company_name`,
        [client_id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to fetch client performance:', error.message);
      throw error;
    }
  }
}

module.exports = new ClientService();
