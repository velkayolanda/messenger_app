import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TodoItem } from './types';
import { GoogleTokenData } from '../electron.d';
import { getGoogleAuthUrl, exchangeGoogleCodeForToken, ensureValidGoogleToken } from '../googleConfig';
import {
    GoogleAuthError,
    listUpcomingEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent
} from './api';
import './todo.css';

interface TodoProps {
    onClose: () => void;
}

function generateLocalId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Todo({ onClose }: TodoProps) {
    const [tokenData, setTokenData] = useState<GoogleTokenData | null>(null);
    const [localItems, setLocalItems] = useState<TodoItem[]>([]);
    const [calendarItems, setCalendarItems] = useState<TodoItem[]>([]);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newTitle, setNewTitle] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [syncToCalendar, setSyncToCalendar] = useState(false);
    const [filter, setFilter] = useState<'all' | 'week' | 'overdue'>('all');

    const hasExchangedCode = useRef(false);

    const handleTokenRefreshed = useCallback(async (updated: GoogleTokenData) => {
        setTokenData(updated);
        if (window.electronAPI) {
            await window.electronAPI.saveGoogleToken(updated);
        }
    }, []);

    const handleGoogleLogout = useCallback(async () => {
        if (window.electronAPI) {
            await window.electronAPI.clearGoogleToken();
        }
        setTokenData(null);
        setCalendarItems([]);
    }, []);

    const withErrorHandling = useCallback(
        async (fn: () => Promise<void>, fallbackMessage: string) => {
            try {
                setError(null);
                await fn();
            } catch (err) {
                if (err instanceof GoogleAuthError) {
                    handleGoogleLogout();
                    setError('Google session expired - please reconnect.');
                } else if (err instanceof Error && err.message) {
                    console.error(err);
                    setError(err.message);
                } else {
                    console.error(err);
                    setError(fallbackMessage);
                }
            }
        },
        [handleGoogleLogout]
    );

    useEffect(() => {
        const init = async () => {
            if (window.electronAPI) {
                const savedTodosJson = await window.electronAPI.getLocalTodos();
                if (savedTodosJson) {
                    try {
                        setLocalItems(JSON.parse(savedTodosJson));
                    } catch {
                        // ignore corrupt saved data
                    }
                }

                const savedToken = await window.electronAPI.getGoogleToken();
                if (savedToken) {
                    const valid = await ensureValidGoogleToken(savedToken);
                    if (valid) {
                        setTokenData(valid);
                        if (valid.accessToken !== savedToken.accessToken) {
                            await window.electronAPI.saveGoogleToken(valid);
                        }
                    } else {
                        await window.electronAPI.clearGoogleToken();
                    }
                }
            } else {
                const saved = window.localStorage.getItem('local_todos');
                if (saved) {
                    try {
                        setLocalItems(JSON.parse(saved));
                    } catch {
                        // ignore
                    }
                }
            }

            if (window.location.pathname === '/oauth-calendar-callback' && !hasExchangedCode.current) {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                if (code) {
                    hasExchangedCode.current = true;
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

    useEffect(() => {
        const json = JSON.stringify(localItems);
        if (window.electronAPI) {
            window.electronAPI.saveLocalTodos(json);
        } else {
            window.localStorage.setItem('local_todos', json);
        }
    }, [localItems]);

    const loadCalendarItems = useCallback(() => {
        if (!tokenData) return;
        setLoadingCalendar(true);
        withErrorHandling(async () => {
            const events = await listUpcomingEvents(tokenData, handleTokenRefreshed);
            setCalendarItems(
                events.map(e => ({
                    id: `cal-${e.calendarId}-${e.id}`,
                    title: e.summary,
                    notes: e.description,
                    dueDate: e.start,
                    completed: false,
                    source: 'calendar' as const,
                    calendarEventId: e.id,
                    calendarId: e.calendarId
                }))
            );
        }, 'Could not load calendar events.').finally(() => setLoadingCalendar(false));
    }, [tokenData, withErrorHandling, handleTokenRefreshed]);

    useEffect(() => {
        if (tokenData) loadCalendarItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenData]);

    const handleGoogleLogin = async () => {
        const url = await getGoogleAuthUrl();
        window.location.href = url;
    };

    const addItem = useCallback(() => {
        if (!newTitle.trim()) return;

        if (syncToCalendar) {
            if (!tokenData) {
                setError('Connect Google Calendar first to add a synced item.');
                return;
            }
            if (!newDueDate) {
                setError('Pick a due date/time for a Calendar-synced item.');
                return;
            }
            withErrorHandling(async () => {
                const created = await createCalendarEvent(
                    newTitle.trim(),
                    new Date(newDueDate).toISOString(),
                    undefined,
                    tokenData,
                    handleTokenRefreshed
                );
                setCalendarItems(prev => [
                    ...prev,
                    {
                        id: `cal-${created.calendarId}-${created.id}`,
                        title: created.summary,
                        dueDate: created.start,
                        completed: false,
                        source: 'calendar',
                        calendarEventId: created.id,
                        calendarId: created.calendarId
                    }
                ]);
            }, 'Could not create calendar event.');
        } else {
            setLocalItems(prev => [
                ...prev,
                {
                    id: generateLocalId(),
                    title: newTitle.trim(),
                    dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
                    completed: false,
                    source: 'local'
                }
            ]);
        }

        setNewTitle('');
        setNewDueDate('');
    }, [newTitle, newDueDate, syncToCalendar, tokenData, withErrorHandling, handleTokenRefreshed]);

    const toggleLocalComplete = useCallback((id: string) => {
        setLocalItems(prev => prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item)));
    }, []);

    const deleteLocalItem = useCallback((id: string) => {
        setLocalItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const deleteCalendarItem = useCallback(
        (item: TodoItem) => {
            if (!tokenData || !item.calendarEventId || !item.calendarId) return;
            withErrorHandling(async () => {
                await deleteCalendarEvent(item.calendarId!, item.calendarEventId!, tokenData, handleTokenRefreshed);
                setCalendarItems(prev => prev.filter(i => i.id !== item.id));
            }, 'Could not delete calendar event.');
        },
        [tokenData, withErrorHandling, handleTokenRefreshed]
    );

    const renameCalendarItem = useCallback(
        (item: TodoItem, title: string) => {
            if (!tokenData || !item.calendarEventId || !item.calendarId) return;
            withErrorHandling(async () => {
                await updateCalendarEvent(item.calendarId!, item.calendarEventId!, { title }, tokenData, handleTokenRefreshed);
                setCalendarItems(prev => prev.map(i => (i.id === item.id ? { ...i, title } : i)));
            }, 'Could not update calendar event.');
        },
        [tokenData, withErrorHandling, handleTokenRefreshed]
    );

    const allItems = [...localItems, ...calendarItems].sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    // Monday-Sunday week containing "now", in local time.
    const getWeekBounds = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() + diffToMonday);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        return { start: monday, end: nextMonday };
    };

    const visibleItems = allItems.filter(item => {
        if (filter === 'all') return true;

        // Undated local items are ongoing, not tied to any week - always show them.
        if (!item.dueDate) return true;

        const due = new Date(item.dueDate);

        if (filter === 'week') {
            const { start, end } = getWeekBounds();
            return due >= start && due < end;
        }

        if (filter === 'overdue') {
            return due < new Date() && !item.completed;
        }

        return true;
    });

    return (
        <aside className="todo-sidebar">
            <button className="close-todo" onClick={onClose}>Close</button>
            <h2>TODO</h2>

            <div className="todo-google-status">
                {tokenData ? (
                    <div className="todo-google-connected">
                        <span>Google Calendar connected</span>
                        <button onClick={handleGoogleLogout} className="todo-google-disconnect">Disconnect</button>
                    </div>
                ) : (
                    <button onClick={handleGoogleLogin} className="todo-google-connect">
                        Connect Google Calendar
                    </button>
                )}
            </div>

            {error && <div className="todo-error">{error}</div>}

            <div className="todo-add-form">
                <input
                    type="text"
                    placeholder="Add a task..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    className="todo-input"
                />
                <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="todo-date-input"
                />
                <label className="todo-sync-toggle">
                    <input
                        type="checkbox"
                        checked={syncToCalendar}
                        onChange={(e) => setSyncToCalendar(e.target.checked)}
                        disabled={!tokenData}
                    />
                    Sync to Google Calendar
                </label>
                <button onClick={addItem} className="todo-add-button">Add</button>
            </div>

            {loadingCalendar && <p className="todo-loading">Loading calendar events...</p>}

            <div className="todo-filter-tabs">
                <button
                    className={`todo-filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`todo-filter-tab ${filter === 'week' ? 'active' : ''}`}
                    onClick={() => setFilter('week')}
                >
                    This Week
                </button>
                <button
                    className={`todo-filter-tab ${filter === 'overdue' ? 'active' : ''}`}
                    onClick={() => setFilter('overdue')}
                >
                    Overdue
                </button>
            </div>

            <div className="todo-list">
                {visibleItems.length === 0 && !loadingCalendar && (
                    <p className="todo-empty">
                        {allItems.length === 0 ? 'Nothing here yet. Add a task above.' : 'Nothing matches this filter.'}
                    </p>
                )}
                {visibleItems.map(item => (
                    <div key={item.id} className={`todo-row ${item.completed ? 'completed' : ''}`}>
                        {item.source === 'local' ? (
                            <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => toggleLocalComplete(item.id)}
                            />
                        ) : (
                            <span className="todo-calendar-badge" title="Synced with Google Calendar">&#128197;</span>
                        )}
                        <div className="todo-row-text">
                            {item.source === 'calendar' ? (
                                <span
                                    className="todo-row-title todo-row-title-editable"
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                        const newText = e.currentTarget.textContent?.trim();
                                        if (newText && newText !== item.title) {
                                            renameCalendarItem(item, newText);
                                        }
                                    }}
                                >
                                    {item.title}
                                </span>
                            ) : (
                                <span className="todo-row-title">{item.title}</span>
                            )}
                            {item.dueDate && (
                                <span className="todo-row-date">
                                    {new Date(item.dueDate).toLocaleString([], {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            )}
                        </div>
                        {item.source === 'local' ? (
                            <button className="todo-delete" onClick={() => deleteLocalItem(item.id)} aria-label="Delete">
                                &times;
                            </button>
                        ) : (
                            <button className="todo-delete" onClick={() => deleteCalendarItem(item)} aria-label="Delete">
                                &times;
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
}

export default Todo;