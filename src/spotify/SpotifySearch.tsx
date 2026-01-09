import React from 'react';
import { Track } from './types';

interface SpotifySearchProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearch: () => void;
    searchResults: Track[];
    onPlayTrack: (uri: string) => void;
}

function SpotifySearch({
                           searchQuery,
                           onSearchQueryChange,
                           onSearch,
                           searchResults,
                           onPlayTrack
                       }: SpotifySearchProps) {

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Search Bar */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                    placeholder="Search for songs..."
                    style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                />
                <button
                    onClick={onSearch}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#1DB954',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Search
                </button>
            </div>

            {/* Search Results */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {searchResults.map((track, index) => (
                    <div
                        key={index}
                        onClick={() => onPlayTrack(track.uri)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: '#f9f9f9',
                            marginBottom: '5px'
                        }}
                    >
                        <img
                            src={track.album.images[2]?.url}
                            alt={track.name}
                            style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{track.name}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {track.artists.map(a => a.name).join(', ')}
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                            {formatTime(track.duration_ms)}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default SpotifySearch;