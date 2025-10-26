import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import { useSettings } from '../contexts/SettingsContext';
import AIConfigurationSection from '../components/AIConfigurationSection';

interface Entity {
  id: string;
  name: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  organization_name?: string;
  client_name?: string;
  email?: string;
  industry_preference?: string;
  status?: string;
  created_at: string;
}

interface Entities {
  organizations: Entity[];
  clients: Entity[];
  projects: Entity[];
  users: Entity[];
}

const Settings: React.FC = () => {
  const { token } = useUser();
  const { settings, updateSetting } = useSettings();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'content-fields' | 'ai-settings' | 'projects' | 'clients' | 'organizations' | 'users'>('profile');
  const [entities, setEntities] = useState<Entities>({
    organizations: [],
    clients: [],
    projects: [],
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Entity>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<{[key: string]: string[]}>({
    organizations: [],
    clients: [],
    projects: [],
    users: []
  });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    industry_preference: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // System fields for content mapping
  const systemFields = [
    { id: 'title', name: 'Content Title', type: 'text', required: true, description: 'The main title of the content piece' },
    { id: 'description', name: 'Content Description', type: 'textarea', required: true, description: 'Full description or caption text' },
    { id: 'suggested_date', name: 'Suggested Date', type: 'date', required: false, description: 'When this content should be published' },
    { id: 'platform', name: 'Platform', type: 'select', required: true, description: 'Social media platform (Instagram, Facebook, etc.)', options: ['Instagram', 'Facebook', 'TikTok', 'Twitter', 'LinkedIn'] },
    { id: 'format', name: 'Content Format', type: 'multiselect', required: true, description: 'Type of content (Feed post, Story, Reel, etc.)', options: ['Feed post', 'Story', 'Reel', 'Carousel', 'Video', 'Photo'] },
    { id: 'image_type', name: 'Image Type', type: 'select', required: false, description: 'Type of image content (real, AI-generated, etc.)', options: ['Real', 'Midjourney', 'DALL-E', 'Stable Diffusion', 'Stock Photo', 'Custom Design', 'User Generated'] },
    { id: 'status', name: 'Status', type: 'select', required: true, description: 'Current status (draft, review, approved, scheduled)', options: ['draft', 'review', 'approved', 'scheduled'] },
    { id: 'post_type_id', name: 'Post Type', type: 'select', required: false, description: 'Category or type of content', options: [] },
    { id: 'hashtags', name: 'Hashtags', type: 'text', required: false, description: 'Relevant hashtags for the content' }
  ];

  // Load all entities
  useEffect(() => {
    if (token) {
      loadEntities();
      loadUserProfile();
    }
  }, [token]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const response = await fetch(api.getUrl('management/entities'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEntities(data.data);
      } else if (response.status === 404) {
        // Management API is disabled, set empty entities
        console.log('Management API is disabled, using empty entities');
        setEntities({
          clients: [],
          projects: [],
          organizations: [],
          users: []
        });
      } else {
        console.error('Failed to load entities');
      }
    } catch (error) {
      console.log('Management API not available, using empty entities');
      setEntities({
        clients: [],
        projects: [],
        organizations: [],
        users: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    if (profileLoading) {
      console.log('Profile already loading, skipping...');
      return;
    }
    
    try {
      setProfileLoading(true);
      console.log('Starting profile load...');
      
      const response = await fetch(api.getUrl('auth'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        console.log('Full response data:', JSON.stringify(data, null, 2));
        
        // Handle different response structures
        const userData = data.data?.user || data.user || data;
        console.log('User data extracted:', userData);
        console.log('User data keys:', Object.keys(userData));
        console.log('User data values:', {
          name: userData.name,
          email: userData.email,
          industry_preference: userData.industry_preference
        });
        
        setUserProfile(userData);
        const formData = {
          name: userData.name || '',
          email: userData.email || '',
          industry_preference: userData.industry_preference || ''
        };
        setProfileForm(formData);
        
        console.log('Profile form set to:', formData);
        console.log('Current profileForm state:', formData);
      } else {
        console.error('Failed to load profile:', response.status, response.statusText);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const startEdit = (entity: Entity, type: keyof Entities) => {
    setEditing(`${type}-${entity.id}`);
    setEditForm({
      name: entity.name,
      description: entity.description || '',
      contact_email: entity.contact_email || '',
      contact_phone: entity.contact_phone || '',
      email: entity.email || '',
      industry_preference: entity.industry_preference || '',
      status: entity.status || ''
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async (entityId: string, type: keyof Entities) => {
    // Show confirmation dialog
    const entity = entities[type].find(e => e.id === entityId);
    const entityName = entity?.name || 'Unknown';
    const typeName = type === 'users' ? 'user' : type.slice(0, -1); // Remove 's' from plural
    
    const confirmed = window.confirm(
      `Are you sure you want to update the ${typeName} "${entityName}"? This action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      
      const endpoint = type === 'users' ? `/api/management/user/${entityId}` : 
                     type === 'projects' ? `/api/management/project/${entityId}` :
                     type === 'clients' ? `/api/management/client/${entityId}` :
                     `/api/management/organization/${entityId}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const data = await response.json();
        // Update the entity in the local state
        setEntities(prev => ({
          ...prev,
          [type]: prev[type].map(entity => 
            entity.id === entityId ? { ...entity, ...data.data } : entity
          )
        }));
        setEditing(null);
        setEditForm({});
        
        // Show success message
        alert(`✅ ${typeName.charAt(0).toUpperCase() + typeName.slice(1)} "${data.data.name}" updated successfully!`);
      } else {
        const error = await response.json();
        alert(`❌ Failed to update: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('❌ Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntity = async (entityId: string, type: keyof Entities) => {
    if (deleting) return;
    
    const typeName = type === 'users' ? 'user' : type.slice(0, -1); // Remove 's' from plural
    const entityName = entities[type].find(e => e.id === entityId)?.name || 'Unknown';
    
    if (!window.confirm(`⚠️ Are you sure you want to delete "${entityName}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    setDeleting(entityId);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ No authentication token found. Please log in again.');
        return;
      }

      const endpoint = `/api/management/${type}/${entityId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove the entity from the local state
        setEntities(prev => ({
          ...prev,
          [type]: prev[type].filter(entity => entity.id !== entityId)
        }));
        
        // Show success message
        alert(`✅ ${typeName.charAt(0).toUpperCase() + typeName.slice(1)} "${entityName}" deleted successfully!`);
      } else {
        const error = await response.json();
        alert(`❌ Failed to delete: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert('❌ Failed to delete. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const bulkDeleteEntities = async (type: keyof Entities) => {
    const selectedIds = selectedItems[type];
    if (selectedIds.length === 0) return;
    
    const typeName = type === 'users' ? 'user' : type.slice(0, -1);
    const entityNames = entities[type].filter(e => selectedIds.includes(e.id)).map(e => e.name);
    
    if (!window.confirm(`⚠️ Are you sure you want to delete ${selectedIds.length} ${typeName}${selectedIds.length > 1 ? 's' : ''}?\\n\\nSelected: ${entityNames.join(', ')}\\n\\nThis action cannot be undone.`)) {
      return;
    }
    
    setBulkDeleting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ No authentication token found. Please log in again.');
        return;
      }

      // Delete each entity
      const deletePromises = selectedIds.map(id => 
        fetch(`/api/management/${type}/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const responses = await Promise.all(deletePromises);
      const failedDeletes = responses.filter(response => !response.ok);
      
      if (failedDeletes.length === 0) {
        // Remove all deleted entities from local state
        setEntities(prev => ({
          ...prev,
          [type]: prev[type].filter(entity => !selectedIds.includes(entity.id))
        }));
        setSelectedItems(prev => ({
          ...prev,
          [type]: []
        }));
        alert(`✅ ${selectedIds.length} ${typeName}${selectedIds.length > 1 ? 's' : ''} deleted successfully!`);
      } else {
        alert(`❌ Failed to delete ${failedDeletes.length} of ${selectedIds.length} ${typeName}${selectedIds.length > 1 ? 's' : ''}. Please try again.`);
      }
    } catch (error) {
      console.error('Error bulk deleting entities:', error);
      alert(`❌ Failed to delete ${typeName}s: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleItemSelection = (entityId: string, type: keyof Entities) => {
    setSelectedItems(prev => ({
      ...prev,
      [type]: prev[type].includes(entityId) 
        ? prev[type].filter(id => id !== entityId)
        : [...prev[type], entityId]
    }));
  };

  const selectAllItems = (type: keyof Entities) => {
    setSelectedItems(prev => ({
      ...prev,
      [type]: entities[type].map(entity => entity.id)
    }));
  };

  const clearSelection = (type: keyof Entities) => {
    setSelectedItems(prev => ({
      ...prev,
      [type]: []
    }));
  };

  const renderEntityList = (type: keyof Entities, title: string) => {
    const list = entities[type];
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage {title.toLowerCase()} - click on any item to edit
              </p>
            </div>
            {list.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => selectAllItems(type)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => clearSelection(type)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Clear
                </button>
                {selectedItems[type].length > 0 && (
                  <button
                    onClick={() => bulkDeleteEntities(type)}
                    disabled={bulkDeleting}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                  >
                    {bulkDeleting ? 'Deleting...' : `Delete ${selectedItems[type].length}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No {title.toLowerCase()} found
            </div>
          ) : (
            list.map((entity) => {
              const isEditing = editing === `${type}-${entity.id}`;
              
              return (
                <div key={entity.id} className={`p-6 hover:bg-gray-50 transition-colors ${selectedItems[type].includes(entity.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems[type].includes(entity.id)}
                      onChange={() => toggleItemSelection(entity.id, type)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter name"
                          />
                        </div>
                        
                        {type === 'users' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={editForm.email || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter email"
                            />
                          </div>
                        )}
                        
                        {type === 'clients' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Email
                              </label>
                              <input
                                type="email"
                                value={editForm.contact_email || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter contact email"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Phone
                              </label>
                              <input
                                type="tel"
                                value={editForm.contact_phone || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter contact phone"
                              />
                            </div>
                          </>
                        )}
                        
                        {type === 'users' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Industry Preference
                            </label>
                            <select
                              value={editForm.industry_preference || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, industry_preference: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select industry</option>
                              <option value="agency">Agency</option>
                              <option value="restaurant">Restaurant</option>
                              <option value="property">Property</option>
                              <option value="retail">Retail</option>
                              <option value="healthcare">Healthcare</option>
                              <option value="education">Education</option>
                            </select>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter description"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(entity.id, type)}
                          disabled={saving}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer"
                      onClick={() => startEdit(entity, type)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">{entity.name}</h4>
                          {entity.description && (
                            <p className="text-sm text-gray-600 mt-1">{entity.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                            {entity.organization_name && (
                              <span>📁 {entity.organization_name}</span>
                            )}
                            {entity.client_name && (
                              <span>👤 {entity.client_name}</span>
                            )}
                            {entity.email && (
                              <span>✉️ {entity.email}</span>
                            )}
                            {entity.contact_email && (
                              <span>📧 {entity.contact_email}</span>
                            )}
                            {entity.contact_phone && (
                              <span>📞 {entity.contact_phone}</span>
                            )}
                            {entity.industry_preference && (
                              <span>🏢 {entity.industry_preference}</span>
                            )}
                            {entity.status && (
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                entity.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {entity.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex space-x-3">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            ✏️ Edit
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEntity(entity.id, type);
                            }}
                            disabled={deleting === entity.id}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            {deleting === entity.id ? '🗑️ Deleting...' : '🗑️ Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings & Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile, projects, clients, organizations, and users
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
        {[
          { id: 'profile', label: 'My Profile', icon: '👤' },
          { id: 'preferences', label: 'Preferences', icon: '⚙️' },
          { id: 'content-fields', label: 'Post Fields', icon: '📋' },
          { id: 'ai-settings', label: 'AI Settings', icon: '🤖' },
          { id: 'projects', label: 'Projects', icon: '📁' },
          { id: 'clients', label: 'Clients', icon: '👥' },
          { id: 'organizations', label: 'Organizations', icon: '🏢' },
          { id: 'users', label: 'Users', icon: '👤' }
        ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Profile</h3>
              {userProfile ? (
                <div className="space-y-4">
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Debug Info:</strong> Profile loaded - Name: "{profileForm.name}", Email: "{profileForm.email}", Industry: "{profileForm.industry_preference}"
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry Preference
                    </label>
                    <select
                      value={profileForm.industry_preference}
                      onChange={(e) => setProfileForm({...profileForm, industry_preference: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Industry</option>
                      <option value="restaurant">Restaurant & Food Service</option>
                      <option value="retail">Retail & E-commerce</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="technology">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="education">Education</option>
                      <option value="real_estate">Real Estate</option>
                      <option value="consulting">Consulting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        // TODO: Implement profile update
                        alert('Profile update functionality coming soon!');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Update Profile
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Loading profile...</p>
              )}
            </div>
          )}
          
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* System Logic Settings Link */}
              <Link 
                to="/settings/system-logic"
                className="block bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-6 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">🧠 System Logic Settings</h3>
                    <p className="text-indigo-100">
                      Developer insights, state flows, database structure, and system configuration
                    </p>
                  </div>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* AI Model Settings Link */}
              <Link 
                to="/settings/ai-models"
                className="block bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between text-white">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">🤖 Eden AI Model Settings</h3>
                    <p className="text-purple-100">
                      Manage 10 AI providers (DALL-E, Midjourney, SDXL), toggle models, view usage analytics and costs
                    </p>
                  </div>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Customize your application experience
                  </p>
                </div>
                
                <div className="p-6 space-y-6">
                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => updateSetting('dateFormat', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Format
                  </label>
                  <select
                    value={settings.timeFormat}
                    onChange={(e) => updateSetting('timeFormat', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Email Notifications
                    </label>
                    <p className="text-xs text-gray-500">Receive email updates about your projects</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Auto Save Drafts */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Auto Save Drafts
                    </label>
                    <p className="text-xs text-gray-500">Automatically save content as you type</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSaveDrafts}
                      onChange={(e) => updateSetting('autoSaveDrafts', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Dark Mode
                    </label>
                    <p className="text-xs text-gray-500">Enable dark mode for better night viewing</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={(e) => updateSetting('darkMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              </div>
            </div>
          )}
          
          {activeTab === 'content-fields' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Post Fields</h3>
                <p className="text-sm text-gray-500 mt-1">
                  These are the system fields used when importing content from documents
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {systemFields.map((field) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          field.type === 'text' ? 'bg-blue-100 text-blue-800' :
                          field.type === 'textarea' ? 'bg-green-100 text-green-800' :
                          field.type === 'date' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {field.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className={`mr-2 ${field.required ? 'text-red-500' : 'text-gray-400'}`}>
                          {field.required ? 'Required' : 'Optional'}
                        </span>
                        {field.options && (
                          <span className="text-gray-400">
                            • {field.options.length} options
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 How it works</h4>
                  <p className="text-sm text-blue-800">
                    When you upload a document, the AI extracts content and maps it to these fields. 
                    You can review and edit the mapping before importing to your content calendar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-settings' && (
            <AIConfigurationSection />
          )}
          
          {activeTab === 'projects' && renderEntityList('projects', 'Projects')}
          {activeTab === 'clients' && renderEntityList('clients', 'Clients')}
          {activeTab === 'organizations' && renderEntityList('organizations', 'Organizations')}
          {activeTab === 'users' && renderEntityList('users', 'Users')}
        </div>
      </div>
    </div>
  );
};

export default Settings;