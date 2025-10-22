import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { ChevronRightIcon, UserIcon, BuildingOfficeIcon, FolderIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import api from '../services/api';

const BreadcrumbNav: React.FC = () => {
  const { user, organizations, clients, selectedOrganization, selectedClient, selectedProject, token } = useUser();
  const [projectName, setProjectName] = useState<string>('');

  // Fetch project name when selectedProject changes
  useEffect(() => {
    const fetchProjectName = async () => {
      if (!selectedProject || !token) {
        setProjectName('');
        return;
      }

      try {
        const response = await axios.get(api.getUrl(`projects/${selectedProject}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success && response.data.data) {
          setProjectName(response.data.data.name);
        }
      } catch (error) {
        console.error('Failed to fetch project name:', error);
        setProjectName('Project');
      }
    };

    fetchProjectName();
  }, [selectedProject, token]);

  if (!user) return null;

  const selectedOrg = organizations.find(org => org.organization_id === selectedOrganization);
  const selectedClientData = clients.find(client => client.id === selectedClient);

  const getOrganizationName = (orgId: string) => {
    const orgNames: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440000': 'Productionhouse Asia',
      '550e8400-e29b-41d4-a716-446655440001': 'Marketing Solutions Inc'
    };
    return orgNames[orgId] || `Organization ${orgId.slice(0, 8)}...`;
  };

  return (
    <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-lg px-4 py-2 mb-6 shadow-lg">
      <nav className="flex items-center space-x-2 text-sm">
        {/* Organization first */}
        {selectedOrganization && (
          <div className="flex items-center space-x-1 text-white">
            <BuildingOfficeIcon className="h-4 w-4" />
            <span className="font-medium">
              {selectedOrg ? getOrganizationName(selectedOrg.organization_id) : 'Organization'}
            </span>
          </div>
        )}

        {/* Then user and role */}
        <>
          <ChevronRightIcon className="h-4 w-4 text-gray-300" />
          <div className="flex items-center space-x-1 text-white">
            <UserIcon className="h-4 w-4" />
            <span className="font-medium">{user.name}</span>
            {selectedOrg && (
              <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full ml-2">
                {selectedOrg.role}
              </span>
            )}
          </div>
        </>

        {/* Then client */}
        {selectedClient && (
          <>
            <ChevronRightIcon className="h-4 w-4 text-gray-300" />
            <div className="flex items-center space-x-1 text-white">
              <BuildingOfficeIcon className="h-4 w-4" />
              <span className="font-medium">
                {selectedClientData ? selectedClientData.company_name : 'Client'}
              </span>
            </div>
          </>
        )}

        {/* Then project */}
        {selectedProject && (
          <>
            <ChevronRightIcon className="h-4 w-4 text-gray-300" />
            <div className="flex items-center space-x-1 text-white">
              <FolderIcon className="h-4 w-4" />
              <span className="font-medium">
                {projectName || 'Project'}
              </span>
            </div>
          </>
        )}
      </nav>
    </div>
  );
};

export default BreadcrumbNav;
