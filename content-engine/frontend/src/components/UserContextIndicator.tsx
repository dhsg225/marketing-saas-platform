import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../contexts/UserContext';
import { ChevronDownIcon, UserIcon, BuildingOfficeIcon, FolderIcon } from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  description: string;
  industry: string;
}

const UserContextIndicator: React.FC = () => {
  const { 
    user, 
    organizations, 
    clients,
    projects,
    selectedOrganization, 
    selectedClient,
    selectedProject, 
    setSelectedOrganization, 
    setSelectedClient,
    setSelectedProject: handleSetSelectedProject,
    logout,
    token
  } = useUser();

  // Debug logging
  console.log('UserContextIndicator: selectedClient:', selectedClient, 'projects:', projects.length);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking on the dropdown container or any of its children
      if (!target.closest('.user-dropdown-container') && !target.closest('[data-dropdown-menu]')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);


  if (!user) return null;

  const selectedOrg = organizations.find(org => org.organization_id === selectedOrganization);

  const getOrganizationName = (orgId: string) => {
    const orgNames: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440000': 'Productionhouse Asia',
      '550e8400-e29b-41d4-a716-446655440001': 'Marketing Solutions Inc'
    };
    return orgNames[orgId] || `Organization ${orgId.slice(0, 8)}...`;
  };

  return (
    <div className="relative user-dropdown-container" style={{zIndex: 9999}}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Profile button clicked!', showDropdown);
          const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect();
          setButtonRect(rect || null);
          setShowDropdown(!showDropdown);
        }}
        className="flex items-center space-x-3 px-4 py-2 bg-purple-800 rounded-lg hover:bg-purple-700 transition-all duration-300 border-2 border-purple-600 cursor-pointer shadow-lg hover:shadow-xl"
      >
        <div className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5 text-white" />
          <span className="text-white font-medium">{user.name}</span>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-white" />
      </button>

      {showDropdown && buttonRect && createPortal(
        <div 
          data-dropdown-menu
          onClick={(e) => e.stopPropagation()}
          className="fixed w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
          style={{
            top: buttonRect.bottom + 8,
            left: buttonRect.right - 320, // 320px = 80 * 4 (w-80 = 20rem = 320px)
          }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.industry_preference} Industry
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Organization Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                Organization
              </label>
              <select
                value={selectedOrganization || ''}
                onChange={(e) => setSelectedOrganization(e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.organization_id} value={org.organization_id}>
                    {getOrganizationName(org.organization_id)} ({org.role})
                  </option>
                ))}
              </select>
              {selectedOrg && (
                <p className="text-xs text-gray-500 mt-1">
                  Role: {selectedOrg.role}
                </p>
              )}
            </div>

            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Client
              </label>
              <select
                value={selectedClient || ''}
                onChange={(e) => setSelectedClient(e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                disabled={!selectedOrganization}
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name} ({client.industry})
                  </option>
                ))}
              </select>
              {!selectedOrganization && (
                <p className="text-xs text-gray-500 mt-1">
                  Select an organization first
                </p>
              )}
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FolderIcon className="h-4 w-4 inline mr-1" />
                Project
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => {
                  console.log('UserContextIndicator: Project selection changed to:', e.target.value);
                  console.log('UserContextIndicator: About to call handleSetSelectedProject with:', e.target.value || null);
                  handleSetSelectedProject(e.target.value || null);
                  console.log('UserContextIndicator: handleSetSelectedProject called');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                disabled={!selectedClient}
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.industry})
                  </option>
                ))}
              </select>
              {!selectedClient && (
                <p className="text-xs text-gray-500 mt-1">
                  Select a user/client first
                </p>
              )}
            </div>

            {/* Current Context Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Context</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>User:</span>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Organization:</span>
                  <span className="font-medium">
                    {selectedOrg ? getOrganizationName(selectedOrg.organization_id) : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Project:</span>
                  <span className="font-medium">
                    {selectedProject ? projects.find(p => p.id === selectedProject)?.name || 'Unknown' : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={logout}
              className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserContextIndicator;
