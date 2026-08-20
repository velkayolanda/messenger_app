export interface CalendarEvent {
    id: string;
    calendarId: string;
    summary: string;
    description?: string;
    start: string; // ISO datetime or date
    end: string;
    isAllDay: boolean;
    htmlLink?: string;
}

// A unified item shown in the to-do panel - either a local-only checklist
// item, or one backed by a real Google Calendar event.
export interface TodoItem {
    id: string;
    title: string;
    notes?: string;
    dueDate?: string; // ISO datetime, optional for local items
    completed: boolean;
    source: 'local' | 'calendar';
    calendarEventId?: string; // set when source === 'calendar'
    calendarId?: string; // which Google calendar this event lives on
}