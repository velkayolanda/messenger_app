import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from './types';
import SpotifyLogin from './SpotifyLogin';
import SpotifySearch from './SpotifySearch';
import SpotifyPlayer from './SpotifyPlayer';
import { exchangeCodeForToken } from '../spotifyConfig';

function Spotify() {
    const [token, setToken] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Track[]>([]);
    const [isReady, setIsReady] = useState(false);

    const playerRef = useRef<Spotify.Player | null>(null);
    const hasExchangedToken = useRef(false);
    const sdkLoaded = useRef(false);
    const positionInterval = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(async () => {
        if (playerRef.current) {
            playerRef.current.disconnect();
            playerRef.current = null;
        }
        if (window.electronAPI) {
            await window.electronAPI.clearSpotifyToken();
        }
        setToken(null);
        setCurrentTrack(null);
        setIsReady(false);
        setDeviceId('');
        sdkLoaded.current = false;
    }, []);

    // Check for token on mount
    useEffect(() => {
        const checkToken = async () => {
            if (window.electronAPI) {
                const savedToken = await window.electronAPI.getSpotifyToken();
                if (savedToken) {
                    setToken(savedToken);
                    return;
                }
            }

            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && !hasExchangedToken.current) {
                hasExchangedToken.current = true;
                const accessToken = await exchangeCodeForToken(code);

                if (accessToken) {
                    setToken(accessToken);
                    if (window.electronAPI) {
                        await window.electronAPI.saveSpotifyToken(accessToken);
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    hasExchangedToken.current = false;
                }
            }
        };
        checkToken();
    }, []);

    // Initialize Spotify Player
    useEffect(() => {
        if (!token || sdkLoaded.current) return;

        const initializePlayer = () => {
            const spotifyPlayer = new window.Spotify.Player({
                name: 'My Dashboard Player',
                getOAuthToken: (cb: (token: string) => void) => cb(token),
                volume: 0.5
            });

            spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
                console.log('Spotify Player Ready with Device ID:', device_id);
                setDeviceId(device_id);
                setIsReady(true);
            });

            spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
                console.log('Device has gone offline:', device_id);
                setIsReady(false);
            });

            spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
                console.error('Initialization error:', message);
            });

            spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
                console.error('Authentication error:', message);
                handleLogout();
            });

            spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
                console.error('Account error (Premium required):', message);
            });

            spotifyPlayer.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
                if (!state) {
                    setCurrentTrack(null);
                    setIsPlaying(false);
                    return;
                }

                setCurrentTrack(state.track_window.current_track as unknown as Track);
                setIsPlaying(!state.paused);
                setPosition(state.position);
                setDuration(state.duration);
            });

            spotifyPlayer.connect();
            playerRef.current = spotifyPlayer;
        };

        if (window.Spotify) {
            initializePlayer();
            sdkLoaded.current = true;
        } else {
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);

            window.onSpotifyWebPlaybackSDKReady = () => {
                initializePlayer();
                sdkLoaded.current = true;
            };
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
                playerRef.current = null;
            }
        };
    }, [token, handleLogout]);

    // Update position while playing
    useEffect(() => {
        if (isPlaying) {
            positionInterval.current = setInterval(() => {
                setPosition(prev => Math.min(prev + 1000, duration));
            }, 1000);
        } else if (positionInterval.current) {
            clearInterval(positionInterval.current);
        }

        return () => {
            if (positionInterval.current) {
                clearInterval(positionInterval.current);
            }
        };
    }, [isPlaying, duration]);

    const togglePlay = useCallback(() => {
        playerRef.current?.togglePlay();
    }, []);

    const skipNext = useCallback(() => {
        playerRef.current?.nextTrack();
    }, []);

    const skipPrevious = useCallback(() => {
        playerRef.current?.previousTrack();
    }, []);

    const searchTracks = useCallback(async () => {
        if (!token || !searchQuery.trim()) return;

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    return;
                }
                throw new Error('Search failed');
            }

            const data = await response.json();
            setSearchResults(data.tracks?.items || []);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, [token, searchQuery, handleLogout]);

    const playTrack = useCallback(async (uri: string) => {
        if (!token || !deviceId) return;

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uris: [uri] })
            });

            if (!response.ok && response.status === 401) {
                handleLogout();
            }
        } catch (error) {
            console.error('Play failed:', error);
        }
    }, [token, deviceId, handleLogout]);

    if (!token) {
        return <SpotifyLogin isLoggedIn={false} />;
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>Spotify Player</h2>
                    {!isReady && (
                        <span style={{ fontSize: '12px', color: '#888' }}>Connecting...</span>
                    )}
                </div>
                <SpotifyLogin isLoggedIn={true} onLogout={handleLogout} />
            </div>

            <SpotifySearch
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSearch={searchTracks}
                searchResults={searchResults}
                onPlayTrack={playTrack}
            />

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