import React from 'react';
import { Track } from './types';

interface SpotifyQueueProps {
    queue: Track[];
    loading: boolean;
    onClose: () => void;
}

function SpotifyQueue({ queue, loading, onClose }: SpotifyQueueProps) {
    return (
        <div className="spotify-devices-overlay" onClick={onClose}>
            <div className="spotify-devices-panel" onClick={(e) => e.stopPropagation()}>
                <div className="spotify-devices-header">
                    <h3>Up next</h3>
                    <button className="spotify-devices-close" onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                {loading && <p className="spotify-empty-state">Loading queue...</p>}

                {!loading && queue.length === 0 && (
                    <p className="spotify-empty-state">Nothing queued up.</p>
                )}

                {!loading && (
                    <div className="spotify-queue-list">
                        {queue.map((track, index) => (
                            <div key={`${track.uri}-${index}`} className="spotify-track-row">
                                <img
                                    src={track.album.images[track.album.images.length - 1]?.url}
                                    alt={track.name}
                                    className="spotify-track-thumb"
                                />
                                <div className="spotify-track-details">
                                    <div className="spotify-track-name">{track.name}</div>
                                    <div className="spotify-track-artist">
                                        {track.artists.map(a => a.name).join(', ')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="spotify-queue-note">
                    Use the + button on any track to add it to this queue. Reordering or
                    removing queued tracks isn't supported by Spotify outside their own apps.
                </p>
            </div>
        </div>
    );
}

export default SpotifyQueue;