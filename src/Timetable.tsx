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

    const parseICSFile = (icsData: string) => {
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
            setLastUpdated(new Date());
            setError('');

            // Save to localStorage for persistence
            localStorage.setItem('timetable_data', JSON.stringify(parsedEvents));
            localStorage.setItem('timetable_updated', new Date().toISOString());
        } catch (err: any) {
            setError('Failed to parse calendar file: ' + err.message);
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
    }, []);

    // Auto-refresh reminder every hour
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            const now = new Date();
            if (lastUpdated) {
                const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

                // Remind if data is older than 24 hours
                if (hoursSinceUpdate > 24) {
                    setError('⚠️ Timetable data is older than 24 hours. Consider re-uploading to get the latest schedule.');
                }
            }
        }, 60 * 60 * 1000); // Check every hour

        return () => clearInterval(interval);
    }, [autoRefresh, lastUpdated]);

    const handleRefreshReminder = () => {
        setError('');
    };

    // Group events by date
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    events.forEach(event => {
        // Only show upcoming events
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
                        Auto-refresh reminders
                    </label>
                </div>
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '20px' }}>
                <label
                    htmlFor="ics-upload"
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-block'
                    }}
                >
                    📥 Upload/Update ICS File
                </label>
                <input
                    id="ics-upload"
                    type="file"
                    accept=".ics"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />

                {lastUpdated && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                        Last updated: {lastUpdated.toLocaleString()}
                    </div>
                )}

                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Download your timetable from:
                    <a
                        href="https://apl.unob.cz/portalosoba/Rozvrh/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '5px', color: '#4CAF50' }}
                    >
                        University Portal
                    </a>
                </p>
            </div>

            {error && (
                <div style={{
                    padding: '10px',
                    backgroundColor: error.includes('⚠️') ? '#fff3cd' : '#ffebee',
                    color: error.includes('⚠️') ? '#856404' : '#c62828',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{error}</span>
                    {error.includes('⚠️') && (
                        <button
                            onClick={handleRefreshReminder}
                            style={{
                                padding: '5px 10px',
                                backgroundColor: 'transparent',
                                border: '1px solid #856404',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Dismiss
                        </button>
                    )}
                </div>
            )}

            {/* Events Display */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {events.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <p style={{ color: '#666', marginBottom: '20px' }}>
                            No timetable loaded. Upload an ICS file to get started.
                        </p>
                        <ol style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto', color: '#666' }}>
                            <li>Go to the University Portal</li>
                            <li>Navigate to your timetable</li>
                            <li>Export/Download as ICS file</li>
                            <li>Upload it here</li>
                        </ol>
                    </div>
                ) : Object.keys(groupedEvents).length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
                        No upcoming events. All classes may be in the past.
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