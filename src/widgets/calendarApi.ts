import { GoogleTokenData } from '../electron.d';
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

function fromGoogleEvent(item: any, calendarId: string, calendarName: string): CalendarEvent {
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    return {
        id: item.id,
        calendarId,
        calendarName,
        summary: item.summary || '(No title)',
        description: item.description,
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        isAllDay
    };
}

interface CalendarListEntry {
    id: string;
    summary: string;
    selected?: boolean;
}

async function listCalendars(
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
    calendarName: string,
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
        if (!response.ok) break;
        const data = await response.json();

        events.push(...(data.items || []).map((item: any) => fromGoogleEvent(item, calendarId, calendarName)));
        pageToken = data.nextPageToken;
    } while (pageToken);

    return events;
}

export async function listEventsInRange(
    rangeStart: Date,
    rangeEnd: Date,
    tokenData: GoogleTokenData,
    onTokenRefreshed: (t: GoogleTokenData) => void
): Promise<CalendarEvent[]> {
    const calendars = await listCalendars(tokenData, onTokenRefreshed);
    const visibleCalendars = calendars.filter(cal => cal.selected !== false);

    const resultsPerCalendar = await Promise.all(
        visibleCalendars.map(cal =>
            listEventsForCalendar(
                cal.id,
                cal.summary,
                rangeStart.toISOString(),
                rangeEnd.toISOString(),
                tokenData,
                onTokenRefreshed
            )
        )
    );

    return resultsPerCalendar
        .flat()
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}