import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';

interface DistributionList {
  id: string;
  name: string;
  description: string;
  target_platform: string;
  is_active: boolean;
  created_by_name: string;
  target_group_count: number;
  rotation_schedule_count: number;
  created_at: string;
}

interface TargetGroup {
  id: string;
  distribution_list_id: string;
  group_name: string;
  group_url: string;
  group_description: string;
  group_instructions: string;
  group_size: number;
  target_audience: string;
  posting_frequency: string;
  preferred_posting_days: string[];
  preferred_posting_times: string[];
  max_posts_per_day: number;
  is_active: boolean;
  last_used_at: string;
  usage_count: number;
}

interface DistributionLog {
  id: string;
  content_title: string;
  content_summary: string;
  distribution_list_name: string;
  target_group_name: string;
  shared_by_name: string;
  shared_at: string;
  success: boolean;
  notes: string;
}

const ManualDistribution: React.FC = () => {
  const { selectedProject, token, projects } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for distribution lists
  const [distributionLists, setDistributionLists] = useState<DistributionList[]>([]);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListForm, setNewListForm] = useState({
    name: '',
    description: '',
    target_platform: 'facebook_groups'
  });

  // State for target groups
  const [selectedList, setSelectedList] = useState<DistributionList | null>(null);
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // State for editing groups
  const [editingGroup, setEditingGroup] = useState<TargetGroup | null>(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    group_name: '',
    group_url: '',
    group_description: '',
    group_instructions: '',
    group_size: 0,
    target_audience: '',
    posting_frequency: 'weekly',
    preferred_posting_days: [] as string[],
    preferred_posting_times: [] as string[],
    max_posts_per_day: 1
  });

  // State for distribution logs
  const [distributionLogs, setDistributionLogs] = useState<DistributionLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const currentProject = projects.find(p => p.id === selectedProject);

  // Platform options
  const platformOptions = [
    { value: 'facebook_groups', label: 'Facebook Groups', icon: '📘' },
    { value: 'linkedin_groups', label: 'LinkedIn Groups', icon: '💼' },
    { value: 'reddit', label: 'Reddit', icon: '🔴' },
    { value: 'discord', label: 'Discord', icon: '💬' },
    { value: 'telegram', label: 'Telegram', icon: '✈️' },
    { value: 'whatsapp', label: 'WhatsApp', icon: '💚' },
    { value: 'email_lists', label: 'Email Lists', icon: '📧' },
    { value: 'other', label: 'Other', icon: '📋' }
  ];

  // Frequency options
  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi_weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'as_needed', label: 'As needed' }
  ];

  // Day options
  const dayOptions = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  // Time options
  const timeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  useEffect(() => {
    if (selectedProject) {
      fetchDistributionLists();
    }
  }, [selectedProject]);

  const fetchDistributionLists = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `/api/manual-distribution/lists/${selectedProject}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      setDistributionLists(response.data.lists);
    } catch (error) {
      console.error('Error fetching distribution lists:', error);
      setError('Failed to fetch distribution lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchTargetGroups = async (listId: string) => {
    try {
      const response = await axios.get(
        `/api/manual-distribution/lists/${listId}/groups`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      setTargetGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching target groups:', error);
      setError('Failed to fetch target groups');
    }
  };

  const fetchDistributionLogs = async () => {
    if (!selectedProject) return;

    try {
      const response = await axios.get(
        `/api/manual-distribution/logs/${selectedProject}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      setDistributionLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching distribution logs:', error);
      setError('Failed to fetch distribution logs');
    }
  };

  const handleCreateList = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProject) return;

    try {
      setCreatingList(true);
      setError(null);

      const response = await axios.post(
        '/api/manual-distribution/lists',
        {
          project_id: selectedProject,
          ...newListForm
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      setSuccess('Distribution list created successfully!');
      setShowCreateListModal(false);
      setNewListForm({ name: '', description: '', target_platform: 'facebook_groups' });
      fetchDistributionLists();

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating distribution list:', error);
      setError('Failed to create distribution list');
    } finally {
      setCreatingList(false);
    }
  };

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedList) return;

    try {
      setCreatingGroup(true);
      setError(null);

      const response = await axios.post(
        `/api/manual-distribution/lists/${selectedList.id}/groups`,
        newGroupForm,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      setSuccess('Target group created successfully!');
      setShowCreateGroupModal(false);
      setNewGroupForm({
        group_name: '',
        group_url: '',
        group_description: '',
        group_instructions: '',
        group_size: 0,
        target_audience: '',
        posting_frequency: 'weekly',
        preferred_posting_days: [],
        preferred_posting_times: [],
        max_posts_per_day: 1
      });
      fetchTargetGroups(selectedList.id);

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating target group:', error);
      setError('Failed to create target group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleEditGroup = (group: TargetGroup) => {
    setEditingGroup(group);
    setShowEditGroupModal(true);
  };

  const handleUpdateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingGroup) return;

    try {
      setUpdatingGroup(true);
      setError(null);

      const response = await axios.put(
        `/api/manual-distribution/groups/${editingGroup.id}`,
        editingGroup,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      setSuccess('Target group updated successfully!');
      setShowEditGroupModal(false);
      setEditingGroup(null);
      
      if (selectedList) {
        fetchTargetGroups(selectedList.id);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating target group:', error);
      setError('Failed to update target group');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this target group? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);

      await axios.delete(
        `/api/manual-distribution/groups/${groupId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      setSuccess('Target group deleted successfully!');
      
      if (selectedList) {
        fetchTargetGroups(selectedList.id);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting target group:', error);
      setError('Failed to delete target group');
    }
  };

  const handleSelectList = (list: DistributionList) => {
    setSelectedList(list);
    fetchTargetGroups(list.id);
  };

  const toggleDaySelection = (day: string) => {
    setNewGroupForm(prev => ({
      ...prev,
      preferred_posting_days: prev.preferred_posting_days.includes(day)
        ? prev.preferred_posting_days.filter(d => d !== day)
        : [...prev.preferred_posting_days, day]
    }));
  };

  const toggleTimeSelection = (time: string) => {
    setNewGroupForm(prev => ({
      ...prev,
      preferred_posting_times: prev.preferred_posting_times.includes(time)
        ? prev.preferred_posting_times.filter(t => t !== time)
        : [...prev.preferred_posting_times, time]
    }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading distribution lists...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">📢</span>
              Manual Distribution Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage manual sharing workflows to Facebook Groups, LinkedIn Groups, and other platforms
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Project: <strong>{currentProject?.name || 'No project selected'}</strong>
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowLogs(!showLogs);
                if (!showLogs && distributionLogs.length === 0) {
                  fetchDistributionLogs();
                }
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              📊 View Logs
            </button>
            <button
              onClick={() => setShowCreateListModal(true)}
              className="bg-gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
            >
              ➕ Create Distribution List
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Lists */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Distribution Lists</h2>
            
            {distributionLists.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl text-gray-300 mb-4">📢</div>
                <p className="text-gray-500 mb-4">No distribution lists created yet</p>
                <button
                  onClick={() => setShowCreateListModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first list
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {distributionLists.map((list) => {
                  const platform = platformOptions.find(p => p.value === list.target_platform);
                  return (
                    <div
                      key={list.id}
                      onClick={() => handleSelectList(list)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedList?.id === list.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{platform?.icon || '📋'}</span>
                            <h3 className="font-medium text-gray-900">{list.name}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{list.description}</p>
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>{platform?.label}</span>
                            <span>{list.target_group_count} groups</span>
                            <span>{list.rotation_schedule_count} schedules</span>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          list.is_active ? 'bg-green-400' : 'bg-gray-300'
                        }`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Target Groups */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Target Groups
                {selectedList && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    for {selectedList.name}
                  </span>
                )}
              </h2>
              {selectedList && (
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  ➕ Add Group
                </button>
              )}
            </div>

            {!selectedList ? (
              <div className="text-center py-12">
                <div className="text-4xl text-gray-300 mb-4">🎯</div>
                <p className="text-gray-500">Select a distribution list to view target groups</p>
              </div>
            ) : targetGroups.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl text-gray-300 mb-4">📋</div>
                <p className="text-gray-500 mb-4">No target groups added yet</p>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first group
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetGroups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{group.group_name}</h3>
                        {group.group_size > 0 && (
                          <div className="text-sm text-gray-600 mt-1">
                            👥 {group.group_size.toLocaleString()} members
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          group.is_active ? 'bg-green-400' : 'bg-gray-300'
                        }`}></div>
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="text-blue-600 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50"
                          title="Edit group"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                          title="Delete group"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {group.group_url && (
                      <a 
                        href={group.group_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm mb-2 block"
                      >
                        🔗 {group.group_url}
                      </a>
                    )}
                    
                    {group.group_description && (
                      <p className="text-sm text-gray-600 mb-3">{group.group_description}</p>
                    )}
                    
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <span className="mr-2">📅</span>
                        <span>{frequencyOptions.find(f => f.value === group.posting_frequency)?.label}</span>
                      </div>
                      {group.preferred_posting_days.length > 0 && (
                        <div className="flex items-center">
                          <span className="mr-2">📆</span>
                          <span>{group.preferred_posting_days.join(', ')}</span>
                        </div>
                      )}
                      {group.usage_count > 0 && (
                        <div className="flex items-center">
                          <span className="mr-2">📊</span>
                          <span>Used {group.usage_count} times</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Distribution List Modal */}
      {showCreateListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Distribution List</h3>
            
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Name *
                </label>
                <input
                  type="text"
                  value={newListForm.name}
                  onChange={(e) => setNewListForm({...newListForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Facebook Food Groups"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Platform *
                </label>
                <select
                  value={newListForm.target_platform}
                  onChange={(e) => setNewListForm({...newListForm, target_platform: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {platformOptions.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.icon} {platform.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newListForm.description}
                  onChange={(e) => setNewListForm({...newListForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of this distribution list..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={creatingList}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingList}
                  className="bg-gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {creatingList ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Target Group Modal */}
      {showCreateGroupModal && selectedList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Target Group</h3>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupForm.group_name}
                    onChange={(e) => setNewGroupForm({...newGroupForm, group_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Local Food Lovers"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group URL
                  </label>
                  <input
                    type="url"
                    value={newGroupForm.group_url}
                    onChange={(e) => setNewGroupForm({...newGroupForm, group_url: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://facebook.com/groups/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Description
                </label>
                <textarea
                  value={newGroupForm.group_description}
                  onChange={(e) => setNewGroupForm({...newGroupForm, group_description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Brief description of this group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={newGroupForm.target_audience}
                  onChange={(e) => setNewGroupForm({...newGroupForm, target_audience: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Food enthusiasts, local community members"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Instructions
                </label>
                <textarea
                  value={newGroupForm.group_instructions}
                  onChange={(e) => setNewGroupForm({...newGroupForm, group_instructions: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Specific instructions for posting to this group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Size (Members)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newGroupForm.group_size}
                  onChange={(e) => setNewGroupForm({...newGroupForm, group_size: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 11600 for 11.6k members"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posting Frequency
                  </label>
                  <select
                    value={newGroupForm.posting_frequency}
                    onChange={(e) => setNewGroupForm({...newGroupForm, posting_frequency: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Posts Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newGroupForm.max_posts_per_day}
                    onChange={(e) => setNewGroupForm({...newGroupForm, max_posts_per_day: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Posting Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDaySelection(day)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        newGroupForm.preferred_posting_days.includes(day)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Posting Times
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {timeOptions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleTimeSelection(time)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        newGroupForm.preferred_posting_times.includes(time)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={creatingGroup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="bg-gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {creatingGroup ? 'Creating...' : 'Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distribution Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Distribution Logs</h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {distributionLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl text-gray-300 mb-4">📊</div>
                <p className="text-gray-500">No distribution logs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {distributionLogs.map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{log.content_title}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        log.success 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.success ? 'Success' : 'Failed'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">List:</span> {log.distribution_list_name} • 
                      <span className="font-medium ml-1">Group:</span> {log.target_group_name}
                    </div>
                    
                    {log.content_summary && (
                      <p className="text-sm text-gray-600 mb-2">{log.content_summary}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Shared by {log.shared_by_name}</span>
                      <span>{new Date(log.shared_at).toLocaleString()}</span>
                    </div>
                    
                    {log.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Notes:</strong> {log.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Target Group Modal */}
      {showEditGroupModal && editingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit Target Group</h3>
            
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={editingGroup.group_name}
                  onChange={(e) => setEditingGroup({...editingGroup, group_name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Local Food Lovers"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group URL
                </label>
                <input
                  type="url"
                  value={editingGroup.group_url || ''}
                  onChange={(e) => setEditingGroup({...editingGroup, group_url: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://facebook.com/groups/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Description
                </label>
                <textarea
                  value={editingGroup.group_description || ''}
                  onChange={(e) => setEditingGroup({...editingGroup, group_description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Brief description of this group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={editingGroup.target_audience || ''}
                  onChange={(e) => setEditingGroup({...editingGroup, target_audience: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Food enthusiasts, local community members"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Instructions
                </label>
                <textarea
                  value={editingGroup.group_instructions || ''}
                  onChange={(e) => setEditingGroup({...editingGroup, group_instructions: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Specific instructions for posting to this group..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Size (Members)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingGroup.group_size || 0}
                  onChange={(e) => setEditingGroup({...editingGroup, group_size: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 11600 for 11.6k members"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posting Frequency
                  </label>
                  <select
                    value={editingGroup.posting_frequency || 'weekly'}
                    onChange={(e) => setEditingGroup({...editingGroup, posting_frequency: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Posts Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingGroup.max_posts_per_day || 1}
                    onChange={(e) => setEditingGroup({...editingGroup, max_posts_per_day: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingGroup.is_active}
                  onChange={(e) => setEditingGroup({...editingGroup, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Group is active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingGroup}
                  className="bg-gradient-primary text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {updatingGroup ? 'Updating...' : 'Update Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualDistribution;
