import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  industry_preference: string;
  created_at: string;
}

interface Organization {
  organization_id: string;
  role: string;
  created_at: string;
}

interface Client {
  id: string;
  organization_id: string;
  company_name: string;
  industry: string;
  account_status: string;
  subscription_tier: string;
  project_count: number;
  active_projects: number;
  total_revenue: number;
}

interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  industry: string;
  status: string;
  client_id: string;
  client_name?: string; // Optional - may not always be included
  project_type: string;
  priority: string;
  budget: number;
}

interface UserContextType {
  user: User | null;
  organizations: Organization[];
  clients: Client[];
  projects: Project[];
  selectedOrganization: string | null;
  selectedClient: string | null;
  selectedProject: string | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, industry_preference: string) => Promise<boolean>;
  logout: () => void;
  setSelectedOrganization: (orgId: string | null) => void;
  setSelectedClient: (clientId: string | null) => void;
  setSelectedProject: (projectId: string | null) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Load selected project from localStorage on mount
  useEffect(() => {
    const savedProject = localStorage.getItem('selectedProject');
    if (savedProject && savedProject !== selectedProject) {
      setSelectedProject(savedProject);
      console.log('UserContext: Loaded project from localStorage:', savedProject);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        await loadUserOrganizations(tokenToVerify);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserOrganizations = async (tokenToUse: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/organizations`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data);
        
        // Auto-select first organization if none selected
        if (data.data.length > 0 && !selectedOrganization) {
          setSelectedOrganization(data.data[0].organization_id);
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadClients = async (organizationId: string, tokenToUse: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/clients/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.data);
        
        // Auto-select first client if none selected
        if (data.data.length > 0 && !selectedClient) {
          setSelectedClient(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadProjects = async (clientId: string, tokenToUse: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/projects/client/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.data);
        
        // [2025-10-20 09:10 +07] - Prefer persisted selection over defaulting to first project
        // When projects load, first try to restore the project saved in localStorage (if present and valid).
        // This prevents unexpected fallback to the first project (e.g., "Big Poppa").
        if (data.data.length > 0) {
          const savedProject = localStorage.getItem('selectedProject');
          if (savedProject && data.data.some((p: Project) => p.id === savedProject)) {
            setSelectedProject(savedProject);
          } else if (!selectedProject) {
            setSelectedProject(data.data[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const { user: userData, token: userToken } = data.data;
        
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('auth_token', userToken);
        
        await loadUserOrganizations(userToken);
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData.error);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, industry_preference: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, industry_preference }),
      });

      if (response.ok) {
        const data = await response.json();
        const { user: userData, token: userToken } = data.data;
        
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('auth_token', userToken);
        
        await loadUserOrganizations(userToken);
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Registration failed:', errorData.error);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setOrganizations([]);
    setClients([]);
    setSelectedOrganization(null);
    setSelectedClient(null);
    setSelectedProject(null);
    localStorage.removeItem('auth_token'); // [2025-10-09] - Clear authentication token
    localStorage.removeItem('selectedProject'); // [2025-10-09] - Clear selected project for calendar reset
  };

  // Load clients whenever organization or token changes
  useEffect(() => {
    if (selectedOrganization && token) {
      loadClients(selectedOrganization, token);
    } else {
      setClients([]);
      setSelectedClient(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrganization, token]);

  // Load projects whenever client or token changes
  useEffect(() => {
    if (selectedClient && token) {
      loadProjects(selectedClient, token);
    } else {
      setProjects([]);
      setSelectedProject(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, token]);

  // Wrapper function to save project selection to localStorage
  const handleSetSelectedProject = (projectId: string | null) => {
    console.log('UserContext: handleSetSelectedProject called with:', projectId);
    setSelectedProject(projectId);
    if (projectId) {
      localStorage.setItem('selectedProject', projectId);
      console.log('UserContext: Saved project to localStorage:', projectId);
      console.log('UserContext: localStorage now contains:', localStorage.getItem('selectedProject'));
    } else {
      localStorage.removeItem('selectedProject');
      console.log('UserContext: Removed project from localStorage');
    }
  };

  const value: UserContextType = {
    user,
    organizations,
    clients,
    projects,
    selectedOrganization,
    selectedClient,
    selectedProject,
    token,
    login,
    register,
    logout,
    setSelectedOrganization,
    setSelectedClient,
    setSelectedProject: handleSetSelectedProject,
    loading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
