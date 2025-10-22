import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';

interface ClientPortalUser {
  id: string;
  client_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login_at: string;
  created_at: string;
  updated_at: string;
  project_access: ProjectAccess[];
}

interface ProjectAccess {
  project_id: string;
  access_level: string;
  expires_at: string;
}

interface ApprovalWorkflow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  workflow_type: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  step_name: string;
  step_type: string;
  approver_type: string;
  approver_id: string;
  approver_role: string;
  is_required: boolean;
  auto_approve_after_hours: number;
}

interface ApprovalRequest {
  id: string;
  project_id: string;
  workflow_id: string;
  content_type: string;
  content_id: string;
  content_title: string;
  content_preview: string;
  requested_by: string;
  requested_at: string;
  status: string;
  approved_at: string;
  rejected_at: string;
  approved_by: string;
  rejection_reason: string;
  expires_at: string;
  workflow_name: string;
  requested_by_name: string;
  approved_by_name: string;
}

interface ClientFeedback {
  id: string;
  approval_request_id: string;
  project_id: string;
  content_type: string;
  content_id: string;
  client_portal_user_id: string;
  feedback_type: string;
  feedback_text: string;
  is_public: boolean;
  is_resolved: boolean;
  resolved_by: string;
  resolved_at: string;
  created_at: string;
  updated_at: string;
  client_user_name: string;
  resolved_by_name: string;
}

interface CollaborationSession {
  id: string;
  project_id: string;
  session_name: string;
  session_type: string;
  host_user_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  status: string;
  meeting_link: string;
  meeting_notes: string;
  created_at: string;
  updated_at: string;
  host_name: string;
  participants: SessionParticipant[];
}

interface SessionParticipant {
  id: string;
  session_id: string;
  participant_id: string;
  participant_type: string;
  role: string;
  joined_at: string;
  left_at: string;
  created_at: string;
  participant_name: string;
}

interface SharedAsset {
  id: string;
  project_id: string;
  asset_type: string;
  asset_name: string;
  asset_path: string;
  asset_url: string;
  description: string;
  shared_by: string;
  shared_at: string;
  is_public: boolean;
  access_level: string;
  expires_at: string;
  shared_by_name: string;
}

const ClientCollaboration: React.FC = () => {
  const { selectedProject, projects } = useUser();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  
  // Get the full project object from the projects array
  const currentProject = projects.find(p => p.id === selectedProject);

  // Client Portal Users State
  const [clientUsers, setClientUsers] = useState<ClientPortalUser[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    name: '',
    role: 'viewer',
    project_access: [] as { project_id: string; access_level: string }[]
  });

  // Approval Workflows State
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [newWorkflowForm, setNewWorkflowForm] = useState({
    name: '',
    description: '',
    workflow_type: 'content',
    steps: [] as WorkflowStep[]
  });

  // Approval Requests State
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  // const [showCreateRequestModal, setShowCreateRequestModal] = useState(false); // TODO: Implement modal

  // Client Feedback State
  const [feedback, setFeedback] = useState<ClientFeedback[]>([]);

  // Collaboration Sessions State
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  // const [showCreateSessionModal, setShowCreateSessionModal] = useState(false); // TODO: Implement modal

  // Shared Assets State
  const [sharedAssets, setSharedAssets] = useState<SharedAsset[]>([]);
  // const [showShareAssetModal, setShowShareAssetModal] = useState(false); // TODO: Implement modal

  useEffect(() => {
    if (currentProject) {
      loadClientUsers();
      loadWorkflows();
      loadApprovalRequests();
      loadFeedback();
      loadSessions();
      loadSharedAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const loadClientUsers = async () => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/clients/${currentProject.client_id}/users`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClientUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading client users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    if (!currentProject) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/projects/${currentProject.id}/workflows`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  const loadApprovalRequests = async () => {
    if (!currentProject) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/projects/${currentProject.id}/approval-requests`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApprovalRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading approval requests:', error);
    }
  };

  const loadFeedback = async () => {
    if (!currentProject) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/projects/${currentProject.id}/feedback`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadSessions = async () => {
    if (!currentProject) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/projects/${currentProject.id}/sessions`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadSharedAssets = async () => {
    if (!currentProject) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/projects/${currentProject.id}/shared-assets`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Error loading shared assets:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/clients/${currentProject.client_id}/users`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserForm)
      });

      if (response.ok) {
        setShowCreateUserModal(false);
        setNewUserForm({ email: '', name: '', role: 'viewer', project_access: [] });
        loadClientUsers();
      }
    } catch (error) {
      console.error('Error creating client user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api.getUrl(`client-collaboration/projects/${currentProject.id}/workflows`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newWorkflowForm)
      });

      if (response.ok) {
        setShowCreateWorkflowModal(false);
        setNewWorkflowForm({ name: '', description: '', workflow_type: 'content', steps: [] });
        loadWorkflows();
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentProject) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please select a project to access client collaboration features.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🤝 Client Collaboration Portal</h1>
        <p className="text-gray-600">Manage client access, approval workflows, and collaboration tools</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'users', label: '👥 Client Users', count: clientUsers.length },
              { id: 'workflows', label: '✅ Approval Workflows', count: workflows.length },
              { id: 'requests', label: '📋 Approval Requests', count: approvalRequests.length },
              { id: 'feedback', label: '💬 Client Feedback', count: feedback.length },
              { id: 'sessions', label: '🎯 Collaboration Sessions', count: sessions.length },
              { id: 'assets', label: '📁 Shared Assets', count: sharedAssets.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Client Portal Users</h2>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Client User
            </button>
          </div>

          <div className="grid gap-4">
            {clientUsers.map((user) => (
              <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Project Access: {user.project_access.length} projects</p>
                  {user.last_login_at && (
                    <p>Last Login: {formatDate(user.last_login_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Approval Workflows</h2>
            <button
              onClick={() => setShowCreateWorkflowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Workflow
            </button>
          </div>

          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {workflow.workflow_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                <div className="text-sm text-gray-600">
                  <p>Steps: {workflow.steps.length}</p>
                  <p>Created: {formatDate(workflow.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Approval Requests</h2>
            <button
              onClick={() => alert('Create Request modal - Coming soon!')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Request
            </button>
          </div>

          <div className="grid gap-4">
            {approvalRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{request.content_title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{request.content_preview}</p>
                <div className="text-sm text-gray-600">
                  <p>Workflow: {request.workflow_name}</p>
                  <p>Requested by: {request.requested_by_name}</p>
                  <p>Requested: {formatDate(request.requested_at)}</p>
                  {request.expires_at && (
                    <p>Expires: {formatDate(request.expires_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Client Feedback</h2>
          </div>

          <div className="grid gap-4">
            {feedback.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{item.client_user_name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.is_resolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.is_resolved ? 'Resolved' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.feedback_text}</p>
                <div className="text-sm text-gray-600">
                  <p>Type: {item.feedback_type}</p>
                  <p>Created: {formatDate(item.created_at)}</p>
                  {item.resolved_by_name && (
                    <p>Resolved by: {item.resolved_by_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Collaboration Sessions</h2>
            <button
              onClick={() => alert('Schedule Session modal - Coming soon!')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Schedule Session
            </button>
          </div>

          <div className="grid gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{session.session_name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Type: {session.session_type}</p>
                <div className="text-sm text-gray-600">
                  <p>Host: {session.host_name}</p>
                  <p>Participants: {session.participants.length}</p>
                  {session.scheduled_start && (
                    <p>Scheduled: {formatDate(session.scheduled_start)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Shared Assets</h2>
            <button
              onClick={() => alert('Share Asset modal - Coming soon!')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Share Asset
            </button>
          </div>

          <div className="grid gap-4">
            {sharedAssets.map((asset) => (
              <div key={asset.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{asset.asset_name}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {asset.asset_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                <div className="text-sm text-gray-600">
                  <p>Shared by: {asset.shared_by_name}</p>
                  <p>Access Level: {asset.access_level}</p>
                  <p>Shared: {formatDate(asset.shared_at)}</p>
                  {asset.expires_at && (
                    <p>Expires: {formatDate(asset.expires_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Client User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add Client User</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="client@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="approver">Approver</option>
                  <option value="collaborator">Collaborator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateWorkflowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Approval Workflow</h3>
            
            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={newWorkflowForm.name}
                  onChange={(e) => setNewWorkflowForm({...newWorkflowForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Content Approval Workflow"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newWorkflowForm.description}
                  onChange={(e) => setNewWorkflowForm({...newWorkflowForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the approval process..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Type
                </label>
                <select
                  value={newWorkflowForm.workflow_type}
                  onChange={(e) => setNewWorkflowForm({...newWorkflowForm, workflow_type: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="content">Content</option>
                  <option value="campaign">Campaign</option>
                  <option value="asset">Asset</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateWorkflowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCollaboration;
