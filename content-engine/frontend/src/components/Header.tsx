import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useUser } from '../contexts/UserContext';
import UserContextIndicator from './UserContextIndicator';

interface HeaderProps {
  onShowLogin?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowLogin }) => {
  const location = useLocation();
  const { user, loading, logout } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLButtonElement>>({});
  const [dropdownPositions, setDropdownPositions] = useState<Record<string, { top: number; left: number }>>({});

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking on dropdown buttons or their children
      if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-menu]')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdown]);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (openDropdown && dropdownRefs.current[openDropdown]) {
      const rect = dropdownRefs.current[openDropdown].getBoundingClientRect();
      setDropdownPositions(prev => ({
        ...prev,
        [openDropdown]: {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        }
      }));
    }
  }, [openDropdown]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (loading) {
    return (
      <header className="modern-header">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="animate-pulse bg-gray-300 h-8 w-8 rounded"></div>
            <div className="animate-pulse bg-gray-300 h-6 w-32 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  // Redesigned Navigation - More Logical Grouping
  const domainNavigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: '📊',
      type: 'link' as const
    },
    {
      name: 'Content',
      icon: '✨',
      type: 'dropdown' as const,
      items: [
        { name: 'Create Post', href: '/create-post', icon: '✍️' },
        { name: 'Generate', href: '/generate', icon: '✨' },
        { name: 'Content Ideas', href: '/playbook', icon: '💡' },
        { name: 'Content List', href: '/content-list', icon: '📋' },
        { name: 'Calendar', href: '/calendar', icon: '📅' },
        { name: 'Assets', href: '/assets', icon: '🖼️' },
        { name: 'Publish', href: '/publish', icon: '📱' }
      ]
    },
    {
      name: 'Strategy',
      icon: '🎯',
      type: 'dropdown' as const,
      items: [
        { name: 'Content Strategy', href: '/playbook', icon: '🎯' },
        { name: 'Tone Profiler', href: '/tone-profiler', icon: '🎨' },
        { name: 'Post Types', href: '/playbook', icon: '🧩' },
        { name: 'Hashtags', href: '/playbook', icon: '#' },
        { name: 'Templates', href: '/playbook', icon: '🎨' }
      ]
    },
    {
      name: 'Collaborate',
      icon: '🤝',
      type: 'dropdown' as const,
      items: [
        { name: 'Client Collaboration', href: '/playbook', icon: '🤝' },
        { name: 'Reference Documents', href: '/playbook', icon: '📄' },
        { name: 'Manual Distribution', href: '/playbook', icon: '📢' },
        { name: 'Signature Blocks', href: '/playbook', icon: '✍️' }
      ]
    },
    {
      name: 'Analytics',
      icon: '📈',
      type: 'dropdown' as const,
      items: [
        { name: 'Performance', href: '/analytics', icon: '📈' },
        { name: 'Reports', href: '/reports', icon: '📊' }
      ]
    },
    {
      name: 'Manage',
      icon: '⚙️',
      type: 'dropdown' as const,
      items: [
        { name: 'Reports', href: '/reports', icon: '📄' },
        { name: 'Clients', href: '/clients', icon: '👥' },
        { name: 'Settings', href: '/settings', icon: '⚙️' },
        { name: 'Help', href: '/help', icon: '📚' }
      ]
    }
  ];

  return (
    <>
      <header className="modern-header">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-sm font-bold">
                M
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:ml-4 md:flex md:space-x-1 flex-1 justify-center">
                {domainNavigation.map((item) => {
                  const isActive = item.type === 'link' 
                    ? location.pathname === item.href
                    : item.items?.some(subItem => location.pathname === subItem.href);
                  
                  if (item.type === 'link') {
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`nav-link inline-flex items-center px-2 py-1.5 text-xs font-medium rounded transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <span className="mr-1.5 text-sm">{item.icon}</span>
                        <span className="hidden lg:inline">{item.name}</span>
                      </Link>
                    );
                  } else {
                    return (
                      <div key={item.name} className="relative">
                        <button
                          ref={(el) => {
                            if (el) dropdownRefs.current[item.name] = el;
                          }}
                          data-dropdown-trigger
                          onClick={() => setOpenDropdown(openDropdown === item.name ? null : item.name)}
                          className={`nav-link inline-flex items-center px-2 py-1.5 text-xs font-medium rounded transition-all duration-300 ${
                            isActive
                              ? 'bg-gradient-primary text-white shadow-glow'
                              : 'text-gray-700 hover:text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <span className="mr-1.5 text-sm">{item.icon}</span>
                          <span className="hidden lg:inline">{item.name}</span>
                          <span className="ml-1 text-xs">▼</span>
                        </button>
                        
                      </div>
                    );
                  }
                })}

              </nav>
            </div>

            {/* User Context & Profile */}
            <div className="flex items-center flex-shrink-0 ml-auto">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserContextIndicator />
                  {!user && (
                    <button
                      onClick={onShowLogin}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
                {/* Domain Navigation */}
                {domainNavigation.map((item) => {
                  if (item.type === 'link') {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-gradient-primary text-white'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                      </Link>
                    );
                  } else {
                    return (
                      <div key={item.name}>
                        <div className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          {item.name}
                        </div>
                        {item.items?.map((subItem) => {
                          const isActive = location.pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                                isActive
                                  ? 'bg-gradient-primary text-white'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <span className="mr-2">{subItem.icon}</span>
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  }
                })}
              </div>
              {user && (
                <>
                  <Link
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    ⚙️ Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    🚪 Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      
      {/* Portal-rendered Dropdowns */}
      {openDropdown && domainNavigation.find(item => item.name === openDropdown && item.type === 'dropdown') && (
        ReactDOM.createPortal(
          <div
            data-dropdown-menu
            className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[9999]"
            style={{
              top: dropdownPositions[openDropdown]?.top || 0,
              left: dropdownPositions[openDropdown]?.left || 0
            }}
          >
            {domainNavigation
              .find(item => item.name === openDropdown)
              ?.items?.map((subItem) => (
                <Link
                  key={subItem.name}
                  to={subItem.href}
                  onClick={() => setOpenDropdown(null)}
                  className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                    location.pathname === subItem.href ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span className="mr-3 text-base">{subItem.icon}</span>
                  {subItem.name}
                </Link>
              ))}
          </div>,
          document.body
        )
      )}
      
    </>
  );
};

export default Header;