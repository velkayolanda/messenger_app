import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Device, Playlist, RepeatMode, Track } from './types';
import { SpotifyTokenData } from '../electron.d';
import SpotifyLogin from './SpotifyLogin';
import SpotifySearch from './SpotifySearch';
import SpotifyPlayer from './SpotifyPlayer';
import SpotifyPlaylists from './SpotifyPlaylists';
import SpotifyDevices from './SpotifyDevices';
import SpotifyQueue from './SpotifyQueue';
import { exchangeCodeForToken, ensureValidToken } from '../spotifyConfig';
import {
    SpotifyAuthError,
    searchTracks as apiSearchTracks,
    getUserPlaylists,
    getPlaylistTracks,
    getLikedSongs,
    playTrackOnDevice,
    playContextOnDevice,
    addToQueue as apiAddToQueue,
    setShuffle as apiSetShuffle,
    setRepeat as apiSetRepeat,
    getAvailableDevices,
    transferPlayback,
    getQueue,
    getCurrentPlaybackState,
    seekToPosition
} from './api';
import './spotify.css';

type Tab = 'search' | 'playlists' | 'liked';

function Spotify() {
    const [tokenData, setTokenData] = useState<SpotifyTokenData | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.5);
    const [shuffleOn, setShuffleOn] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

    const [activeTab, setActiveTab] = useState<Tab>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Track[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [playlistsLoading, setPlaylistsLoading] = useState(false);
    const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
    const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);

    const [likedSongs, setLikedSongs] = useState<Track[]>([]);
    const [likedLoading, setLikedLoading] = useState(false);

    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showDevices, setShowDevices] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(false);

    const [showQueue, setShowQueue] = useState(false);
    const [queueTracks, setQueueTracks] = useState<Track[]>([]);
    const [queueLoading, setQueueLoading] = useState(false);

    const playerRef = useRef<Spotify.Player | null>(null);
    const hasExchangedToken = useRef(false);
    const sdkLoaded = useRef(false);
    const positionInterval = useRef<NodeJS.Timeout | null>(null);
    const searchDebounce = useRef<NodeJS.Timeout | null>(null);
    const tokenDataRef = useRef<SpotifyTokenData | null>(null);
    tokenDataRef.current = tokenData;
    const positionRef = useRef(0);
    positionRef.current = position;
    const currentTrackRef = useRef<Track | null>(null);
    currentTrackRef.current = currentTrack;
    const handleTokenRefreshed = useCallback(async (updated: SpotifyTokenData) => {
        setTokenData(updated);
        if (window.electronAPI) {
            await window.electronAPI.saveSpotifyToken(updated);
        }
    }, []);

    const handleLogout = useCallback(async () => {
        if (playerRef.current) {
            playerRef.current.disconnect();
            playerRef.current = null;
        }
        if (window.electronAPI) {
            await window.electronAPI.clearSpotifyToken();
        }
        setTokenData(null);
        setCurrentTrack(null);
        setIsReady(false);
        setDeviceId('');
        sdkLoaded.current = false;
    }, []);

    // Wraps API calls: on auth failure, logs the user out; on other errors, surfaces a message.
    const withErrorHandling = useCallback(
        async (fn: () => Promise<void>, fallbackMessage: string) => {
            try {
                setError(null);
                await fn();
            } catch (err) {
                if (err instanceof SpotifyAuthError) {
                    handleLogout();
                } else {
                    console.error(err);
                    setError(fallbackMessage);
                }
            }
        },
        [handleLogout]
    );

    // Check for saved token, or an incoming auth code, on mount
    useEffect(() => {
        const checkToken = async () => {
            if (window.electronAPI) {
                const saved = await window.electronAPI.getSpotifyToken();
                if (saved) {
                    const valid = await ensureValidToken(saved);
                    if (valid) {
                        setTokenData(valid);
                        if (valid.accessToken !== saved.accessToken) {
                            await window.electronAPI.saveSpotifyToken(valid);
                        }
                        return;
                    }
                    await window.electronAPI.clearSpotifyToken();
                }
            }

            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && !hasExchangedToken.current) {
                hasExchangedToken.current = true;
                const exchanged = await exchangeCodeForToken(code);

                if (exchanged) {
                    setTokenData(exchanged);
                    if (window.electronAPI) {
                        await window.electronAPI.saveSpotifyToken(exchanged);
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    hasExchangedToken.current = false;
                }
            }
        };
        checkToken();
    }, []);

    // Initialize Spotify Web Playback SDK
    useEffect(() => {
        if (!tokenData || sdkLoaded.current) return;

        const initializePlayer = () => {
            // Give this tab/window a stable-but-unique device name, so opening the
            // dashboard in more than one place (browser tab + Electron window, or
            // two Electron windows) doesn't create colliding "same" devices that
            // fight over playback control.
            const instanceId = (() => {
                const existing = window.sessionStorage.getItem('spotify_instance_id');
                if (existing) return existing;
                const generated = Math.random().toString(36).slice(2, 8);
                window.sessionStorage.setItem('spotify_instance_id', generated);
                return generated;
            })();

            const spotifyPlayer = new window.Spotify.Player({
                name: `My Dashboard Player (${instanceId})`,
                getOAuthToken: (cb: (token: string) => void) => {
                    // Always hand the SDK the freshest token we have.
                    cb(tokenDataRef.current?.accessToken || '');
                },
                volume
            });

            spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
                setDeviceId(device_id);
                setIsReady(true);
            });

            spotifyPlayer.addListener('not_ready', () => {
                setIsReady(false);
            });

            spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
                console.error('Initialization error:', message);
                setError('Failed to initialize the player.');
            });

            spotifyPlayer.addListener('authentication_error', async ({ message }: { message: string }) => {
                console.error('Authentication error:', message);
                // Try a refresh before giving up entirely.
                const current = tokenDataRef.current;
                if (current) {
                    const refreshed = await ensureValidToken(current);
                    if (refreshed) {
                        await handleTokenRefreshed(refreshed);
                        return;
                    }
                }
                handleLogout();
            });

            spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
                console.error('Account error (Premium required):', message);
                setError('Spotify Premium is required for playback.');
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenData ? 'has-token' : 'no-token', handleLogout, handleTokenRefreshed]);

    // Smoothly advance the displayed position between state updates
    useEffect(() => {
        if (isPlaying) {
            let tick = 0;
            positionInterval.current = setInterval(async () => {
                tick += 1;
                if (tick % 5 === 0 && playerRef.current) {
                    const state = await playerRef.current.getCurrentState();
                    if (!state) {
                        setIsPlaying(false);
                        return;
                    }
                    setPosition(state.position);
                    setIsPlaying(!state.paused);
                    return;
                }
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

    const seekTo = useCallback((positionMs: number) => {
        playerRef.current?.seek(positionMs);
        setPosition(positionMs);
    }, []);

    const changeVolume = useCallback((newVolume: number) => {
        setVolumeState(newVolume);
        playerRef.current?.setVolume(newVolume);
    }, []);

    const toggleShuffle = useCallback(() => {
        if (!tokenData || !deviceId) return;
        const next = !shuffleOn;
        setShuffleOn(next);
        withErrorHandling(
            () => apiSetShuffle(next, deviceId, tokenData, handleTokenRefreshed),
            'Could not change shuffle.'
        );
    }, [tokenData, deviceId, shuffleOn, withErrorHandling, handleTokenRefreshed]);

    const cycleRepeat = useCallback(() => {
        if (!tokenData || !deviceId) return;
        const order: RepeatMode[] = ['off', 'context', 'track'];
        const next = order[(order.indexOf(repeatMode) + 1) % order.length];
        setRepeatMode(next);
        withErrorHandling(
            () => apiSetRepeat(next, deviceId, tokenData, handleTokenRefreshed),
            'Could not change repeat mode.'
        );
    }, [tokenData, deviceId, repeatMode, withErrorHandling, handleTokenRefreshed]);

    // --- Search ---
    const runSearch = useCallback(
        (query: string) => {
            if (!tokenData || !query.trim()) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            withErrorHandling(async () => {
                const results = await apiSearchTracks(query, tokenData, handleTokenRefreshed);
                setSearchResults(results);
            }, 'Search failed.').finally(() => setIsSearching(false));
        },
        [tokenData, withErrorHandling, handleTokenRefreshed]
    );

    const onSearchQueryChange = useCallback(
        (query: string) => {
            setSearchQuery(query);
            if (searchDebounce.current) clearTimeout(searchDebounce.current);
            searchDebounce.current = setTimeout(() => runSearch(query), 400);
        },
        [runSearch]
    );

    // --- Playlists ---
    const loadPlaylists = useCallback(() => {
        if (!tokenData) return;
        setPlaylistsLoading(true);
        withErrorHandling(async () => {
            const items = await getUserPlaylists(tokenData, handleTokenRefreshed);
            setPlaylists(items);
        }, 'Could not load playlists.').finally(() => setPlaylistsLoading(false));
    }, [tokenData, withErrorHandling, handleTokenRefreshed]);

    const openPlaylist = useCallback(
        (playlist: Playlist) => {
            if (!tokenData) return;
            setActivePlaylist(playlist);
            withErrorHandling(async () => {
                const tracks = await getPlaylistTracks(playlist.id, tokenData, handleTokenRefreshed);
                setPlaylistTracks(tracks);
            }, 'Could not load playlist tracks.');
        },
        [tokenData, withErrorHandling, handleTokenRefreshed]
    );

    const playPlaylist = useCallback(
        (playlist: Playlist) => {
            if (!tokenData) return;
            if (!deviceId || !isReady) {
                setError('Player is still connecting - try again in a moment.');
                return;
            }
            withErrorHandling(
                () => playContextOnDevice(deviceId, playlist.uri, tokenData, handleTokenRefreshed),
                'Could not start playback.'
            );
        },
        [tokenData, deviceId, isReady, withErrorHandling, handleTokenRefreshed]
    );

    // --- Liked songs ---
    const loadLikedSongs = useCallback(() => {
        if (!tokenData) return;
        setLikedLoading(true);
        withErrorHandling(async () => {
            const tracks = await getLikedSongs(tokenData, handleTokenRefreshed);
            setLikedSongs(tracks);
        }, 'Could not load liked songs.').finally(() => setLikedLoading(false));
    }, [tokenData, withErrorHandling, handleTokenRefreshed]);

    useEffect(() => {
        if (!tokenData) return;
        if (activeTab === 'playlists' && playlists.length === 0) loadPlaylists();
        if (activeTab === 'liked' && likedSongs.length === 0) loadLikedSongs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, tokenData]);

    // --- Playback ---
    const playTrack = useCallback(
        (uri: string) => {
            if (!tokenData) return;
            if (!deviceId || !isReady) {
                setError('Player is still connecting - try again in a moment.');
                return;
            }
            withErrorHandling(
                () => playTrackOnDevice(deviceId, uri, tokenData, handleTokenRefreshed),
                'Could not play track.'
            );
        },
        [tokenData, deviceId, isReady, withErrorHandling, handleTokenRefreshed]
    );

    const addToQueue = useCallback(
        (uri: string) => {
            if (!tokenData) return;
            if (!deviceId || !isReady) {
                setError('Player is still connecting - try again in a moment.');
                return;
            }
            withErrorHandling(
                () => apiAddToQueue(uri, deviceId, tokenData, handleTokenRefreshed),
                'Could not add to queue.'
            );
        },
        [tokenData, deviceId, isReady, withErrorHandling, handleTokenRefreshed]
    );

    // --- Devices ---
    const openDevicePicker = useCallback(() => {
        if (!tokenData) return;
        setShowDevices(true);
        setDevicesLoading(true);
        withErrorHandling(async () => {
            const list = await getAvailableDevices(tokenData, handleTokenRefreshed);
            setDevices(list);
        }, 'Could not load devices.').finally(() => setDevicesLoading(false));
    }, [tokenData, withErrorHandling, handleTokenRefreshed]);

    const selectDevice = useCallback(
        (targetDeviceId: string) => {
            if (!tokenData) return;
            const capturedPositionMs = positionRef.current;
            const capturedTrackUri = currentTrackRef.current?.uri || null;

            withErrorHandling(async () => {
                await transferPlayback(targetDeviceId, tokenData, handleTokenRefreshed);

                if (!capturedTrackUri) return;

                for (let attempt = 0; attempt < 10; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, 400));
                    const state = await getCurrentPlaybackState(tokenData, handleTokenRefreshed);
                    if (state?.deviceId === targetDeviceId && state.trackUri === capturedTrackUri) {
                        await seekToPosition(capturedPositionMs, targetDeviceId, tokenData, handleTokenRefreshed);
                        break;
                    }
                }
            }, 'Could not switch device.');

            setShowDevices(false);
        },
        [tokenData, withErrorHandling, handleTokenRefreshed]
    );

    // --- Queue ---
    const openQueue = useCallback(() => {
        if (!tokenData) return;
        setShowQueue(true);
        setQueueLoading(true);
        withErrorHandling(async () => {
            const { queue } = await getQueue(tokenData, handleTokenRefreshed);
            setQueueTracks(queue);
        }, 'Could not load queue.').finally(() => setQueueLoading(false));
    }, [tokenData, withErrorHandling, handleTokenRefreshed]);

    if (!tokenData) {
        return <SpotifyLogin isLoggedIn={false} />;
    }

    return (
        <div className="spotify-container">
            <div className="spotify-header">
                <div className="spotify-header-title">
                    <h2>Spotify</h2>
                    {!isReady && <span className="spotify-status">Connecting...</span>}
                </div>
                <div className="spotify-header-actions">
                    <button className="spotify-header-icon-button" onClick={openQueue} title="Queue">
                        &#9776;
                    </button>
                    <button className="spotify-header-icon-button" onClick={openDevicePicker} title="Devices">
                        &#128266;
                    </button>
                    <SpotifyLogin isLoggedIn={true} onLogout={handleLogout} />
                </div>
            </div>

            {showDevices && (
                <SpotifyDevices
                    devices={devices}
                    loading={devicesLoading}
                    onSelectDevice={selectDevice}
                    onClose={() => setShowDevices(false)}
                />
            )}

            {showQueue && (
                <SpotifyQueue
                    queue={queueTracks}
                    loading={queueLoading}
                    onClose={() => setShowQueue(false)}
                />
            )}

            {error && <div className="spotify-error">{error}</div>}

            <div className="spotify-tabs">
                <button
                    className={`spotify-tab ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => setActiveTab('search')}
                >
                    Search
                </button>
                <button
                    className={`spotify-tab ${activeTab === 'playlists' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('playlists'); setActivePlaylist(null); }}
                >
                    Playlists
                </button>
                <button
                    className={`spotify-tab ${activeTab === 'liked' ? 'active' : ''}`}
                    onClick={() => setActiveTab('liked')}
                >
                    Liked Songs
                </button>
            </div>

            <div className="spotify-content">
                {activeTab === 'search' && (
                    <SpotifySearch
                        searchQuery={searchQuery}
                        onSearchQueryChange={onSearchQueryChange}
                        searchResults={searchResults}
                        isSearching={isSearching}
                        onPlayTrack={playTrack}
                        onAddToQueue={addToQueue}
                    />
                )}

                {activeTab === 'playlists' && !activePlaylist && (
                    <SpotifyPlaylists
                        playlists={playlists}
                        loading={playlistsLoading}
                        onOpenPlaylist={openPlaylist}
                        onPlayPlaylist={playPlaylist}
                    />
                )}

                {activeTab === 'playlists' && activePlaylist && (
                    <div className="spotify-track-list-view">
                        <div className="spotify-track-list-header">
                            <button className="spotify-back-button" onClick={() => setActivePlaylist(null)}>
                                &larr; Back
                            </button>
                            <h3>{activePlaylist.name}</h3>
                            <button
                                className="spotify-play-button"
                                onClick={() => playPlaylist(activePlaylist)}
                            >
                                Play
                            </button>
                        </div>
                        <SpotifySearch
                            searchQuery=""
                            onSearchQueryChange={() => {}}
                            searchResults={playlistTracks}
                            isSearching={false}
                            onPlayTrack={playTrack}
                            onAddToQueue={addToQueue}
                            hideSearchBar
                        />
                    </div>
                )}

                {activeTab === 'liked' && (
                    <SpotifySearch
                        searchQuery=""
                        onSearchQueryChange={() => {}}
                        searchResults={likedSongs}
                        isSearching={likedLoading}
                        onPlayTrack={playTrack}
                        onAddToQueue={addToQueue}
                        hideSearchBar
                    />
                )}
            </div>

            <SpotifyPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                position={position}
                duration={duration}
                volume={volume}
                shuffleOn={shuffleOn}
                repeatMode={repeatMode}
                onTogglePlay={togglePlay}
                onSkipNext={skipNext}
                onSkipPrevious={skipPrevious}
                onSeek={seekTo}
                onVolumeChange={changeVolume}
                onToggleShuffle={toggleShuffle}
                onCycleRepeat={cycleRepeat}
            />
        </div>
    );
}

export default Spotify;