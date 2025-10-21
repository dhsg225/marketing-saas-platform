import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { 
  CogIcon, 
  ArrowPathIcon, 
  TableCellsIcon, 
  DocumentTextIcon, 
  LinkIcon, 
  BoltIcon, 
  DocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface SystemLogicSettingsProps {}

const SystemLogicSettings: React.FC<SystemLogicSettingsProps> = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('state-flows');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user has admin privileges
  useEffect(() => {
    // For now, we'll check if user email contains admin or is a specific admin email
    // In production, this should be based on user roles from the database
    const adminEmails = ['shannon.green.asia@gmail.com', 'admin@productionhouse.asia'];
    setIsAdmin(adminEmails.includes(user?.email || ''));
  }, [user]);

  const tabs = [
    { id: 'state-flows', name: 'State Flows', icon: ArrowPathIcon, description: 'Visual overview of entity lifecycles' },
    { id: 'table-structure', name: 'Table Structure', icon: TableCellsIcon, description: 'Database schema and relationships' },
    { id: 'field-structure', name: 'Field Structure', icon: DocumentTextIcon, description: 'Field mappings and usage' },
    { id: 'api-mapping', name: 'API & State Mapping', icon: LinkIcon, description: 'Endpoint to state flow mapping' },
    { id: 'triggers', name: 'Triggers & Automation', icon: BoltIcon, description: 'Automation rules and triggers' },
    { id: 'timezone', name: 'Timezone Management', icon: ClockIcon, description: 'Global timezone settings and conversion' },
    { id: 'system-notes', name: 'System Notes', icon: DocumentIcon, description: 'Human-readable documentation' }
  ];

  // Admin access check
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <EyeSlashIcon className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            System Logic Settings is only available to administrators and developers.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">
              Contact your system administrator if you need access to this area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'state-flows':
        return <StateFlowsTab />;
      case 'table-structure':
        return <TableStructureTab />;
      case 'field-structure':
        return <FieldStructureTab />;
      case 'api-mapping':
        return <ApiMappingTab />;
      case 'triggers':
        return <TriggersTab />;
      case 'timezone':
        return <TimezoneTab />;
      case 'system-notes':
        return <SystemNotesTab />;
      default:
        return <StateFlowsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CogIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">System Logic Settings</h1>
                <p className="text-sm text-gray-500">Developer insights and system configuration</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-500">Admin Access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <div>{tab.name}</div>
                      <div className="text-xs text-gray-500">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// State Flows Tab Component
const StateFlowsTab: React.FC = () => {
  const [selectedFlow, setSelectedFlow] = useState('content-ideas');

  const flows = [
    {
      id: 'content-ideas',
      name: 'Content Ideas Flow',
      description: 'How content ideas move through the approval and publishing process',
      states: [
        { name: 'Ideas', description: 'Initial content concepts', color: 'bg-gray-100 text-gray-800' },
        { name: 'Concept Approved', description: 'Approved for development', color: 'bg-blue-100 text-blue-800' },
        { name: 'In Development', description: 'Being developed', color: 'bg-yellow-100 text-yellow-800' },
        { name: 'Ready to Publish', description: 'Ready for scheduling', color: 'bg-green-100 text-green-800' },
        { name: 'Published', description: 'Live content', color: 'bg-purple-100 text-purple-800' }
      ],
      transitions: [
        { from: 'Ideas', to: 'Concept Approved', trigger: 'Manual approval by admin', description: 'Admin reviews and approves content concept' },
        { from: 'Concept Approved', to: 'In Development', trigger: 'Assignment to developer', description: 'Content is assigned for development' },
        { from: 'In Development', to: 'Ready to Publish', trigger: 'Development completion', description: 'Content is fully developed and ready' },
        { from: 'Ready to Publish', to: 'Published', trigger: 'Scheduled publication', description: 'Content is published at scheduled time' }
      ]
    },
    {
      id: 'campaigns',
      name: 'Campaigns Flow',
      description: 'Campaign lifecycle management',
      states: [
        { name: 'Draft', description: 'Campaign being planned', color: 'bg-gray-100 text-gray-800' },
        { name: 'Active', description: 'Campaign is running', color: 'bg-green-100 text-green-800' },
        { name: 'Paused', description: 'Campaign temporarily stopped', color: 'bg-yellow-100 text-yellow-800' },
        { name: 'Completed', description: 'Campaign finished', color: 'bg-blue-100 text-blue-800' }
      ],
      transitions: [
        { from: 'Draft', to: 'Active', trigger: 'Campaign launch', description: 'Campaign is activated and starts running' },
        { from: 'Active', to: 'Paused', trigger: 'Manual pause', description: 'Campaign is temporarily paused' },
        { from: 'Paused', to: 'Active', trigger: 'Resume campaign', description: 'Campaign is resumed' },
        { from: 'Active', to: 'Completed', trigger: 'End date reached', description: 'Campaign reaches its end date' }
      ]
    }
  ];

  const currentFlow = flows.find(flow => flow.id === selectedFlow) || flows[0];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">State Flows</h2>
        <p className="text-gray-600">Visual overview of how entities move through their lifecycle</p>
      </div>

      {/* Flow Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Flow</label>
        <select
          value={selectedFlow}
          onChange={(e) => setSelectedFlow(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {flows.map((flow) => (
            <option key={flow.id} value={flow.id}>{flow.name}</option>
          ))}
        </select>
      </div>

      {/* Current Flow Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentFlow.name}</h3>
        <p className="text-gray-600 mb-4">{currentFlow.description}</p>

        {/* States Visualization */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">States</h4>
          <div className="flex flex-wrap gap-2">
            {currentFlow.states.map((state, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${state.color}`}>
                  {state.name}
                </span>
                {index < currentFlow.states.length - 1 && (
                  <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transitions */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Transitions</h4>
          <div className="space-y-3">
            {currentFlow.transitions.map((transition, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                    {transition.from}
                  </span>
                  <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded">
                    {transition.to}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Trigger:</strong> {transition.trigger}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {transition.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simulation Button */}
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Simulate Flow
        </button>
      </div>
    </div>
  );
};

// Table Structure Tab Component
const TableStructureTab: React.FC = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Table Structure</h2>
        <p className="text-gray-600">Database schema and relationships</p>
      </div>
      <div className="flex space-x-2">
        <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
          Export CSV
        </button>
        <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200">
          Export JSON
        </button>
      </div>
    </div>
    
    <div className="space-y-6">
      {/* Core Tables */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <TableCellsIcon className="h-5 w-5 mr-2 text-blue-600" />
          Core Tables
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">users</h5>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• id (UUID, PK)</div>
              <div>• email (VARCHAR)</div>
              <div>• name (VARCHAR)</div>
              <div>• industry_preference (VARCHAR)</div>
              <div>• created_at (TIMESTAMP)</div>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <h5 className="font-medium text-green-900 mb-2">clients</h5>
            <div className="text-sm text-green-800 space-y-1">
              <div>• id (UUID, PK)</div>
              <div>• company_name (VARCHAR)</div>
              <div>• business_description (TEXT)</div>
              <div>• contact_email (VARCHAR)</div>
              <div>• created_at (TIMESTAMP)</div>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <h5 className="font-medium text-purple-900 mb-2">projects</h5>
            <div className="text-sm text-purple-800 space-y-1">
              <div>• id (UUID, PK)</div>
              <div>• name (VARCHAR)</div>
              <div>• description (TEXT)</div>
              <div>• client_id (UUID, FK)</div>
              <div>• status (VARCHAR)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tables */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-orange-600" />
          Content Tables
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-orange-50 p-3 rounded-lg">
            <h5 className="font-medium text-orange-900 mb-2">content_ideas</h5>
            <div className="text-sm text-orange-800 space-y-1">
              <div>• id (UUID, PK)</div>
              <div>• title (VARCHAR)</div>
              <div>• description (TEXT)</div>
              <div>• status (VARCHAR)</div>
              <div>• suggested_date (DATE)</div>
              <div>• suggested_time (TIME)</div>
              <div>• project_id (UUID, FK)</div>
            </div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">posts</h5>
            <div className="text-sm text-yellow-800 space-y-1">
              <div>• id (UUID, PK)</div>
              <div>• title (VARCHAR)</div>
              <div>• content (TEXT)</div>
              <div>• status (VARCHAR)</div>
              <div>• scheduled_date (DATE)</div>
              <div>• scheduled_time (TIME)</div>
              <div>• concept_id (UUID, FK)</div>
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <h5 className="font-medium text-red-900 mb-2">post_types</h5>
            <div className="text-sm text-red-800 space-y-1">
              <div>• id (UUID, PK)</div>
              <div>• name (VARCHAR)</div>
              <div>• purpose (TEXT)</div>
              <div>• color (VARCHAR)</div>
              <div>• icon (VARCHAR)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Relationship Diagram */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Table Relationships</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-700 space-y-2">
            <div><strong>users</strong> → <strong>clients</strong> (account_manager_id)</div>
            <div><strong>clients</strong> → <strong>projects</strong> (client_id)</div>
            <div><strong>projects</strong> → <strong>content_ideas</strong> (project_id)</div>
            <div><strong>content_ideas</strong> → <strong>posts</strong> (concept_id)</div>
            <div><strong>post_types</strong> → <strong>content_ideas</strong> (post_type_id)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Field Structure Tab Component
const FieldStructureTab: React.FC = () => (
  <div className="p-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Field Structure</h2>
      <p className="text-gray-600 mb-6">Field mappings and usage across the system</p>
    </div>
    
    <div className="space-y-6">
      {/* ContentIdea Model */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
          ContentIdea Model
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Used In</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Editable</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">id</td>
                <td className="px-4 py-2 text-sm text-gray-500">UUID</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">No</td>
                <td className="px-4 py-2 text-sm text-gray-500">Primary key</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">title</td>
                <td className="px-4 py-2 text-sm text-gray-500">String</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">Required field</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">status</td>
                <td className="px-4 py-2 text-sm text-gray-500">Enum</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">ideas, concept_approved, in_development, ready_to_publish, published</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">suggested_date</td>
                <td className="px-4 py-2 text-sm text-gray-500">Date</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">Used for calendar display</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">suggested_time</td>
                <td className="px-4 py-2 text-sm text-gray-500">Time</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">Optional, nullable</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Model */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600" />
          Post Model
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Used In</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Editable</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">id</td>
                <td className="px-4 py-2 text-sm text-gray-500">UUID</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">No</td>
                <td className="px-4 py-2 text-sm text-gray-500">Primary key</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">content</td>
                <td className="px-4 py-2 text-sm text-gray-500">Text</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">Main content body</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">scheduled_date</td>
                <td className="px-4 py-2 text-sm text-gray-500">Date</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">For scheduling system</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-900">platform</td>
                <td className="px-4 py-2 text-sm text-gray-500">Enum</td>
                <td className="px-4 py-2 text-sm text-gray-500">DB</td>
                <td className="px-4 py-2 text-sm text-gray-500">Frontend, Backend</td>
                <td className="px-4 py-2 text-sm text-gray-500">Yes</td>
                <td className="px-4 py-2 text-sm text-gray-500">instagram, facebook, twitter, linkedin, tiktok</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

// API Mapping Tab Component
const ApiMappingTab: React.FC = () => (
  <div className="p-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">API & State Mapping</h2>
      <p className="text-gray-600 mb-6">Endpoint to state flow mapping</p>
    </div>
    
    <div className="space-y-6">
      {/* Content Ideas API */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
          Content Ideas API
        </h4>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-blue-900">PUT /api/content-ideas/:id</h5>
              <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">Update</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>Affects:</strong> content_ideas table</div>
              <div><strong>State Changes:</strong> Updates suggested_date, suggested_time</div>
              <div><strong>Triggers:</strong> Calendar refresh, content list update</div>
              <div><strong>Validation:</strong> Date not in past, time format valid</div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-green-900">GET /api/content-ideas/project/:projectId</h5>
              <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Read</span>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <div><strong>Returns:</strong> All content ideas for project</div>
              <div><strong>Filters:</strong> By suggested_date (for calendar)</div>
              <div><strong>Used By:</strong> Calendar view, Content List</div>
              <div><strong>Pagination:</strong> Limit 100, supports pagination</div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts API */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <LinkIcon className="h-5 w-5 mr-2 text-green-600" />
          Posts API
        </h4>
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-purple-900">POST /api/posts/save-draft</h5>
              <span className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded">Create/Update</span>
            </div>
            <div className="text-sm text-purple-800 space-y-1">
              <div><strong>Affects:</strong> posts table, content_ideas table</div>
              <div><strong>State Changes:</strong> Creates/updates post, updates concept status</div>
              <div><strong>Triggers:</strong> Content list refresh, calendar update</div>
              <div><strong>Validation:</strong> Required fields, valid UUIDs</div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-orange-900">GET /api/posts/scheduled/:projectId</h5>
              <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">Read</span>
            </div>
            <div className="text-sm text-orange-800 space-y-1">
              <div><strong>Returns:</strong> Scheduled posts for calendar</div>
              <div><strong>Filters:</strong> scheduled_date IS NOT NULL</div>
              <div><strong>Used By:</strong> Calendar view</div>
              <div><strong>Joins:</strong> posts, content_ideas, post_types, assets</div>
            </div>
          </div>
        </div>
      </div>

      {/* State Flow Diagram */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">API State Flow</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span><strong>Content Creation:</strong> POST /api/content-ideas → ideas status</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span><strong>Approval:</strong> PUT /api/content-ideas/:id → concept_approved status</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span><strong>Development:</strong> POST /api/posts/save-draft → in_development status</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span><strong>Scheduling:</strong> PUT /api/content-ideas/:id → ready_to_publish status</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
              <span><strong>Publication:</strong> Scheduled job → published status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Triggers Tab Component
const TriggersTab: React.FC = () => (
  <div className="p-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Triggers & Automation</h2>
      <p className="text-gray-600 mb-6">Automation rules and system triggers</p>
    </div>
    
    <div className="space-y-6">
      {/* Content Lifecycle Triggers */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <BoltIcon className="h-5 w-5 mr-2 text-blue-600" />
          Content Lifecycle Triggers
        </h4>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-blue-900">Content Approval Trigger</h5>
              <div className="flex space-x-2">
                <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Enabled</span>
                <button className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                  Toggle
                </button>
              </div>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>Trigger:</strong> When content_ideas.status = 'concept_approved'</div>
              <div><strong>Action:</strong> Send notification to content team</div>
              <div><strong>Frequency:</strong> Immediate</div>
              <div><strong>Why:</strong> Notify team that content is ready for development</div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-green-900">Scheduling Trigger</h5>
              <div className="flex space-x-2">
                <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Enabled</span>
                <button className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                  Toggle
                </button>
              </div>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <div><strong>Trigger:</strong> When suggested_date is set on content_ideas</div>
              <div><strong>Action:</strong> Refresh calendar view, update content list</div>
              <div><strong>Frequency:</strong> Immediate</div>
              <div><strong>Why:</strong> Ensure calendar shows latest scheduled content</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Maintenance Triggers */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <BoltIcon className="h-5 w-5 mr-2 text-orange-600" />
          System Maintenance Triggers
        </h4>
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-orange-900">Data Cleanup Trigger</h5>
              <div className="flex space-x-2">
                <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Enabled</span>
                <button className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                  Toggle
                </button>
              </div>
            </div>
            <div className="text-sm text-orange-800 space-y-1">
              <div><strong>Trigger:</strong> Daily at 2:00 AM</div>
              <div><strong>Action:</strong> Clean up old draft posts, archive completed campaigns</div>
              <div><strong>Frequency:</strong> Daily</div>
              <div><strong>Why:</strong> Maintain database performance and storage efficiency</div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-red-900">Error Monitoring Trigger</h5>
              <div className="flex space-x-2">
                <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">Enabled</span>
                <button className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                  Toggle
                </button>
              </div>
            </div>
            <div className="text-sm text-red-800 space-y-1">
              <div><strong>Trigger:</strong> When API error rate &gt; 5%</div>
              <div><strong>Action:</strong> Send alert to development team</div>
              <div><strong>Frequency:</strong> Real-time</div>
              <div><strong>Why:</strong> Proactive error detection and response</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Trigger */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <BoltIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <h4 className="font-medium text-gray-900 mb-2">Add New Automation Rule</h4>
        <p className="text-sm text-gray-600 mb-4">
          Create custom triggers for your specific workflow needs.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Create New Trigger
        </button>
      </div>
    </div>
  </div>
);

// System Notes Tab Component
const SystemNotesTab: React.FC = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Documentation</h2>
        <p className="text-gray-600">Human-readable documentation and notes</p>
      </div>
      <div className="flex space-x-2">
        <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
          New Note
        </button>
        <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200">
          Export
        </button>
      </div>
    </div>
    
    <div className="space-y-6">
      {/* Recent Notes */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <DocumentIcon className="h-5 w-5 mr-2 text-blue-600" />
          Recent System Notes
        </h4>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-blue-900">Content Scheduling System</h5>
              <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">#scheduling</span>
            </div>
            <div className="text-sm text-blue-800 mb-2">
              <strong>Date:</strong> October 20, 2025
            </div>
            <div className="text-sm text-blue-800">
              Implemented post scheduling system with date/time fields. Content ideas can now be assigned 
              publication dates directly from the Content List. Calendar view displays both content ideas 
              (blue cards) and scheduled posts (purple cards). Fixed time persistence issues and validation.
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-green-900">Database Schema Updates</h5>
              <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded">#database</span>
            </div>
            <div className="text-sm text-green-800 mb-2">
              <strong>Date:</strong> October 20, 2025
            </div>
            <div className="text-sm text-green-800">
              Added scheduling fields to posts table: scheduled_date, scheduled_time, timezone, platform, 
              auto_publish. Fixed image_prompt column error in content-ideas table. Updated API endpoints 
              to handle new fields with proper validation.
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-purple-900">UI/UX Improvements</h5>
              <span className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded">#ui</span>
            </div>
            <div className="text-sm text-purple-800 mb-2">
              <strong>Date:</strong> October 20, 2025
            </div>
            <div className="text-sm text-purple-800">
              Separated edit modes in Content List: Calendar icon for date-only editing, Pencil icon for 
              full content editing. Added visual confirmation for successful saves. Improved error handling 
              and user feedback throughout the scheduling workflow.
            </div>
          </div>
        </div>
      </div>

      {/* Design Decisions */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <DocumentIcon className="h-5 w-5 mr-2 text-orange-600" />
          Design Decisions
        </h4>
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <h5 className="font-medium text-orange-900 mb-2">Why Two Separate Edit Modes?</h5>
            <div className="text-sm text-orange-800">
              Separated date editing from full content editing to prevent accidental changes to content 
              when users only want to schedule. This reduces cognitive load and prevents data loss.
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">Calendar Display Logic</h5>
            <div className="text-sm text-yellow-800">
              Content ideas appear on calendar when they have a suggested_date, regardless of status. 
              This allows scheduling at any stage of the content lifecycle, not just approved concepts.
            </div>
          </div>
        </div>
      </div>

      {/* Pending Refactors */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <DocumentIcon className="h-5 w-5 mr-2 text-red-600" />
          Pending Refactors
        </h4>
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h5 className="font-medium text-red-900 mb-2">API Response Standardization</h5>
            <div className="text-sm text-red-800">
              Need to standardize API response formats across all endpoints. Some return nested data 
              objects, others return flat structures. This inconsistency makes frontend integration harder.
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Error Handling Improvements</h5>
            <div className="text-sm text-gray-800">
              Implement consistent error handling patterns across all API endpoints. Currently using 
              different error response formats which makes debugging difficult.
            </div>
          </div>
        </div>
      </div>

      {/* Add New Note */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Add New System Note</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter note title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., #database, #ui, #api"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <textarea 
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your system note here..."
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Timezone Management Tab Component
const TimezoneTab: React.FC = () => {
  const [systemTimezone, setSystemTimezone] = useState('Asia/Bangkok');
  const [displayTimezone, setDisplayTimezone] = useState('Asia/Bangkok');
  const [timezoneAware, setTimezoneAware] = useState(true);
  const [dstAdjustment, setDstAdjustment] = useState(true);
  const [timezoneMap, setTimezoneMap] = useState<any[]>([]);

  const commonTimezones = [
    { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+7)', offset: '+07:00' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)', offset: '+08:00' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)', offset: '+09:00' },
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)', offset: '+08:00' },
    { value: 'Asia/Hong_Kong', label: 'Asia/Hong Kong (UTC+8)', offset: '+08:00' },
    { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)', offset: '+00:00/+01:00' },
    { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2)', offset: '+01:00/+02:00' },
    { value: 'America/New_York', label: 'America/New York (UTC-5/-4)', offset: '-05:00/-04:00' },
    { value: 'America/Los_Angeles', label: 'America/Los Angeles (UTC-8/-7)', offset: '-08:00/-07:00' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10/+11)', offset: '+10:00/+11:00' },
    { value: 'UTC', label: 'UTC (UTC+0)', offset: '+00:00' }
  ];

  const conversionExamples = [
    { local: '9:00 AM Bangkok', utc: '2:00 AM UTC', description: 'Morning post in Bangkok' },
    { local: '6:00 PM Singapore', utc: '10:00 AM UTC', description: 'Evening post in Singapore' },
    { local: '12:00 PM Tokyo', utc: '3:00 AM UTC', description: 'Lunch post in Tokyo' },
    { local: '8:00 PM London', utc: '8:00 PM UTC', description: 'Evening post in London (winter)' }
  ];

  return (
    <div className="space-y-6">
      {/* Global Timezone Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
          Global Timezone Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🌍 System Default Timezone
            </label>
            <select 
              value={systemTimezone}
              onChange={(e) => setSystemTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {commonTimezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Default timezone for new users and content</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⏱ Store Times In
            </label>
            <input 
              type="text" 
              value="UTC" 
              disabled 
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Always UTC for consistency (read-only)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👁 Display Times In
            </label>
            <select 
              value={displayTimezone}
              onChange={(e) => setDisplayTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {commonTimezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">How times are shown to users</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🧭 Fallback Timezone
            </label>
            <select 
              value={systemTimezone}
              onChange={(e) => setSystemTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {commonTimezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Used when user timezone is not set</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="timezone-aware"
              checked={timezoneAware}
              onChange={(e) => setTimezoneAware(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="timezone-aware" className="ml-2 text-sm text-gray-700">
              Enable timezone-aware scheduling
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="dst-adjustment"
              checked={dstAdjustment}
              onChange={(e) => setDstAdjustment(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="dst-adjustment" className="ml-2 text-sm text-gray-700">
              Automatically adjust for daylight saving time
            </label>
          </div>
        </div>
      </div>

      {/* Timezone Conversion Examples */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🧮 Timezone Conversion Examples
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Local Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  UTC Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversionExamples.map((example, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {example.local}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {example.utc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {example.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backend Behavior */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🧮 Backend Behavior
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Function
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Behavior
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Data Storage
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Always UTC
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  API Responses
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  UTC (with optional local conversion flag)
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Calendar Render
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Localized to user/system timezone
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Automations
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Execute in UTC
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Logs & Reports
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Show dual timestamps (UTC + local) for transparency
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tables Impacted */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🧱 Tables Impacted
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Content Tables</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• content_ideas (scheduled_at_utc, scheduled_timezone)</li>
              <li>• posts (scheduled_at_utc, scheduled_timezone)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">User Tables</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• users (timezone_preference, timezone_source)</li>
              <li>• clients (timezone_preference, timezone_source)</li>
              <li>• system_settings (timezone configuration)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
          Reset to Defaults
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default SystemLogicSettings;
