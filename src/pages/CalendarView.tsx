import React, { useState, useEffect, useMemo } from 'react';
import { CalendarIcon, ClockIcon, ChartBarIcon, EyeIcon, PlusIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CalendarItem from '../components/CalendarItem';
import ReportOptionsModal from '../components/ReportOptionsModal';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import { 
  getDateRangeForView, 
  isDateInRange, 
  formatDateRange,
  getCalendarDateKey
} from '../utils/calendarDateUtils';

interface ContentPiece {
  id: string;
  title?: string;
  content: string;
  content_type: string;
  industry: string;
  type: string;
  topic?: string;
  tone?: string;
  length?: string;
  created_at: string;
  project_id?: string;
  is_content_idea?: boolean;
  is_scheduled_post?: boolean;
  scheduled_time?: string;
  platform?: string;
}

interface ContentIdea {
  id: string;
  title: string;
  description?: string;
  topic_keywords?: string[];
  suggested_date?: string;
  suggested_time?: string;
  priority: string;
  status: string;
  post_type_name?: string;
  post_type_color?: string;
  created_by_name?: string;
  approved_by_name?: string;
}

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  scheduled_date: string;
  scheduled_time: string;
  timezone: string;
  platform: string;
  auto_publish: boolean;
  status: string;
  post_type_name?: string;
  post_type_color?: string;
  attached_asset_url?: string;
}

interface CalendarViewProps {
  selectedProject?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ selectedProject }) => {
  const { token } = useUser();
  const [activeView, setActiveView] = useState<'1-day' | '7-day' | 'monthly' | 'quarterly'>('monthly');
  const [contentData, setContentData] = useState<ContentPiece[]>([]);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterContentType, setFilterContentType] = useState<string>('all');
  const [currentProject, setCurrentProject] = useState<string>('');
  const [currentProjectName, setCurrentProjectName] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
    return startOfWeek;
  });
  
  // Modal state for content ideas
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedIdea, setEditedIdea] = useState<ContentIdea | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Date range utility functions now imported from calendarDateUtils

  // Refresh calendar data
  const refreshCalendarData = async () => {
    if (!currentProject) return;
    
    console.log('🔄 Refreshing calendar data...');
    await loadContentIdeas(currentProject);
    await loadScheduledPosts(currentProject);
  };

  // Edit mode functions
  const enterEditMode = () => {
    if (selectedIdea) {
      setEditedIdea({ ...selectedIdea });
      setIsEditMode(true);
      setSaveError(null);
    }
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedIdea(null);
    setSaveError(null);
  };

  const validateDateAndTime = (idea: ContentIdea): string | null => {
    if (!idea.suggested_date) {
      return 'Date is required';
    }

    const selectedDate = new Date(idea.suggested_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return 'Date cannot be in the past';
    }

    // Check for conflicts with other content ideas
    const conflictingIdea = contentIdeas.find(ci => 
      ci.id !== idea.id && 
      ci.suggested_date === idea.suggested_date &&
      ci.suggested_time === idea.suggested_time
    );

    if (conflictingIdea) {
      return `Time conflict with "${conflictingIdea.title}"`;
    }

    return null;
  };

  const saveChanges = async () => {
    if (!editedIdea) return;

    // Validate the changes
    const validationError = validateDateAndTime(editedIdea);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(api.getUrl(`content-ideas/${editedIdea.id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editedIdea.title,
          description: editedIdea.description,
          suggested_date: editedIdea.suggested_date,
          suggested_time: editedIdea.suggested_time || null,
          priority: editedIdea.priority,
          status: editedIdea.status,
          topic_keywords: editedIdea.topic_keywords
        })
      });

      if (response.ok) {
        // Update the content ideas list
        setContentIdeas(prev => 
          prev.map(idea => 
            idea.id === editedIdea.id ? editedIdea : idea
          )
        );
        
        // Update selected idea
        setSelectedIdea(editedIdea);
        
        // Exit edit mode
        setIsEditMode(false);
        setEditedIdea(null);
        
        // Refresh calendar data
        await refreshCalendarData();
        
        // Close modal
        setIsModalOpen(false);
      } else {
        const errorData = await response.json();
        
        // Handle specific timezone error codes with enhanced messaging
        if (errorData.code === 'TIMEZONE_CONFIG_MISSING') {
          setSaveError(
            '⚠️ Timezone configuration is missing. ' + 
            'Your date/time changes cannot be saved properly. ' +
            'Please contact your administrator to set up timezone support.'
          );
        } else if (errorData.code === 'TIMEZONE_CONVERSION_FAILED') {
          setSaveError(
            '⚠️ Timezone conversion failed. ' +
            'Your date/time could not be processed correctly. ' +
            'Please contact your administrator for assistance.'
          );
        } else {
          setSaveError(errorData.error || 'Failed to save changes');
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle content idea click
  const handleContentIdeaClick = (item: ContentPiece) => {
    console.log('Clicked content item:', item);
    
    // Find the corresponding content idea
    const idea = contentIdeas.find(ci => ci.id === item.id.replace('idea-', ''));
    if (idea) {
      setSelectedIdea(idea);
      setIsModalOpen(true);
    } else {
      console.warn('Could not find content idea for item:', item);
    }
  };

  // Handle add post click for empty slots
  const handleAddPostClick = (date: Date) => {
    console.log('Add post clicked for date:', date);
    // Navigate to content generator with prefilled date
    const dateString = date.toISOString().split('T')[0];
    window.location.href = `/content-generator?date=${dateString}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  // Get current project from localStorage
  useEffect(() => {
    const savedProject = localStorage.getItem('selectedProject');
    console.log('CalendarView: savedProject from localStorage:', savedProject);
    if (savedProject) {
      setCurrentProject(savedProject);
      loadProjectName(savedProject);
    } else {
      console.log('CalendarView: No savedProject found in localStorage');
    }
  }, []);

  // Listen for localStorage changes (when project is selected in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedProject = localStorage.getItem('selectedProject');
      console.log('CalendarView: localStorage changed, new project:', savedProject);
      if (savedProject && savedProject !== currentProject) {
        setCurrentProject(savedProject);
        loadProjectName(savedProject);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentProject]);

  // Auto-navigate to week with scheduled content when switching to 7-day view
  useEffect(() => {
    if (activeView === '7-day' && (contentIdeas.length > 0 || scheduledPosts.length > 0)) {
      // Find the earliest scheduled date
      let earliestDate: Date | null = null;
      
      // Check content ideas with suggested_date
      contentIdeas.forEach(idea => {
        if (idea.suggested_date) {
          const ideaDate = new Date(idea.suggested_date);
          if (!earliestDate || ideaDate < earliestDate) {
            earliestDate = ideaDate;
          }
        }
      });
      
      // Check scheduled posts
      scheduledPosts.forEach(post => {
        if (post.scheduled_date) {
          const postDate = new Date(post.scheduled_date);
          if (!earliestDate || postDate < earliestDate) {
            earliestDate = postDate;
          }
        }
      });
      
      // If we found a scheduled date, navigate to that week
      if (earliestDate) {
        const startOfWeek = new Date(earliestDate);
        const earliestDateObj = earliestDate as Date;
        startOfWeek.setDate(earliestDateObj.getDate() - earliestDateObj.getDay());
        setCurrentWeekStart(startOfWeek);
        console.log('CalendarView: Auto-navigated to week with scheduled content:', startOfWeek.toDateString());
      }
    }
  }, [activeView, contentIdeas, scheduledPosts]);

  // Auto-navigate to month with content when switching to monthly view
  useEffect(() => {
    if (activeView === 'monthly' && (contentIdeas.length > 0 || scheduledPosts.length > 0)) {
      // Count content by month to find the month with the most content
      const monthCounts: { [key: string]: number } = {};
      
      // Count content ideas by month
      contentIdeas.forEach(idea => {
        if (idea.suggested_date) {
          const ideaDate = new Date(idea.suggested_date);
          const monthKey = `${ideaDate.getFullYear()}-${ideaDate.getMonth()}`;
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        }
      });
      
      // Count scheduled posts by month
      scheduledPosts.forEach(post => {
        if (post.scheduled_date) {
          const postDate = new Date(post.scheduled_date);
          const monthKey = `${postDate.getFullYear()}-${postDate.getMonth()}`;
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        }
      });
      
      // Find the month with the most content
      let maxCount = 0;
      let targetMonthKey = '';
      Object.entries(monthCounts).forEach(([monthKey, count]) => {
        if (count > maxCount) {
          maxCount = count;
          targetMonthKey = monthKey;
        }
      });
      
      if (targetMonthKey) {
        const [year, month] = targetMonthKey.split('-').map(Number);
        const targetDate = new Date(year, month, 1);
        setSelectedDate(targetDate);
        console.log(`CalendarView: Auto-navigating to month with most content (${maxCount} items):`, targetDate.toDateString());
      }
    }
  }, [activeView, contentIdeas, scheduledPosts]);

  // Poll for localStorage changes (for same-tab changes)
  useEffect(() => {
    const interval = setInterval(() => {
      const savedProject = localStorage.getItem('selectedProject');
      if (savedProject && savedProject !== currentProject) {
        console.log('CalendarView: Project changed via polling, new project:', savedProject);
        setCurrentProject(savedProject);
        loadProjectName(savedProject);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [currentProject]);

  // Load project name
  const loadProjectName = async (projectId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(api.getUrl(`projects/${projectId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentProjectName(data.data?.name || 'Unknown Project');
      } else {
        console.error('Failed to load project name:', response.status, response.statusText);
        setCurrentProjectName('Unknown Project');
      }
    } catch (error) {
      console.error('Failed to load project name:', error);
      setCurrentProjectName('Unknown Project');
    }
  };

  // Load content ideas from the database
  const loadContentIdeas = async (projectId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(api.getUrl(`content-ideas/project/${projectId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setContentIdeas(data.data || []);
      } else {
        console.error('Failed to load content ideas:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load content ideas:', error);
    }
  };

  const loadScheduledPosts = async (projectId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(api.getUrl(`posts/scheduled/${projectId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Loaded scheduled posts:', data.count);
        setScheduledPosts(data.data || []);
      } else {
        console.error('Failed to load scheduled posts:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load scheduled posts:', error);
    }
  };


  // Load content data
  const loadContentData = async () => {
    setLoading(true);
    try {
      // Only load content history if we have a current project
      if (currentProject) {
        const token = localStorage.getItem('auth_token');
        
        // Load both content pieces and approved content ideas
        const [contentHistoryRes, contentIdeasRes] = await Promise.all([
          fetch(api.getUrl('content/history')),
          fetch(api.getUrl(`content-ideas/project/${currentProject}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);
        
        let allContent: any[] = [];
        
        // Add content pieces
        if (contentHistoryRes.ok) {
          const contentData = await contentHistoryRes.json();
          const realData = contentData.data || [];
          const projectContent = realData.filter((item: any) => item.project_id === currentProject);
          allContent = [...allContent, ...projectContent];
        }
        
        // Add approved content ideas
        if (contentIdeasRes.ok) {
          const ideasData = await contentIdeasRes.json();
          const approvedIdeas = (ideasData.data || []).filter((idea: any) => idea.status === 'approved');
          
          // Convert approved ideas to content format for calendar display
          const convertedIdeas = approvedIdeas.map((idea: any) => {
            // For approved ideas, use the approval date to show them on the calendar
            // This ensures they appear in the current month regardless of suggested_date
            const approvalDate = idea.approved_at || idea.created_at;
            
            return {
              id: `idea-${idea.id}`,
              title: idea.title,
              content: idea.description || idea.title,
              content_type: idea.post_type_name || 'social_post',
              industry: 'restaurant', // Default for now
              type: 'approved_idea',
              topic: idea.topic_keywords?.join(', ') || '',
              tone: 'professional',
              length: 'medium',
              created_at: approvalDate,
              project_id: currentProject,
              is_approved_idea: true
            };
          });
          
          allContent = [...allContent, ...convertedIdeas];
        }
        
        console.log('CalendarView: Loaded content:', allContent);
        console.log('CalendarView: Content count:', allContent.length);
        setContentData(allContent);
      } else {
        // No project selected, show empty data
        setContentData([]);
      }
    } catch (error) {
      console.error('Failed to load content data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load content data when project changes
  useEffect(() => {
    if (currentProject) {
      loadContentIdeas(currentProject);
      loadScheduledPosts(currentProject);
      loadContentData(); // Keep this for historical content
    }
  }, [currentProject]);

  // Filter content based on selected view and filters
  const getFilteredContent = () => {
    // Combine all content sources: contentData, contentIdeas, and scheduledPosts
    let allContent = [...contentData];
    
    // Add content ideas (convert to content format) - only include those with suggested_date
    const ideasWithDates = contentIdeas.filter(idea => idea.suggested_date && idea.suggested_date.trim() !== '');
    console.log('CalendarView: Found content ideas with dates:', ideasWithDates.length);
    ideasWithDates.forEach(idea => {
      console.log(`CalendarView: Idea "${idea.title}" has date: ${idea.suggested_date}`);
    });
    
    const convertedIdeas = ideasWithDates.map(idea => ({
      id: `idea-${idea.id}`,
      title: idea.title,
      content: idea.description || idea.title,
      content_type: idea.post_type_name || 'social_post',
      industry: 'restaurant', // Default for now
      type: 'content_idea',
      topic: idea.topic_keywords?.join(', ') || '',
      tone: 'professional',
      length: 'medium',
      created_at: idea.suggested_date || new Date().toISOString(),
      project_id: currentProject,
      is_content_idea: true
    }));
    allContent = [...allContent, ...convertedIdeas];
    
    // Add scheduled posts (convert to content format)
    const convertedScheduledPosts = scheduledPosts.map(post => ({
      id: `scheduled-${post.id}`,
      title: post.title,
      content: post.content || post.title,
      content_type: post.post_type_name || 'scheduled_post',
      industry: 'restaurant', // Default for now
      type: 'scheduled_post',
      topic: '',
      tone: 'professional',
      length: 'medium',
      created_at: post.scheduled_date || new Date().toISOString(),
      project_id: currentProject,
      is_scheduled_post: true,
      scheduled_time: post.scheduled_time,
      platform: post.platform
    }));
    allContent = [...allContent, ...convertedScheduledPosts];

    let filtered = allContent;

    // Filter by industry
    if (filterIndustry !== 'all') {
      filtered = filtered.filter(item => item.industry === filterIndustry);
    }

    // Filter by content type
    if (filterContentType !== 'all') {
      filtered = filtered.filter(item => item.content_type === filterContentType);
    }

    // Filter by date range based on active view
    const dateRange = getDateRangeForView(activeView, currentWeekStart);

    return filtered.filter(item => {
      // For content ideas and scheduled posts, we want to show them regardless of date
      // since they represent future scheduled content
      if (item.is_content_idea || item.is_scheduled_post) {
        return true; // Show all scheduled content
      }
      
      // For regular content, filter by date range using unified date utilities
      return isDateInRange(item.created_at, dateRange);
    });
  };

  const filteredContent = useMemo(() => getFilteredContent(), [
    contentData, 
    contentIdeas, 
    scheduledPosts, 
    activeView, 
    filterIndustry, 
    filterContentType, 
    currentProject,
    currentWeekStart,
    selectedDate
  ]);

  // Group content by date for display
  const groupContentByDate = () => {
    const grouped: { [key: string]: ContentPiece[] } = {};
    
    console.log('CalendarView: Grouping content by date. Total items:', filteredContent.length);
    
    filteredContent.forEach(item => {
      // Use unified date key generation for consistent grouping
      const dateKey = getCalendarDateKey(item.created_at);
      const date = new Date(dateKey).toDateString();
      
      console.log(`CalendarView: ${item.title} (${item.is_content_idea ? 'content_idea' : item.is_scheduled_post ? 'scheduled_post' : 'content'}) - ${item.created_at} → ${dateKey} → ${date}`);
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    console.log('CalendarView: Grouped content by date:', Object.keys(grouped).map(date => `${date}: ${grouped[date].length} items`));
    return grouped;
  };

  const groupedContent = groupContentByDate();

  // Calculate analytics
  const getAnalytics = () => {
    const total = filteredContent.length;
    const byIndustry = filteredContent.reduce((acc, item) => {
      acc[item.industry] = (acc[item.industry] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const byType = filteredContent.reduce((acc, item) => {
      acc[item.content_type] = (acc[item.content_type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return { total, byIndustry, byType };
  };

  const analytics = getAnalytics();

  const renderViewSelector = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex space-x-2">
      {(['1-day', '7-day', 'monthly', 'quarterly'] as const).map((view) => (
        <button
          key={view}
          onClick={() => {
            console.log('Changing view to:', view);
            setActiveView(view);
              
              // Reset week to current week when switching to 7-day view
              if (view === '7-day') {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                setCurrentWeekStart(startOfWeek);
              }
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
            activeView === view
              ? 'bg-gradient-primary text-white shadow-glow'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
          }`}
        >
          {view === '1-day' && '📅 Today'}
          {view === '7-day' && '📊 7 Days'}
          {view === 'monthly' && '📈 Monthly'}
          {view === 'quarterly' && '🎯 Quarterly'}
        </button>
      ))}
      </div>
      
      {/* Refresh Button */}
      <button
        onClick={refreshCalendarData}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        title="Refresh calendar data"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Refresh</span>
      </button>
    </div>
  );

  const renderFilters = () => (
    <div className="flex space-x-4 mb-6">
      <select
        value={filterIndustry}
        onChange={(e) => setFilterIndustry(e.target.value)}
        className="modern-input"
      >
        <option value="all">All Industries</option>
        <option value="restaurant">Restaurant</option>
        <option value="property">Property</option>
        <option value="agency">Agency</option>
      </select>
      
      <select
        value={filterContentType}
        onChange={(e) => setFilterContentType(e.target.value)}
        className="modern-input"
      >
        <option value="all">All Content Types</option>
        <option value="blog">Blog</option>
        <option value="social">Social Media</option>
        <option value="email">Email</option>
        <option value="ads">Ads</option>
      </select>
    </div>
  );

  const renderAnalytics = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="modern-card hover-lift p-6">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-primary rounded-lg">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Content</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.total}</p>
          </div>
        </div>
      </div>

      <div className="modern-card hover-lift p-6">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-secondary rounded-lg">
            <EyeIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Industries</p>
            <p className="text-2xl font-bold text-gray-900">{Object.keys(analytics.byIndustry).length}</p>
          </div>
        </div>
      </div>

      <div className="modern-card hover-lift p-6">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-accent rounded-lg">
            <ClockIcon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Content Types</p>
            <p className="text-2xl font-bold text-gray-900">{Object.keys(analytics.byType).length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Generate calendar data for monthly view
  const generateMonthlyCalendar = () => {
    const now = new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const calendar = [];
    const currentDate = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toDateString();
        const dayContent = groupedContent[dateStr] || [];
        
        weekDays.push({
          date: new Date(currentDate),
          content: dayContent,
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.toDateString() === now.toDateString()
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    
    return calendar;
  };

  // Generate calendar data for 7-day view
  const generateWeeklyCalendar = () => {
    const now = new Date();
    const startOfWeek = currentWeekStart;
    
    const weekDays = [];
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + day);
      const dateStr = currentDate.toDateString();
      const dayContent = groupedContent[dateStr] || [];
      
      weekDays.push({
        date: currentDate,
        content: dayContent,
        isToday: currentDate.toDateString() === now.toDateString()
      });
    }
    
    return weekDays;
  };

  // Color legend component
  const renderColorLegend = () => {
    const postTypeColors = [
      { color: '#6366f1', label: 'Event Promotion' },
      { color: '#f3e8ff', label: 'Scheduled Post' },
      { color: '#10b981', label: 'Content Idea' },
      { color: '#f59e0b', label: 'Social Media' },
    ];

    const stageColors = [
      { color: '#BDBDBD', label: 'Draft/Concept' },
      { color: '#FFD54F', label: 'Approved' },
      { color: '#42A5F5', label: 'Ready to Publish' },
      { color: '#8E24AA', label: 'Scheduled' },
      { color: '#43A047', label: 'Published' },
    ];

    return (
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-gray-700">Post Types:</span>
              <div className="flex items-center space-x-3">
                {postTypeColors.map((item, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300 cursor-help" 
                      style={{ backgroundColor: item.color }}
                      title={item.label}
                    ></div>
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-gray-700">Stages:</span>
              <div className="flex items-center space-x-3">
                {stageColors.map((item, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <div 
                      className="w-5 h-1 rounded cursor-help" 
                      style={{ backgroundColor: item.color }}
                      title={item.label}
                    ></div>
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyCalendar = () => {
    const calendar = generateMonthlyCalendar();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    const navigateMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setSelectedDate(newDate);
    };
    
    return (
      <div className="modern-card hover-lift p-6">
        {/* Color Legend */}
        {renderColorLegend()}
        
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous month"
          >
            ←
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next month"
          >
            →
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendar.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const hasContent = day.content.length > 0;
              
              return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                  className={`p-2 border border-gray-200 ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${day.isToday ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
                  style={{ minHeight: hasContent ? '120px' : '100px' }}
              >
                  <div className={`text-sm font-medium mb-2 ${
                  day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${day.isToday ? 'text-indigo-600' : ''}`}>
                  {day.date.getDate()}
                </div>
                
                  {hasContent ? (
                    <div className="space-y-2">
                      {day.content.slice(0, 4).map((item, index) => (
                        <CalendarItem
                      key={item.id}
                          item={item}
                          viewType="monthly"
                          onClick={() => handleContentIdeaClick(item)}
                        />
                      ))}
                      {day.content.length > 4 && (
                        <div className="text-xs text-gray-500 text-center p-2 bg-gray-100 rounded">
                          +{day.content.length - 4} more posts
                    </div>
                  )}
                </div>
                  ) : (
                    <div 
                      className="flex items-center justify-center h-full cursor-pointer text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      onClick={() => handleAddPostClick(day.date)}
                      title="Add post for this date"
                    >
                      <span className="text-xs font-medium">Add Post</span>
              </div>
          )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderWeeklyCalendar = () => {
    const weekDays = generateWeeklyCalendar();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dateRange = getDateRangeForView('7-day', currentWeekStart);
    
    return (
      <div className="modern-card hover-lift p-6">
        {/* Color Legend */}
        {renderColorLegend()}
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Previous week"
            >
              ◀
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">7-Day View</h2>
              <p className="text-sm text-gray-600 mt-1">
                📅 {formatDateRange(dateRange.start, dateRange.end)}
              </p>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Next week"
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => {
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              setCurrentWeekStart(startOfWeek);
            }}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            This Week
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-4 border border-gray-200 rounded-lg ${
                day.isToday ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-white'
              }`}
            >
              <div className={`text-center mb-3 ${
                day.isToday ? 'text-indigo-600' : 'text-gray-900'
              }`}>
                <div className="text-sm font-medium">{dayNames[index]}</div>
                <div className="text-lg font-bold">{day.date.getDate()}</div>
              </div>
              
              <div className="space-y-2">
                {day.content.map((item) => (
                  <CalendarItem
                    key={item.id}
                    item={item}
                    viewType="7-day"
                    onClick={() => handleContentIdeaClick(item)}
                  />
                ))}
                {day.content.length === 0 && (
                  <button
                    onClick={() => handleAddPostClick(day.date)}
                    className="w-full text-xs text-gray-400 text-center py-2 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Click to add content for this day"
                  >
                    <PlusIcon className="h-3 w-3" />
                    Add Post
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };




  const renderContentList = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content...</p>
        </div>
      );
    }

    if (filteredContent.length === 0) {
      return (
        <div className="text-center py-12">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
          <p className="text-gray-600">
            No content matches your current filters for the {activeView} view.
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-left">
            <p><strong>Debug Info:</strong></p>
            <p>Current Project: {currentProject || 'None'}</p>
            <p>Content Ideas: {contentIdeas.length}</p>
            <p>Content Ideas with Dates: {contentIdeas.filter(idea => idea.suggested_date && idea.suggested_date.trim() !== '').length}</p>
            <p>Scheduled Posts: {scheduledPosts.length}</p>
            <p>Content Data: {contentData.length}</p>
            <p>Filtered Content: {filteredContent.length}</p>
          </div>
        </div>
      );
    }

    // Render different views based on activeView
    if (activeView === 'monthly') {
      return renderMonthlyCalendar();
    }

    if (activeView === '7-day') {
      return renderWeeklyCalendar();
    }

    // For 1-day and quarterly, show the list view
    return (
      <div className="space-y-6">
        {Object.entries(groupedContent).map(([date, items]) => (
          <div key={date} className="modern-card hover-lift p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{date}</h3>
              <span className="px-3 py-1 bg-gradient-primary text-white text-sm rounded-full">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                          {item.content_type}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {item.industry}
                        </span>
                        {item.type && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {item.type}
                          </span>
                        )}
                      </div>
                      
                      {item.title && (
                        <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                      )}
                      
                      <p className="text-gray-700 text-sm line-clamp-3">
                        {item.content.length > 200 
                          ? `${item.content.substring(0, 200)}...` 
                          : item.content
                        }
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                        {item.tone && <span>Tone: {item.tone}</span>}
                        {item.length && <span>Length: {item.length}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold gradient-text text-shadow mb-4">Calendar View</h1>
        <p className="text-xl text-gray-600">
          Review and analyze your content output across different time periods
        </p>
        {currentProjectName && (
          <div className="mt-2 flex items-center justify-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              📁 {currentProjectName}
            </span>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all text-sm"
            >
              📄 Generate Report
            </button>
          </div>
        )}
        <div className="mt-4 p-4 bg-white bg-opacity-20 rounded-lg">
          <p className="text-sm text-gray-700">
            Current View: <strong>{activeView}</strong> | 
            Content Ideas: <strong>{contentIdeas.length}</strong> | 
            Total Content: <strong>{filteredContent.length}</strong> | 
            All Content: <strong>{contentData.length}</strong>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {activeView === '1-day' && 'Showing content from today only'}
            {activeView === '7-day' && `Showing content for ${formatDateRange(getDateRangeForView('7-day', currentWeekStart).start, getDateRangeForView('7-day', currentWeekStart).end)}`}
            {activeView === 'monthly' && 'Showing content from the last month'}
            {activeView === 'quarterly' && 'Showing content from the last quarter'}
          </p>
          {activeView === '7-day' && filteredContent.length === 0 && (contentIdeas.length > 0 || scheduledPosts.length > 0) && (
            <p className="text-xs text-blue-600 mt-1">
              💡 Use the ◀ ▶ arrows to navigate to weeks with scheduled content
            </p>
          )}
        </div>
      </div>

      {renderViewSelector()}
      {renderFilters()}
      {renderAnalytics()}
      {(() => {
          console.log('CalendarView: Rendering renderContentList. activeView:', activeView, 'currentProject:', currentProject);
          return renderContentList();
      })()}

      {/* Report Options Modal */}
      {showReportModal && currentProject && (
        <ReportOptionsModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          projectId={currentProject}
          projectName={currentProjectName}
          clientName="Unknown Client" // You might want to fetch this from the project data
          token={token || ''}
        />
      )}

      {/* Content Idea Details Modal - Two Column Layout */}
      {isModalOpen && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedIdea.post_type_color || '#6366f1' }}
                ></div>
                <h2 className="text-xl font-bold text-gray-900">{selectedIdea.title}</h2>
              </div>
              <div className="flex items-center space-x-2">
                {!isEditMode && (
                  <button
                    onClick={enterEditMode}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit concept"
                  >
                    <PencilIcon className="h-5 w-5 text-gray-500" />
                  </button>
                )}
            <button 
              onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setEditedIdea(null);
                    setSaveError(null);
                    // Refresh calendar data when modal closes
                    refreshCalendarData();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
            </div>

            {/* Two Column Layout */}
            <div className="flex h-[calc(90vh-140px)]">
              {/* Left Column - Metadata */}
              <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editedIdea?.title || ''}
                        onChange={(e) => setEditedIdea(prev => prev ? { ...prev, title: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter title"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{selectedIdea.title}</p>
                    )}
                  </div>

                  {/* Status and Priority */}
                  <div className="flex flex-wrap gap-3">
                    {isEditMode ? (
                      <>
                        <select
                          value={editedIdea?.status || ''}
                          onChange={(e) => setEditedIdea(prev => prev ? { ...prev, status: e.target.value } : null)}
                          className="px-3 py-1 rounded-full text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="approved">Approved</option>
                          <option value="concept_approved">Concept Approved</option>
                          <option value="ready_to_publish">Ready to Publish</option>
                        </select>
                        <select
                          value={editedIdea?.priority || ''}
                          onChange={(e) => setEditedIdea(prev => prev ? { ...prev, priority: e.target.value } : null)}
                          className="px-3 py-1 rounded-full text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedIdea.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedIdea.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedIdea.status.charAt(0).toUpperCase() + selectedIdea.status.slice(1)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedIdea.priority === 'high' ? 'bg-red-100 text-red-800' :
                          selectedIdea.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedIdea.priority.charAt(0).toUpperCase() + selectedIdea.priority.slice(1)} Priority
                        </span>
                      </>
                    )}
                    {selectedIdea.post_type_name && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium text-blue-600 bg-blue-100">
                        {selectedIdea.post_type_name}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    {isEditMode ? (
                      <textarea
                        value={editedIdea?.description || ''}
                        onChange={(e) => setEditedIdea(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                        placeholder="Enter description"
                      />
                    ) : (
                      <p className="text-gray-900 leading-relaxed">
                        {selectedIdea.description || 'No description provided'}
                      </p>
                    )}
                  </div>

                  {/* Dates and Times */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Suggested Date</label>
                      {isEditMode ? (
                        <input
                          type="date"
                          value={editedIdea?.suggested_date ? editedIdea.suggested_date.split('T')[0] : ''}
                          onChange={(e) => setEditedIdea(prev => prev ? { ...prev, suggested_date: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {selectedIdea.suggested_date ? new Date(selectedIdea.suggested_date).toLocaleDateString() : 'Not scheduled'}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Suggested Time</label>
                      {isEditMode ? (
                        <input
                          type="time"
                          value={editedIdea?.suggested_time || ''}
                          onChange={(e) => setEditedIdea(prev => prev ? { ...prev, suggested_time: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">
                          {selectedIdea.suggested_time || 'No time specified'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  {isEditMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                      <input
                        type="text"
                        value={editedIdea?.topic_keywords?.join(', ') || ''}
                        onChange={(e) => setEditedIdea(prev => prev ? { 
                          ...prev, 
                          topic_keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                        } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter keywords separated by commas"
                      />
                    </div>
                  )}

                  {/* Additional Metadata */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content ID</label>
                      <p className="text-sm text-gray-600 font-mono">
                        {selectedIdea.id}
                      </p>
                    </div>
                    
                    {!isEditMode && selectedIdea.topic_keywords && selectedIdea.topic_keywords.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                        <div className="flex flex-wrap gap-1">
                          {selectedIdea.topic_keywords.map((keyword, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Edit Mode Actions */}
                  {isEditMode && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {saveError && (
                        <div className={`mb-4 p-4 rounded-lg border ${
                          saveError.includes('Timezone') 
                            ? 'bg-orange-50 border-orange-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              {saveError.includes('Timezone') ? (
                                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="ml-3">
                              <p className={`text-sm font-medium ${
                                saveError.includes('Timezone') ? 'text-orange-800' : 'text-red-800'
                              }`}>
                                {saveError.includes('Timezone') ? 'Configuration Issue' : 'Save Error'}
                              </p>
                              <p className={`text-sm mt-1 ${
                                saveError.includes('Timezone') ? 'text-orange-700' : 'text-red-700'
                              }`}>
                                {saveError}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={saveChanges}
                          disabled={isSaving || (saveError ? saveError.includes('Timezone') : false)}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (saveError && saveError.includes('Timezone')) ? (
                            <>
                              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Cannot Save
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XMarkIcon className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Social Post Preview */}
              <div className="w-1/2 p-6 bg-gray-50">
                <div className="h-full flex flex-col">
                  {/* Social Platform Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview Platform
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="twitter">Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </div>

                  {/* Social Post Preview */}
                  <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4">
                      {/* Post Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">PH</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Productionhouse Asia</div>
                          <div className="text-sm text-gray-500">2h</div>
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="mb-4">
                        <p className="text-gray-900 leading-relaxed">
                          {selectedIdea.description || selectedIdea.title}
                        </p>
                      </div>

                      {/* Post Image Placeholder */}
                      <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🖼️</div>
                          <p className="text-gray-500 text-sm">No image generated yet</p>
                          <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                            Generate Image
                          </button>
                        </div>
                      </div>

                      {/* Post Engagement */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span>❤️ 0</span>
                            <span>💬 0</span>
                            <span>📤 0</span>
                          </div>
                          <span>👁️ 0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;

