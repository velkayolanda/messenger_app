import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from './types';
import { GoogleTokenData } from '../electron.d';
import { getGoogleAuthUrl, exchangeGoogleCodeForToken, ensureValidGoogleToken } from '../googleConfig';
import { GoogleAuthError, listEventsInRange } from './calendarApi';

type RangeMode = 'today' | 'week';

function getRange(mode: RangeMode): { start: Date; end: Date } {
    const now = new Date();

    if (mode === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
    }

    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
}

function CalendarWidget() {
    const [tokenData, setTokenData] = useState<GoogleTokenData | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rangeMode, setRangeMode] = useState<RangeMode>('today');

    const handleTokenRefreshed = useCallback(async (updated: GoogleTokenData) => {
        setTokenData(updated);
        if (window.electronAPI) {
            await window.electronAPI.saveGoogleToken(updated);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            if (window.electronAPI) {
                const saved = await window.electronAPI.getGoogleToken();
                if (saved) {
                    const valid = await ensureValidGoogleToken(saved);
                    if (valid) {
                        setTokenData(valid);
                        if (valid.accessToken !== saved.accessToken) {
                            await window.electronAPI.saveGoogleToken(valid);
                        }
                    } else {
                        await window.electronAPI.clearGoogleToken();
                    }
                }
            }

            if (window.location.pathname === '/oauth-calendar-callback') {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                if (code) {
                    const exchanged = await exchangeGoogleCodeForToken(code);
                    if (exchanged) {
                        setTokenData(exchanged);
                        if (window.electronAPI) {
                            await window.electronAPI.saveGoogleToken(exchanged);
                        }
                    }
                    window.history.replaceState({}, document.title, '/');
                }
            }
        };
        init();
    }, []);

    const loadEvents = useCallback(() => {
        if (!tokenData) return;
        setLoading(true);
        setError(null);
        const { start, end } = getRange(rangeMode);

        listEventsInRange(start, end, tokenData, handleTokenRefreshed)
            .then(setEvents)
            .catch(err => {
                if (err instanceof GoogleAuthError) {
                    setTokenData(null);
                    setError('Google session expired - reconnect from the To Do panel or here.');
                } else {
                    console.error(err);
                    setError('Could not load calendar events.');
                }
            })
            .finally(() => setLoading(false));
    }, [tokenData, rangeMode, handleTokenRefreshed]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const handleConnect = async () => {
        const url = await getGoogleAuthUrl();
        window.location.href = url;
    };

    if (!tokenData) {
        return (
            <div className="widget widget-calendar">
                <div className="widget-header">Calendar</div>
                <button className="widget-calendar-connect" onClick={handleConnect}>
                    Connect Google Calendar
                </button>
            </div>
        );
    }

    return (
        <div className="widget widget-calendar">
            <div className="widget-header">
                <span>Calendar</span>
                <div className="widget-calendar-toggle">
                    <button
                        className={rangeMode === 'today' ? 'active' : ''}
                        onClick={() => setRangeMode('today')}
                    >
                        Today
                    </button>
                    <button
                        className={rangeMode === 'week' ? 'active' : ''}
                        onClick={() => setRangeMode('week')}
                    >
                        This Week
                    </button>
                </div>
            </div>

            {loading && <p className="widget-loading">Loading...</p>}
            {error && <p className="widget-error">{error}</p>}

            {!loading && events.length === 0 && !error && (
                <p className="widget-empty">No events {rangeMode === 'today' ? 'today' : 'this week'}.</p>
            )}

            <div className="widget-calendar-list">
                {events.map(event => (
                    <div key={`${event.calendarId}-${event.id}`} className="widget-calendar-event">
                        <span className="widget-calendar-event-time">
                            {event.isAllDay
                                ? 'All day'
                                : new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="widget-calendar-event-title">{event.summary}</span>
                        <span className="widget-calendar-event-source">{event.calendarName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CalendarWidget;