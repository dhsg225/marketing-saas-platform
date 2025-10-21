// [2025-10-20] - Reusable Calendar Data Hook
// Centralized calendar data management and date calculations

import { useState, useEffect, useMemo } from 'react';

interface CalendarDay {
  date: Date;
  content: any[];
  isCurrentMonth?: boolean;
  isToday?: boolean;
}

interface UseCalendarDataProps {
  contentData: any[];
  currentDate?: Date;
  viewType?: 'monthly' | 'weekly' | 'daily';
}

export const useCalendarData = ({ 
  contentData, 
  currentDate = new Date(),
  viewType = 'monthly'
}: UseCalendarDataProps) => {
  const [selectedDate, setSelectedDate] = useState(currentDate);

  // Group content by date
  const groupedContent = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    contentData.forEach(item => {
      const date = new Date(item.created_at || item.suggested_date || item.date).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    return grouped;
  }, [contentData]);

  // Generate calendar days based on view type
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    if (viewType === 'monthly') {
      return generateMonthlyDays(year, month, groupedContent, now);
    } else if (viewType === 'weekly') {
      return generateWeeklyDays(selectedDate, groupedContent, now);
    } else {
      return generateDailyDays(selectedDate, groupedContent, now);
    }
  }, [selectedDate, groupedContent, viewType]);

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewType === 'monthly') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setSelectedDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(selectedDate);
    if (viewType === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return {
    calendarDays,
    selectedDate,
    setSelectedDate,
    goToPrevious,
    goToNext,
    goToToday,
    groupedContent
  };
};

// Helper functions
function generateMonthlyDays(year: number, month: number, groupedContent: { [key: string]: any[] }, now: Date): CalendarDay[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
  
  const calendar = [];
  const currentDate = new Date(startDate);
  
  for (let week = 0; week < 6; week++) {
    const weekDays: CalendarDay[] = [];
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
}

function generateWeeklyDays(selectedDate: Date, groupedContent: { [key: string]: any[] }, now: Date): CalendarDay[][] {
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay()); // Start from Sunday
  
  const weekDays: CalendarDay[] = [];
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
  
  return [weekDays]; // Return as array of weeks for consistency
}

function generateDailyDays(selectedDate: Date, groupedContent: { [key: string]: any[] }, now: Date): CalendarDay[][] {
  const dateStr = selectedDate.toDateString();
  const dayContent = groupedContent[dateStr] || [];
  
  return [[{
    date: selectedDate,
    content: dayContent,
    isToday: selectedDate.toDateString() === now.toDateString()
  }]];
}
