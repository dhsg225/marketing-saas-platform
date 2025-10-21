import React from 'react';

interface CalendarItemProps {
  item: {
    id: string;
    title?: string;
    content?: string;
    content_type?: string;
    post_type_name?: string;
    post_type_color?: string;
    industry?: string;
    is_content_idea?: boolean;
    is_scheduled_post?: boolean;
    scheduled_time?: string;
    platform?: string;
    auto_publish?: boolean;
    timezone?: string;
    status?: string;
    priority?: string;
  };
  viewType: '7-day' | '30-day' | 'monthly';
  onClick?: () => void;
  showMetadata?: boolean;
}

// Stage color mapping for visual indicators
const stageColorMap = {
  concept: '#BDBDBD',        // grey
  draft: '#BDBDBD',          // grey (same as concept)
  approved: '#FFD54F',       // amber
  concept_approved: '#FFD54F', // amber (same as approved)
  ready_to_publish: '#42A5F5', // blue
  scheduled: '#8E24AA',      // purple
  published: '#43A047'       // green
};

// Stage label mapping
const stageLabelMap = {
  concept: 'Concept',
  draft: 'Draft',
  approved: 'Approved',
  concept_approved: 'Approved',
  ready_to_publish: 'Ready',
  scheduled: 'Scheduled',
  published: 'Published'
};

const CalendarItem: React.FC<CalendarItemProps> = ({ 
  item, 
  viewType, 
  onClick, 
  showMetadata = true 
}) => {
  // Determine the base styling based on item type (postType color as background)
  const getBaseStyling = () => {
    // Use postType color as the primary background color
    const backgroundColor = item.post_type_color || (item.is_scheduled_post ? '#f3e8ff' : '#6366f1');
    
    return {
      backgroundColor,
      textColor: '#ffffff' // White text for better contrast
    };
  };

  // Get workflow stage styling (stage indicator as top strip)
  const getWorkflowStageStyling = () => {
    if (!item.status) return {};
    
    const statusKey = item.status.toLowerCase() as keyof typeof stageColorMap;
    const stageColor = stageColorMap[statusKey];
    
    if (!stageColor) return {};
    
    return {
      borderTopWidth: '4px',
      borderTopColor: stageColor,
      borderTopStyle: 'solid' as const
    };
  };

  const baseStyling = getBaseStyling();
  const workflowStyling = getWorkflowStageStyling();
  
  // Combine styles
  const combinedStyle = {
    backgroundColor: baseStyling.backgroundColor,
    color: baseStyling.textColor,
    border: 'none', // Remove all borders to prevent sliver issues
    borderTop: workflowStyling.borderTopWidth ? `${workflowStyling.borderTopWidth} solid ${workflowStyling.borderTopColor}` : 'none'
  };

  // Get display title
  const getDisplayTitle = () => {
    if (item.title) return item.title;
    if (item.content) {
      const maxLength = viewType === 'monthly' ? 15 : 30;
      return item.content.length > maxLength 
        ? `${item.content.substring(0, maxLength)}...` 
        : item.content;
    }
    return 'Untitled';
  };

  // Get metadata for tooltip
  const getTooltipText = () => {
    const parts = [];
    
    if (item.post_type_name) {
      parts.push(`Type: ${item.post_type_name}`);
    }
    
    if (item.status) {
      parts.push(`Status: ${item.status.replace('_', ' ')}`);
    }
    
    if (item.priority) {
      parts.push(`Priority: ${item.priority}`);
    }
    
    if (item.scheduled_time) {
      parts.push(`Time: ${item.scheduled_time}`);
    }
    
    if (item.platform) {
      parts.push(`Platform: ${item.platform}`);
    }
    
    return parts.join(' • ');
  };

  // Render different layouts based on view type
  if (viewType === 'monthly') {
    return (
      <div
        className="text-xs p-2 cursor-pointer hover:opacity-80 transition-opacity w-full min-h-[60px] flex flex-col justify-between"
        style={{
          ...combinedStyle,
          maxWidth: '100%',
          wordWrap: 'break-word',
          lineHeight: '1.3'
        }}
        title={getTooltipText()}
        onClick={onClick}
      >
        <div className="space-y-1">
          <div className="font-medium truncate">
            {getDisplayTitle()}
          </div>
          
          {item.post_type_name && (
            <div className="text-xs opacity-90 truncate">
              📝 {item.post_type_name}
            </div>
          )}
          
          {item.scheduled_time && (
            <div className="text-xs opacity-75 truncate">
              ⏰ {item.scheduled_time}
            </div>
          )}
        </div>
        
        {item.status && (
          <div className="text-xs opacity-90 truncate mt-1">
            {stageLabelMap[item.status.toLowerCase() as keyof typeof stageLabelMap] || item.status}
          </div>
        )}
      </div>
    );
  }

  // 7-day and 30-day views
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      className={`w-full text-left p-3 text-sm transition-colors hover:opacity-80 min-h-[80px] flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={combinedStyle}
      title={getTooltipText()}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="font-medium text-sm leading-tight">
          {getDisplayTitle()}
        </div>
        
        {showMetadata && (
          <div className="text-xs opacity-90 space-y-1">
            {item.post_type_name && (
              <div className="flex items-center gap-1">
                <span>📝</span>
                <span className="truncate">{item.post_type_name}</span>
              </div>
            )}
            
            {item.status && (
              <div className="flex items-center gap-1">
                <span>📊</span>
                <span className="truncate">
                  {stageLabelMap[item.status.toLowerCase() as keyof typeof stageLabelMap] || item.status}
                </span>
              </div>
            )}
            
            {item.scheduled_time && (
              <div className="flex items-center gap-1">
                <span>⏰</span>
                <span>{item.scheduled_time}</span>
                {item.platform && <span>• 📱 {item.platform}</span>}
                {item.auto_publish && <span title="Auto-publish enabled">🚀</span>}
              </div>
            )}
            
            {!item.scheduled_time && item.industry && (
              <div className="flex items-center gap-1">
                <span>🏢</span>
                <span className="truncate">{item.industry}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Component>
  );
};

export default CalendarItem;
