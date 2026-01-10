import React, { useState, useEffect } from 'react';
import ICAL from 'ical.js';

interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    location: string;
    description: string;
}

function Timetable() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [checking, setChecking] = useState(false);

    const parseICSFile = (icsData: string, modifiedDate?: string) => {
        try {
            const jcalData = ICAL.parse(icsData);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents('vevent');

            const parsedEvents: CalendarEvent[] = vevents.map((vevent) => {
                const event = new ICAL.Event(vevent);
                return {
                    title: event.summary || 'No Title',
                    start: event.startDate.toJSDate(),
                    end: event.endDate.toJSDate(),
                    location: event.location || '',
                    description: event.description || ''
                };
            });

            parsedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

            setEvents(parsedEvents);
            setLastUpdated(modifiedDate ? new Date(modifiedDate) : new Date());
            setError('');

            // Save to localStorage
            localStorage.setItem('timetable_data', JSON.stringify(parsedEvents));
            localStorage.setItem('timetable_updated', (modifiedDate || new Date().toISOString()));
        } catch (err: any) {
            setError('Failed to parse calendar file: ' + err.message);
        }
    };

    const checkAndLoadFile = async () => {
        setChecking(true);

        try {
            // Try to fetch the file from public folder
            const response = await fetch('/timetable/rozvrh.ics');

            if (response.ok) {
                const icsData = await response.text();
                const lastModified = response.headers.get('Last-Modified');
                parseICSFile(icsData, lastModified || undefined);
                setError('');
            } else {
                setError('No timetable file found. Place rozvrh.ics in public/timetable/ folder.');
            }
        } catch (err: any) {
            setError('Could not load timetable file. Make sure rozvrh.ics is in public/timetable/');
        } finally {
            setChecking(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const icsData = event.target?.result as string;
            parseICSFile(icsData);
        };

        reader.readAsText(file);
    };

    // Load saved data on mount
    useEffect(() => {
        const savedData = localStorage.getItem('timetable_data');
        const savedDate = localStorage.getItem('timetable_updated');

        if (savedData && savedDate) {
            setEvents(JSON.parse(savedData));
            setLastUpdated(new Date(savedDate));
        }

        // Check for file on mount
        checkAndLoadFile();
    }, []);

    // Auto-check for file updates every 5 minutes
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            checkAndLoadFile();
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Group events by date
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    events.forEach(event => {
        if (event.start >= today) {
            const dateKey = event.start.toLocaleDateString();
            if (!groupedEvents[dateKey]) {
                groupedEvents[dateKey] = [];
            }
            groupedEvents[dateKey].push(event);
        }
    });

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Timetable</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px', color: '#666' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ marginRight: '5px' }}
                        />
                        Auto-check for updates
                    </label>
                </div>
            </div>

            {/* Controls */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={checkAndLoadFile}
                    disabled={checking}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: checking ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: checking ? 'not-allowed' : 'pointer'
                    }}
                >
                    {checking ? '🔄 Checking...' : '🔄 Check for Updates'}
                </button>

                <label
                    htmlFor="ics-upload"
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-block'
                    }}
                >
                    📥 Manual Upload
                </label>
                <input
                    id="ics-upload"
                    type="file"
                    accept=".ics"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />
            </div>

            {lastUpdated && (
                <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                    Last updated: {lastUpdated.toLocaleString()}
                </div>
            )}

            <div style={{
                padding: '15px',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '14px'
            }}>
                <strong>How to update:</strong>
                <ol style={{ marginTop: '10px', marginBottom: '0' }}>
                    <li>Download ICS from <a href="https://apl.unob.cz/portalosoba/Rozvrh/" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>University Portal</a></li>
                    <li>Save it as <code style={{ backgroundColor: '#fff', padding: '2px 5px', borderRadius: '3px' }}>rozvrh.ics</code> in: <code style={{ backgroundColor: '#fff', padding: '2px 5px', borderRadius: '3px' }}>public/timetable/</code></li>
                    <li>App will auto-check every 5 minutes, or click "Check for Updates"</li>
                </ol>
            </div>

            {error && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}

            {/* Events Display */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {events.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
                        No timetable loaded. Place rozvrh.ics in public/timetable/ folder or upload manually.
                    </p>
                ) : Object.keys(groupedEvents).length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
                        No upcoming events.
                    </p>
                ) : (
                    Object.entries(groupedEvents).map(([date, dayEvents]) => (
                        <div key={date} style={{ marginBottom: '30px' }}>
                            <h3 style={{
                                borderBottom: '2px solid #4CAF50',
                                paddingBottom: '5px',
                                color: '#333'
                            }}>
                                {new Date(dayEvents[0].start).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </h3>

                            {dayEvents.map((event, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '15px',
                                        margin: '10px 0',
                                        backgroundColor: '#f9f9f9',
                                        border: '1px solid #ddd',
                                        borderLeft: '4px solid #4CAF50',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
                                        {event.title}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                                        ⏰ {event.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {event.location && (
                                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                                            📍 {event.location}
                                        </div>
                                    )}
                                    {event.description && (
                                        <div style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                                            {event.description}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Timetable;