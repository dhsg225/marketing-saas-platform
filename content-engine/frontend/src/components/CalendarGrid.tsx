// [2025-10-20] - Reusable Calendar Grid Component
// Centralized calendar logic that can be used across different views

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface CalendarDay {
  date: Date;
  content: any[];
  isCurrentMonth?: boolean;
  isToday?: boolean;
}

interface CalendarGridProps {
  days: CalendarDay[][];
  onDayClick?: (date: Date) => void;
  onContentClick?: (content: any) => void;
  renderContent?: (content: any) => React.ReactNode;
  showNoContentButton?: boolean;
  noContentButtonText?: string;
  className?: string;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  onDayClick,
  onContentClick,
  renderContent,
  showNoContentButton = true,
  noContentButtonText = "No content",
  className = ""
}) => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const defaultRenderContent = (content: any) => (
    <button
      key={content.id}
      onClick={() => onContentClick?.(content)}
      className="w-full text-left p-2 text-xs rounded transition-colors hover:opacity-80"
      style={{ 
        backgroundColor: content.post_type_color || content.color || '#6366f1',
        color: 'white'
      }}
      title={`${content.title} - ${content.priority || 'medium'} priority`}
    >
      <div className="font-medium truncate">
        {content.title}
      </div>
      <div className="text-xs opacity-90">
        {content.post_type_name || content.type}
      </div>
    </button>
  );

  return (
    <div className={`${className}`}>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={`min-h-[120px] p-2 border border-gray-200 ${
                day.isCurrentMonth !== false ? 'bg-white' : 'bg-gray-50'
              } ${day.isToday ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              {/* Date number */}
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth !== false ? 'text-gray-900' : 'text-gray-400'
              } ${day.isToday ? 'text-blue-600' : ''}`}>
                {day.date.getDate()}
              </div>
              
              {/* Content items */}
              <div className="space-y-1">
                {day.content.map((item) => 
                  renderContent ? renderContent(item) : defaultRenderContent(item)
                )}
                
                {/* No content button */}
                {day.content.length === 0 && showNoContentButton && (
                  <button
                    onClick={() => onDayClick?.(day.date)}
                    className="w-full text-xs text-gray-400 text-center py-4 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors cursor-pointer flex items-center justify-center gap-1"
                    title="Click to add content for this day"
                  >
                    <PlusIcon className="h-3 w-3" />
                    {noContentButtonText}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarGrid;
