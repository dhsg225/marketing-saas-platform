import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useUser } from '../contexts/UserContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, CalendarIcon, UserIcon, CheckCircleIcon, ClockIcon, TagIcon, PlusIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline';
import { timezoneManager } from '../utils/timezone';
import CalendarItem from './CalendarItem';

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
  approved_at?: string;
  created_at?: string;
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

interface ContentIdeasCalendarProps {
  projectId: string;
  scheduledPosts?: ScheduledPost[];
}

const ContentIdeasCalendar: React.FC<ContentIdeasCalendarProps> = ({ projectId, scheduledPosts = [] }) => {
  const { formatDate } = useSettings();
  const { projects } = useUser();
  const navigate = useNavigate();
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedIdea, setEditedIdea] = useState<ContentIdea | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load content ideas from the database
  const loadContentIdeas = async (projectId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(api.getUrl(`content-ideas/project/${projectId}?limit=100`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('ContentIdeasCalendar: Raw API response:', data);
        console.log('ContentIdeasCalendar: Raw data array:', data.data);
        console.log('ContentIdeasCalendar: Data array length:', data.data?.length);
        
        // Filter for content ideas with suggested_date (regardless of status)
        const ideasWithDates = (data.data || []).filter((idea: ContentIdea) => {
          console.log('ContentIdeasCalendar: Checking idea:', idea.title, 'status:', idea.status, 'suggested_date:', idea.suggested_date);
          return idea.suggested_date && idea.suggested_date.trim() !== '';
        });
        console.log('ContentIdeasCalendar: Loaded ideas with dates:', ideasWithDates);
        console.log('ContentIdeasCalendar: Ideas with dates count:', ideasWithDates.length);
        console.log('ContentIdeasCalendar: First idea with date:', ideasWithDates[0]);
        setContentIdeas(ideasWithDates);
      } else {
        console.error('Failed to load content ideas:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load content ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadContentIdeas(projectId);
    }
  }, [projectId]);

  // Handle content idea click
  const handleContentIdeaClick = (idea: ContentIdea) => {
    console.log('Clicked content idea:', idea);
    setSelectedIdea(idea);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedIdea(null);
    setIsEditMode(false);
    setEditedIdea(null);
    setSaveError(null);
  };

  // Enter edit mode
  const enterEditMode = () => {
    if (selectedIdea) {
      setEditedIdea({ ...selectedIdea });
      setIsEditMode(true);
      setSaveError(null);
    }
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedIdea(null);
    setSaveError(null);
  };

  // Validate date and time
  const validateDateAndTime = (idea: ContentIdea): string | null => {
    if (!idea.suggested_date) {
      return 'Please select a date';
    }

    // Use timezone manager to check if date is in the past
    if (timezoneManager.isDateInPast(idea.suggested_date)) {
      return 'Date cannot be in the past';
    }

    // Check for conflicts with other content ideas on the same date
    const conflictingIdeas = contentIdeas.filter(otherIdea => 
      otherIdea.id !== idea.id && 
      otherIdea.suggested_date === idea.suggested_date &&
      otherIdea.suggested_time === idea.suggested_time
    );

    if (conflictingIdeas.length > 0) {
      return 'Another content idea is already scheduled for this date and time';
    }

    return null;
  };

  // Save changes
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
          suggested_date: editedIdea.suggested_date,
          suggested_time: editedIdea.suggested_time
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
      } else {
        const errorData = await response.json();
        setSaveError(errorData.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle "No content" click - navigate to content generator with pre-filled data
  const handleNoContentClick = (date: Date) => {
    // Get current project details
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      alert('Project not found');
      return;
    }

    // Format date for URL parameters
    const formattedDate = date.toISOString().split('T')[0];
    
    // Navigate to content generator with pre-filled data
    navigate('/content-generator', {
      state: {
        prefillData: {
          projectId: projectId,
          projectName: project.name,
          clientName: project.client_name || 'Unknown Client',
          suggestedDate: formattedDate,
          industry: project.industry || 'restaurant', // Default to restaurant if not specified
          topic: `Content for ${project.name} on ${date.toLocaleDateString()}`,
          tone: 'professional',
          length: 'medium'
        }
      }
    });
  };

  // Format date for display
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Generate calendar for current month
  const generateCalendar = () => {
    const now = currentDate;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get the first day of the month and how many days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Generate calendar days
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      // Use local date formatting to avoid timezone conversion issues
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Find content ideas for this date
      const dayContentIdeas = contentIdeas.filter(idea => {
        if (!idea.suggested_date) return false;
        
        // Use proper timezone conversion to get local date
        const ideaLocalDate = timezoneManager.convertUTCToLocal(idea.suggested_date);
        
        console.log(`ContentIdeasCalendar: Checking date: ${dateString} against idea date: ${idea.suggested_date} (converted to local: ${ideaLocalDate}) for idea: ${idea.title}`);
        return ideaLocalDate === dateString;
      });

      // Find scheduled posts for this date
      const dayScheduledPosts = scheduledPosts.filter(post => {
        if (!post.scheduled_date) return false;
        
        // Use proper timezone conversion to get local date
        const postLocalDate = timezoneManager.convertUTCToLocal(post.scheduled_date);
        
        return postLocalDate === dateString;
      });
      
      calendarDays.push({
        date,
        day,
        contentIdeas: dayContentIdeas,
        scheduledPosts: dayScheduledPosts,
        isToday: day === new Date().getDate() && currentMonth === new Date().getMonth()
      });
    }
    
    return calendarDays;
  };

  const calendarDays = generateCalendar();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading content ideas...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          →
        </button>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`min-h-[120px] p-2 border border-gray-200 ${
              day?.isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
            }`}
          >
            {day ? (
              <>
                <div className={`text-sm font-medium mb-2 ${
                  day.isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day.day}
                </div>
                
                <div className="space-y-1">
                  {day.contentIdeas.map((idea) => (
                    <CalendarItem
                      key={idea.id}
                      item={{
                        id: idea.id,
                        title: idea.title,
                        content: idea.description,
                        post_type_name: idea.post_type_name,
                        post_type_color: idea.post_type_color,
                        status: idea.status,
                        priority: idea.priority,
                        is_content_idea: true
                      }}
                      viewType="30-day"
                      onClick={() => handleContentIdeaClick(idea)}
                    />
                  ))}

                  {/* Scheduled Posts */}
                  {day.scheduledPosts?.map((post) => (
                    <CalendarItem
                      key={post.id}
                      item={{
                        id: post.id,
                        title: post.title,
                        content: post.content,
                        post_type_name: post.post_type_name,
                        post_type_color: post.post_type_color,
                        scheduled_time: post.scheduled_time,
                        platform: post.platform,
                        auto_publish: post.auto_publish,
                        timezone: post.timezone,
                        status: post.status,
                        is_scheduled_post: true
                      }}
                      viewType="30-day"
                      onClick={() => {
                        // Handle scheduled post click
                        console.log('Clicked scheduled post:', post);
                      }}
                    />
                  ))}

                  {day.contentIdeas.length === 0 && day.scheduledPosts?.length === 0 && (
                    <button
                      onClick={() => handleNoContentClick(day.date)}
                      className="w-full text-xs text-gray-400 text-center py-4 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="Click to add content for this day"
                    >
                      <PlusIcon className="h-3 w-3" />
                      No content
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div></div>
            )}
          </div>
        ))}
      </div>

      {/* Content Idea Details Modal */}
      {isModalOpen && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
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
                  onClick={closeModal}
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
                  {/* Status and Priority */}
                  <div className="flex flex-wrap gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedIdea.status)}`}>
                      {selectedIdea.status.charAt(0).toUpperCase() + selectedIdea.status.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedIdea.priority)}`}>
                      {selectedIdea.priority.charAt(0).toUpperCase() + selectedIdea.priority.slice(1)} Priority
                    </span>
                    {selectedIdea.post_type_name && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium text-blue-600 bg-blue-100">
                        {selectedIdea.post_type_name}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {selectedIdea.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {selectedIdea.description}
                      </p>
                    </div>
                  )}

                  {/* Topic Keywords */}
                  {selectedIdea.topic_keywords && selectedIdea.topic_keywords.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <TagIcon className="h-4 w-4 mr-1" />
                        Topic Keywords
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedIdea.topic_keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates and Times */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Suggested Date
                      </h3>
                      {isEditMode && editedIdea ? (
                        <input
                          type="date"
                          value={editedIdea.suggested_date ? editedIdea.suggested_date.split('T')[0] : ''}
                          onChange={(e) => setEditedIdea(prev => prev ? { ...prev, suggested_date: e.target.value } : null)}
                          min={timezoneManager.getCurrentDateString()}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            editedIdea.suggested_date && validateDateAndTime(editedIdea) 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        />
                      ) : (
                        <p className="text-gray-900">
                          {formatDisplayDate(selectedIdea.suggested_date)}
                        </p>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Suggested Time
                      </h3>
                      {isEditMode && editedIdea ? (
                        <input
                          type="time"
                          value={editedIdea.suggested_time || ''}
                          onChange={(e) => setEditedIdea(prev => prev ? { ...prev, suggested_time: e.target.value } : null)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            editedIdea.suggested_time && validateDateAndTime(editedIdea) 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        />
                      ) : (
                        <p className="text-gray-900">
                          {selectedIdea.suggested_time || 'Not set'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Created and Approved Info */}
                  <div className="space-y-4">
                    {selectedIdea.created_by_name && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <UserIcon className="h-4 w-4 mr-1" />
                          Created By
                        </h3>
                        <p className="text-gray-900">{selectedIdea.created_by_name}</p>
                      </div>
                    )}
                    {selectedIdea.approved_by_name && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Approved By
                        </h3>
                        <p className="text-gray-900">{selectedIdea.approved_by_name}</p>
                      </div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-4">
                    {selectedIdea.created_at && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
                        <p className="text-sm text-gray-600">
                          {formatDisplayDate(selectedIdea.created_at)}
                        </p>
                      </div>
                    )}
                    {selectedIdea.approved_at && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Approved</h3>
                        <p className="text-sm text-gray-600">
                          {formatDisplayDate(selectedIdea.approved_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Edit Mode Actions */}
                  {isEditMode && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {saveError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{saveError}</p>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={saveChanges}
                          disabled={isSaving}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
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
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
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
                      📱 Social Platform
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

                  {/* Action Buttons */}
                  <div className="mt-4 flex space-x-3">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      🎯 Create Complete Post
                    </button>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentIdeasCalendar;
