import React, { useState, useEffect } from 'react';
import api from '../services/api';
import axios from 'axios';
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CalendarIcon,
  TagIcon,
  StarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';

interface ClientAccount {
  id: string;
  organization_id: string;
  company_name: string;
  industry: string;
  business_type: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  account_status: string;
  subscription_tier: string;
  billing_cycle: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  primary_contact_role?: string;
  business_description?: string;
  account_manager_id: string;
  created_at: string;
  last_activity_at: string;
  // Computed fields
  project_count: number;
  total_revenue: number;
  active_projects: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  industry: string;
  status: string;
  priority: string;
  budget: number;
  start_date: string;
  end_date: string;
  project_manager_id: string;
  client_id: string;
  created_at: string;
  // Computed fields
  team_member_count: number;
  completion_percentage: number;
}

const ClientManagement: React.FC = () => {
  const { selectedOrganization, token } = useUser();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'billing' | 'communications'>('overview');
  const [loading, setLoading] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClient, setNewClient] = useState({
    company_name: '',
    industry: 'restaurant',
    business_type: 'corporate',
    website: '',
    phone: '',
    email: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: ''
  });

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    project_type: 'campaign',
    industry: 'restaurant',
    priority: 'medium',
    budget: 0
  });

  const API_BASE_URL = api.getUrl('clients');

  const authHeaders = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined;

  const loadClients = async () => {
    if (!selectedOrganization || !token) {
      setClients([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/clients/${selectedOrganization}`, authHeaders);
      setClients(res.data.data || []);
      if (res.data.data?.length && !selectedClient) {
        setSelectedClient(res.data.data[0].id);
      }
    } catch (e) {
      console.error('Failed to load clients', e);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsForClient = async (clientId: string) => {
    if (!clientId || !token) {
      setProjects([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/projects/client/${clientId}`, authHeaders);
      setProjects(res.data.data || []);
    } catch (e) {
      console.error('Failed to load projects', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [selectedOrganization, token]);

  useEffect(() => {
    if (selectedClient) loadProjectsForClient(selectedClient);
  }, [selectedClient, token]);

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const clientProjects = projects.filter(p => p.client_id === selectedClient);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderClientOverview = () => (
    <div className="space-y-6">
      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="modern-card hover-lift p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-primary rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
          </div>
        </div>

        <div className="modern-card hover-lift p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-secondary rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.reduce((sum, client) => sum + client.active_projects, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="modern-card hover-lift p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-accent rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${clients.reduce((sum, client) => sum + client.total_revenue, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="modern-card hover-lift p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-primary rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Project Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${projects.length ? Math.round(projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="modern-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Client Accounts</h3>
          <button
            onClick={() => setShowNewClientModal(true)}
            className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-glow transition-all duration-300 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Client
          </button>
        </div>

        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                selectedClient === client.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:shadow-md'
              }`}
              onClick={() => setSelectedClient(client.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{client.company_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.account_status)}`}>
                      {client.account_status}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {client.subscription_tier}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center">
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      {client.website}
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      {client.phone}
                    </div>
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      {client.email}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>📍 {client.city}, {client.country}</span>
                    <span>👤 {client.primary_contact_name}</span>
                    <span>📊 {client.active_projects} active projects</span>
                    <span>💰 ${client.total_revenue.toLocaleString()} revenue</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClientDetails = () => {
    if (!selectedClientData) return null;

    return (
      <div className="space-y-6">
        {/* Client Header */}
        <div className="modern-card p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedClientData.company_name}</h2>
              <p className="text-gray-600">{selectedClientData.business_description || 'No description available'}</p>
              
              <div className="flex items-center space-x-4 mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedClientData.account_status)}`}>
                  {selectedClientData.account_status}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {selectedClientData.subscription_tier}
                </span>
                <span className="text-sm text-gray-500">
                  Billing: {selectedClientData.billing_cycle}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                <PencilIcon className="h-4 w-4 mr-2 inline" />
                Edit
              </button>
              <button className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-glow">
                <PhoneIcon className="h-4 w-4 mr-2 inline" />
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="modern-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{selectedClientData.phone}</span>
              </div>
              <div className="flex items-center">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{selectedClientData.email}</span>
              </div>
              <div className="flex items-center">
                <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                <a href={selectedClientData.website} className="text-indigo-600 hover:text-indigo-800">
                  {selectedClientData.website}
                </a>
              </div>
              <div className="flex items-start">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                <div>
                  <p className="text-gray-900">{selectedClientData.address}</p>
                  <p className="text-gray-600">{selectedClientData.city}, {selectedClientData.state} {selectedClientData.country}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="modern-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{selectedClientData.primary_contact_name}</p>
                <p className="text-sm text-gray-600">{selectedClientData.primary_contact_role || 'Primary Contact'}</p>
              </div>
              <div className="flex items-center">
                <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{selectedClientData.primary_contact_email}</span>
              </div>
              <div className="flex items-center">
                <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">{selectedClientData.primary_contact_phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects for this client */}
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Projects ({clientProjects.length})</h3>
            <button
              className="bg-gradient-primary text-white px-4 py-2 rounded-lg font-medium hover:shadow-glow"
              onClick={() => setShowNewProjectModal(true)}
            >
              + Add Project
            </button>
          </div>
          <div className="space-y-4">
            {clientProjects.map((project) => (
              <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                      <span>💰 ${project.budget.toLocaleString()}</span>
                      <span>👥 {project.team_member_count} members</span>
                      <span>📅 {project.start_date} - {project.end_date}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{project.completion_percentage}%</div>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${project.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Client Management</h1>
        <p className="text-xl text-gray-600">
          Manage client accounts, projects, and relationships
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center space-x-2 mb-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'overview'
              ? 'bg-gradient-primary text-white shadow-glow'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'projects'
              ? 'bg-gradient-primary text-white shadow-glow'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
          }`}
        >
          📁 Projects
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'billing'
              ? 'bg-gradient-primary text-white shadow-glow'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
          }`}
        >
          💰 Billing
        </button>
        <button
          onClick={() => setActiveTab('communications')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === 'communications'
              ? 'bg-gradient-primary text-white shadow-glow'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
          }`}
        >
          💬 Communications
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderClientOverview()}
      {activeTab === 'projects' && selectedClientData && renderClientDetails()}
      {showNewProjectModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Project</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedOrganization || !token) return;
                try {
                  setLoading(true);
                  await axios.post(
                    `${API_BASE_URL}/projects`,
                    {
                      client_id: selectedClient,
                      organization_id: selectedOrganization,
                      ...newProject,
                    },
                    authHeaders
                  );
                  await loadProjectsForClient(selectedClient);
                  setShowNewProjectModal(false);
                  setNewProject({ name:'', description:'', project_type:'campaign', industry:'restaurant', priority:'medium', budget:0 });
                } catch (err) {
                  console.error('Failed to create project', err);
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name</label>
                <input className="modern-input mt-1" value={newProject.name} onChange={(e)=>setNewProject({...newProject, name:e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea className="modern-input mt-1" rows={3} value={newProject.description} onChange={(e)=>setNewProject({...newProject, description:e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select className="modern-input mt-1" value={newProject.project_type} onChange={(e)=>setNewProject({...newProject, project_type:e.target.value})}>
                    <option value="campaign">Campaign</option>
                    <option value="website">Website</option>
                    <option value="social_media">Social Media</option>
                    <option value="email_marketing">Email Marketing</option>
                    <option value="seo">SEO</option>
                    <option value="ppc">PPC</option>
                    <option value="content_creation">Content Creation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Industry</label>
                  <select className="modern-input mt-1" value={newProject.industry} onChange={(e)=>setNewProject({...newProject, industry:e.target.value})}>
                    <option value="restaurant">Restaurant</option>
                    <option value="property">Property</option>
                    <option value="agency">Agency</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select className="modern-input mt-1" value={newProject.priority} onChange={(e)=>setNewProject({...newProject, priority:e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Budget (USD)</label>
                <input type="number" className="modern-input mt-1" value={newProject.budget} onChange={(e)=>setNewProject({...newProject, budget:Number(e.target.value)})} />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={()=>setShowNewProjectModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" className="bg-gradient-primary text-white px-5 py-2 rounded-lg font-medium hover:shadow-glow" disabled={loading}>
                  {loading ? 'Saving...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Client</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedOrganization || !token) return;
                try {
                  setLoading(true);
                  await axios.post(
                    `${API_BASE_URL}/clients`,
                    { organization_id: selectedOrganization, ...newClient },
                    authHeaders
                  );
                  await loadClients();
                  setShowNewClientModal(false);
                  setNewClient({
                    company_name: '', industry: 'restaurant', business_type: 'corporate', website: '', phone: '', email: '',
                    primary_contact_name: '', primary_contact_email: '', primary_contact_phone: ''
                  });
                } catch (err) {
                  console.error('Failed to create client', err);
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  className="modern-input mt-1"
                  value={newClient.company_name}
                  onChange={(e)=>setNewClient({...newClient, company_name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Industry</label>
                  <select className="modern-input mt-1" value={newClient.industry} onChange={(e)=>setNewClient({...newClient, industry: e.target.value})}>
                    <option value="restaurant">Restaurant</option>
                    <option value="property">Property</option>
                    <option value="agency">Agency</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Type</label>
                  <select className="modern-input mt-1" value={newClient.business_type} onChange={(e)=>setNewClient({...newClient, business_type: e.target.value})}>
                    <option value="corporate">Corporate</option>
                    <option value="chain">Chain</option>
                    <option value="franchise">Franchise</option>
                    <option value="independent">Independent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input className="modern-input mt-1" value={newClient.website} onChange={(e)=>setNewClient({...newClient, website: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input className="modern-input mt-1" value={newClient.phone} onChange={(e)=>setNewClient({...newClient, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input className="modern-input mt-1" value={newClient.email} onChange={(e)=>setNewClient({...newClient, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Contact</label>
                  <input className="modern-input mt-1" value={newClient.primary_contact_name} onChange={(e)=>setNewClient({...newClient, primary_contact_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input className="modern-input mt-1" value={newClient.primary_contact_email} onChange={(e)=>setNewClient({...newClient, primary_contact_email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                  <input className="modern-input mt-1" value={newClient.primary_contact_phone} onChange={(e)=>setNewClient({...newClient, primary_contact_phone: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={()=>setShowNewClientModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" className="bg-gradient-primary text-white px-5 py-2 rounded-lg font-medium hover:shadow-glow" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {activeTab === 'billing' && (
        <div className="modern-card p-8 text-center">
          <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Billing Management</h3>
          <p className="text-gray-600">Billing features coming soon...</p>
        </div>
      )}
      {activeTab === 'communications' && (
        <div className="modern-card p-8 text-center">
          <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Communication Log</h3>
          <p className="text-gray-600">Communication tracking coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
