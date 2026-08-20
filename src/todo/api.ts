import { GoogleTokenData } from '../googleConfig';
import { ensureValidGoogleToken, refreshGoogleAccessToken } from '../googleConfig';
import { CalendarEvent } from './types';

const BASE_URL = 'https://www.googleapis.com/calendar/v3';

export class GoogleAuthError extends Error {
    constructor() {
        super('Google authentication expired');
        this.name = 'GoogleAuthError';
    }
}

interface RequestOptions extends RequestInit {}

export async function googleFetch(
    path: string,
    tokenData: GoogleTokenData,
    onTokenRefreshed: (tokenData: GoogleTokenData) => void,
    options: RequestOptions = {},
    _isRetry = false
): Promise<Response> {
    const validToken = await ensureValidGoogleToken(tokenData);
    if (!validToken) {
        throw new GoogleAuthError();
    }
    if (validToken.accessToken !== tokenData.accessToken) {
        onTokenRefreshed(validToken);
    }

    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${validToken.accessToken}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });

    if (response.status === 401) {
        if (_isRetry) {
            throw new GoogleAuthError();
        }
        const refreshed = await refreshGoogleAccessToken(validToken.refreshToken);
        if (!refreshed) {
            throw new GoogleAuthError();
        }
        onTokenRefreshed(refreshed);
        return googleFetch(path, refreshed, onTokenRefreshed, options, true);
    }

    return response;
}

function fromGoogleEvent(item: any, calendarId: string): CalendarEvent {
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    return {
        id: item.id,
        calendarId,
        summary: item.summary || '(No title)',
        description: item.description,
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        isAllDay,
        htmlLink: item.htmlLink
    };
}

interface CalendarListEntry {
    id: string;
    summary: string;
    selected?: boolean;
}

// Lists every calendar the user has access to (their own calendars, plus any
// shared/subscribed ones), not just the primary one.
export async function listCalendars(
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<CalendarListEntry[]> {
    const response = await googleFetch('/users/me/calendarList', tokenData, onTokenRefreshed);
    if (!response.ok) throw new Error('Failed to load calendar list');
    const data = await response.json();
    return (data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary,
        selected: item.selected
    }));
}

async function listEventsForCalendar(
    calendarId: string,
    timeMin: string,
    timeMax: string,
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
        const params = new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250',
            ...(pageToken ? { pageToken } : {})
        });

        const response = await googleFetch(
            `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
            tokenData,
            onTokenRefreshed
        );
        // A calendar we've lost access to, or that's been deleted, shouldn't
        // fail the whole fetch - just skip it.
        if (!response.ok) break;
        const data = await response.json();

        events.push(...(data.items || []).map((item: any) => fromGoogleEvent(item, calendarId)));
        pageToken = data.nextPageToken;
    } while (pageToken);

    return events;
}

// The Google Calendar to exclusively read from and write to.
// Find this under that calendar's Settings > "Integrate calendar" > Calendar ID.
const TARGET_CALENDAR_ID = process.env.REACT_APP_GOOGLE_TODO_CALENDAR_ID || 'primary';

export async function getTargetCalendarId(): Promise<string> {
    return TARGET_CALENDAR_ID;
}

// Fetches events in a window around "now" - 30 days back, 90 days forward -
// from the "To Do" calendar only.
export async function listUpcomingEvents(
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<CalendarEvent[]> {
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    return listEventsForCalendar(TARGET_CALENDAR_ID, timeMin, timeMax, tokenData, onTokenRefreshed);
}

export async function createCalendarEvent(
    title: string,
    dueDateIso: string,
    notes: string | undefined,
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<CalendarEvent> {
    // New items created from the to-do panel go on the "To Do" calendar.
    const calendarId = await getTargetCalendarId();
    const start = new Date(dueDateIso);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const response = await googleFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, tokenData, onTokenRefreshed, {
        method: 'POST',
        body: JSON.stringify({
            summary: title,
            description: notes,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() }
        })
    });

    if (!response.ok) throw new Error('Failed to create calendar event');
    const data = await response.json();
    return fromGoogleEvent(data, calendarId);
}

export async function updateCalendarEvent(
    calendarId: string,
    eventId: string,
    updates: { title?: string; notes?: string; dueDateIso?: string },
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<CalendarEvent> {
    const body: any = {};
    if (updates.title !== undefined) body.summary = updates.title;
    if (updates.notes !== undefined) body.description = updates.notes;
    if (updates.dueDateIso !== undefined) {
        const start = new Date(updates.dueDateIso);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        body.start = { dateTime: start.toISOString() };
        body.end = { dateTime: end.toISOString() };
    }

    const response = await googleFetch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        tokenData,
        onTokenRefreshed,
        { method: 'PATCH', body: JSON.stringify(body) }
    );

    if (!response.ok) throw new Error('Failed to update calendar event');
    const data = await response.json();
    return fromGoogleEvent(data, calendarId);
}

export async function deleteCalendarEvent(
    calendarId: string,
    eventId: string,
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<void> {
    const response = await googleFetch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        tokenData,
        onTokenRefreshed,
        { method: 'DELETE' }
    );
    // Google returns 410 Gone if the event was already deleted elsewhere - treat as success.
    if (!response.ok && response.status !== 410 && response.status !== 404) {
        throw new Error('Failed to delete calendar event');
    }
}