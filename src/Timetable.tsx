import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface CalendarEvent {
    date: string;
    time: string;
    subject: string;
    location: string;
    teacher: string;
    rawData: any; // Store the full row in case we need it
}

function Timetable() {
    const [userId, setUserId] = useState('');
    const [savedId, setSavedId] = useState<string | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load saved ID on mount
    useEffect(() => {
        const loadSavedId = async () => {
            if (window.electronAPI) {
                const id = await window.electronAPI.getTimetableId();
                if (id) {
                    setSavedId(id);
                    setUserId(id);
                    fetchTimetable(id);
                }
            }
        };
        loadSavedId();
    }, []);

    const fetchTimetable = async (id: string) => {
        setLoading(true);
        setError('');

        try {
            // Get current date and 2 weeks ahead
            const today = new Date();
            const twoWeeksLater = new Date();
            twoWeeksLater.setDate(today.getDate() + 14);

            const dateFrom = today.toISOString().split('T')[0];
            const dateTo = twoWeeksLater.toISOString().split('T')[0];

            const url = `https://apl.unob.cz/portalosoba/Rozvrh/RozvrhExport?type=0&id=69914&datumOd=2025-12-26&datumDo=2026-01-09`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch timetable');
            }

            const csvText = await response.text();

            // Parse CSV
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    console.log('CSV parsed:', results.data); // Debug log

                    // Parse the CSV data - adjust these field names based on actual CSV columns
                    const parsedEvents: CalendarEvent[] = results.data.map((row: any) => {
                        return {
                            date: row['Datum'] || row['Date'] || '',
                            time: row['Čas'] || row['Time'] || row['Cas'] || '',
                            subject: row['Předmět'] || row['Subject'] || row['Predmet'] || '',
                            location: row['Místnost'] || row['Location'] || row['Mistnost'] || row['Room'] || '',
                            teacher: row['Vyučující'] || row['Teacher'] || row['Vyucujici'] || '',
                            rawData: row
                        };
                    }).filter(event => event.date); // Filter out empty rows

                    // Sort by date and time
                    parsedEvents.sort((a, b) => {
                        const dateCompare = a.date.localeCompare(b.date);
                        if (dateCompare !== 0) return dateCompare;
                        return a.time.localeCompare(b.time);
                    });

                    setEvents(parsedEvents);

                    // Save the ID
                    if (window.electronAPI) {
                        window.electronAPI.saveTimetableId(id);
                    }
                    setSavedId(id);
                },
                error: (err:any) => {
                    throw new Error('Failed to parse CSV: ' + err.message);
                }
            });

        } catch (err: any) {
            setError('Failed to load timetable: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userId.trim()) {
            fetchTimetable(userId.trim());
        }
    };

    const handleClear = async () => {
        setUserId('');
        setSavedId(null);
        setEvents([]);
        if (window.electronAPI) {
            await window.electronAPI.saveTimetableId('');
        }
    };

    // Group events by date
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};
    events.forEach(event => {
        if (!groupedEvents[event.date]) {
            groupedEvents[event.date] = [];
        }
        groupedEvents[event.date].push(event);
    });

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <h2>Timetable</h2>

            {/* ID Input Form */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter your University ID"
                    style={{
                        padding: '10px',
                        fontSize: '14px',
                        flex: 1,
                        maxWidth: '300px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                    }}
                />
                <button
                    type="submit"
                    disabled={loading || !userId.trim()}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: loading ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Loading...' : 'Fetch Timetable'}
                </button>
                {savedId && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear
                    </button>
                )}
            </form>

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
                {events.length === 0 && !loading && (
                    <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
                        {savedId ? 'No events found for the next 2 weeks' : 'Enter your University ID to view your timetable'}
                    </p>
                )}

                {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                    <div key={date} style={{ marginBottom: '30px' }}>
                        <h3 style={{
                            borderBottom: '2px solid #4CAF50',
                            paddingBottom: '5px',
                            color: '#333'
                        }}>
                            {date}
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
                                    {event.subject || 'No Subject'}
                                </div>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                                    ⏰ {event.time}
                                </div>
                                {event.location && (
                                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                                        📍 {event.location}
                                    </div>
                                )}
                                {event.teacher && (
                                    <div style={{ fontSize: '13px', color: '#888' }}>
                                        👨‍🏫 {event.teacher}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Timetable;