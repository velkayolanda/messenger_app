import React from 'react';
import { Track } from './types';

interface SpotifySearchProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    searchResults: Track[];
    isSearching: boolean;
    onPlayTrack: (uri: string) => void;
    onAddToQueue: (uri: string) => void;
    hideSearchBar?: boolean;
}

function formatTime(ms: number) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SpotifySearch({
                           searchQuery,
                           onSearchQueryChange,
                           searchResults,
                           isSearching,
                           onPlayTrack,
                           onAddToQueue,
                           hideSearchBar
                       }: SpotifySearchProps) {
    return (
        <div className="spotify-search">
            {!hideSearchBar && (
                <div className="spotify-search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder="Search for songs..."
                        className="spotify-search-input"
                    />
                </div>
            )}

            <div className="spotify-track-list">
                {isSearching && <p className="spotify-empty-state">Searching...</p>}

                {!isSearching && searchResults.length === 0 && !hideSearchBar && searchQuery.trim() && (
                    <p className="spotify-empty-state">No results found.</p>
                )}

                {!isSearching && searchResults.length === 0 && hideSearchBar && (
                    <p className="spotify-empty-state">Nothing here yet.</p>
                )}

                {!isSearching && searchResults.map((track, index) => (
                    <div key={track.id || track.uri || index} className="spotify-track-row">
                        <img
                            src={track.album.images[track.album.images.length - 1]?.url}
                            alt={track.name}
                            className="spotify-track-thumb"
                            onClick={() => onPlayTrack(track.uri)}
                        />
                        <div className="spotify-track-details" onClick={() => onPlayTrack(track.uri)}>
                            <div className="spotify-track-name">{track.name}</div>
                            <div className="spotify-track-artist">
                                {track.artists.map(a => a.name).join(', ')}
                            </div>
                        </div>
                        <div className="spotify-track-duration">{formatTime(track.duration_ms)}</div>
                        <button
                            className="spotify-queue-button"
                            onClick={() => onAddToQueue(track.uri)}
                            title="Add to queue"
                            aria-label="Add to queue"
                        >
                            +
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SpotifySearch;