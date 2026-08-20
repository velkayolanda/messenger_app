import React from 'react';
import { Playlist } from './types';

interface SpotifyPlaylistsProps {
    playlists: Playlist[];
    loading: boolean;
    onOpenPlaylist: (playlist: Playlist) => void;
    onPlayPlaylist: (playlist: Playlist) => void;
}

function SpotifyPlaylists({ playlists, loading, onOpenPlaylist, onPlayPlaylist }: SpotifyPlaylistsProps) {
    if (loading) {
        return <p className="spotify-empty-state">Loading playlists...</p>;
    }

    const validPlaylists = playlists.filter((p): p is Playlist => Boolean(p));

    if (validPlaylists.length === 0) {
        return <p className="spotify-empty-state">No playlists found.</p>;
    }

    return (
        <div className="spotify-playlist-grid">
            {validPlaylists.map((playlist) => (
                <div key={playlist.id} className="spotify-playlist-card" onClick={() => onOpenPlaylist(playlist)}>
                    <div className="spotify-playlist-artwork-wrap">
                        <img
                            src={playlist.images?.[0]?.url}
                            alt={playlist.name}
                            className="spotify-playlist-artwork"
                        />
                        <button
                            className="spotify-playlist-play-overlay"
                            onClick={(e) => { e.stopPropagation(); onPlayPlaylist(playlist); }}
                            aria-label={`Play ${playlist.name}`}
                        >
                            &#9654;
                        </button>
                    </div>
                    <div className="spotify-playlist-name">{playlist.name}</div>
                    <div className="spotify-playlist-count">{playlist.tracks?.total ?? 0} tracks</div>
                </div>
            ))}
        </div>
    );
}

export default SpotifyPlaylists;