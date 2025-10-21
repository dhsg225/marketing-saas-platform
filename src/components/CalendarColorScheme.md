# Calendar Color Scheme Documentation

## Overview
This document defines the color scheme and visual styling for calendar items across all calendar views (7-day, 30-day, monthly).

## Color Palette

### Post Type Colors (Background)
- **Default**: `#6366f1` (Indigo)
- **User-assigned**: Uses `post_type_color` from database
- **Scheduled Posts**: `#f3e8ff` (Light Purple)
- **Regular Content**: `#e0e7ff` (Light Indigo)

### Workflow Stage Indicators

#### Border Styles
- **Draft**: Dashed gray border (`#6b7280`, 2px dashed)
- **Approved/Concept Approved**: Solid green border (`#10b981`, 2px solid)
- **Ready to Publish**: Orange top strip (`#f59e0b`, 4px solid)
- **Published**: Green top strip (`#059669`, 4px solid)

#### Text Colors
- **Content Ideas**: White text on colored background
- **Scheduled Posts**: Purple text (`#7c3aed`) on light purple background
- **Regular Content**: Indigo text (`#4338ca`) on light indigo background

## Visual Hierarchy

### 1. Post Type (Primary)
- Background color represents the post type
- Most prominent visual element
- User-customizable via `post_type_color`

### 2. Workflow Stage (Secondary)
- Border style/color indicates workflow stage
- Dashed = draft, solid = approved, top strip = ready/published
- Provides immediate status recognition

### 3. Metadata (Tertiary)
- Time, platform, priority shown in smaller text
- Tooltip shows complete information
- Consistent across all views

## Implementation

### CalendarItem Component
- Single source of truth for all calendar item rendering
- Handles all view types (7-day, 30-day, monthly)
- Consistent styling logic across views
- Responsive design for different view sizes

### View-Specific Adaptations
- **Monthly**: Compact display, truncated text
- **7-day**: Full metadata, larger click targets
- **30-day**: Balanced display with essential info

## Accessibility
- High contrast ratios for text readability
- Clear visual distinction between different states
- Tooltips provide additional context
- Hover states for interactive elements

## Future Enhancements
- Custom color picker for post types
- Additional workflow stages
- Animation for state transitions
- Dark mode support
