import React, { useState, useEffect } from 'react';
import { Track } from './types';
import SpotifyLogin from './SpotifyLogin';
import SpotifySearch from './SpotifySearch';
import SpotifyPlayer from './SpotifyPlayer';

function Spotify() {
    const [token, setToken] = useState<string | null>(null);
    const [player, setPlayer] = useState<Spotify.Player | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Track[]>([]);

    // Check for token on mount
    useEffect(() => {
        const checkToken = async () => {
            if (window.electronAPI) {
                const savedToken = await window.electronAPI.getSpotifyToken();
                if (savedToken) {
                    setToken(savedToken);
                }
            }

            // Check URL for token (after OAuth redirect)
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                if (accessToken) {
                    setToken(accessToken);
                    if (window.electronAPI) {
                        await window.electronAPI.saveSpotifyToken(accessToken);
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        };
        checkToken();
    }, []);

    // Initialize Spotify Player
    useEffect(() => {
        if (!token) return;

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);

        (window as any).onSpotifyWebPlaybackSDKReady = () => {
            const spotifyPlayer = new window.Spotify.Player({
                name: 'My Dashboard Player',
                getOAuthToken: (cb: (token: string) => void) => {
                    cb(token);
                },
                volume: 0.5
            });

            spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
            });

            spotifyPlayer.addListener('player_state_changed', (state: Spotify.PlaybackState) => {
                if (!state) return;

                setCurrentTrack(state.track_window.current_track as any);
                setIsPlaying(!state.paused);
                setPosition(state.position);
                setDuration(state.duration);
            });

            spotifyPlayer.connect();
            setPlayer(spotifyPlayer);
        };

        return () => {
            if (player) {
                player.disconnect();
            }
        };
    }, [token]);

    const handleLogout = async () => {
        if (player) {
            player.disconnect();
        }
        if (window.electronAPI) {
            await window.electronAPI.clearSpotifyToken();
        }
        setToken(null);
        setPlayer(null);
        setCurrentTrack(null);
    };

    const togglePlay = () => {
        if (player) {
            player.togglePlay();
        }
    };

    const skipNext = () => {
        if (player) {
            player.nextTrack();
        }
    };

    const skipPrevious = () => {
        if (player) {
            player.previousTrack();
        }
    };

    const searchTracks = async () => {
        if (!token || !searchQuery) return;

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            const data = await response.json();
            setSearchResults(data.tracks.items);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const playTrack = async (uri: string) => {
        if (!token || !deviceId) return;

        try {
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: [uri]
                })
            });
        } catch (error) {
            console.error('Play failed:', error);
        }
    };

    if (!token) {
        return <SpotifyLogin isLoggedIn={false} />;
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>Spotify Player</h2>
                <SpotifyLogin isLoggedIn={true} onLogout={handleLogout} />
            </div>

            {/* Search Component */}
            <SpotifySearch
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSearch={searchTracks}
                searchResults={searchResults}
                onPlayTrack={playTrack}
            />

            {/* Player Component */}
            <SpotifyPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                position={position}
                duration={duration}
                onTogglePlay={togglePlay}
                onSkipNext={skipNext}
                onSkipPrevious={skipPrevious}
            />
        </div>
    );
}

export default Spotify;