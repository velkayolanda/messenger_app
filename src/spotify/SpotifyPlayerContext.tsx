import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Device, RepeatMode, Track } from './types';
import { SpotifyTokenData } from '../electron.d';
import { exchangeCodeForToken, ensureValidToken } from '../spotifyConfig';
import {
    SpotifyAuthError,
    setShuffle as apiSetShuffle,
    setRepeat as apiSetRepeat,
    getAvailableDevices,
    transferPlayback,
    getCurrentPlaybackState,
    seekToPosition
} from './api';

interface SpotifyPlayerContextValue {
    tokenData: SpotifyTokenData | null;
    isReady: boolean;
    deviceId: string;
    currentTrack: Track | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    volume: number;
    shuffleOn: boolean;
    repeatMode: RepeatMode;
    error: string | null;

    devices: Device[];
    devicesLoading: boolean;

    login: () => void;
    logout: () => void;
    togglePlay: () => void;
    skipNext: () => void;
    skipPrevious: () => void;
    seekTo: (positionMs: number) => void;
    changeVolume: (volume: number) => void;
    toggleShuffle: () => void;
    cycleRepeat: () => void;
    loadDevices: () => void;
    selectDevice: (deviceId: string) => void;
    handleTokenRefreshed: (updated: SpotifyTokenData) => Promise<void>;
    withErrorHandling: (fn: () => Promise<void>, fallbackMessage: string) => Promise<void>;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextValue | null>(null);

export function useSpotifyPlayer(): SpotifyPlayerContextValue {
    const ctx = useContext(SpotifyPlayerContext);
    if (!ctx) {
        throw new Error('useSpotifyPlayer must be used within a SpotifyPlayerProvider');
    }
    return ctx;
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
    const [tokenData, setTokenData] = useState<SpotifyTokenData | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.5);
    const [shuffleOn, setShuffleOn] = useState(false);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [devices, setDevices] = useState<Device[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(false);

    const playerRef = useRef<Spotify.Player | null>(null);
    const hasExchangedToken = useRef(false);
    const sdkLoaded = useRef(false);
    const positionInterval = useRef<NodeJS.Timeout | null>(null);
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

    const logout = useCallback(async () => {
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

    const withErrorHandling = useCallback(
        async (fn: () => Promise<void>, fallbackMessage: string) => {
            try {
                setError(null);
                await fn();
            } catch (err) {
                if (err instanceof SpotifyAuthError) {
                    logout();
                } else {
                    console.error(err);
                    setError(fallbackMessage);
                }
            }
        },
        [logout]
    );

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

    useEffect(() => {
        if (!tokenData || sdkLoaded.current) return;

        const initializePlayer = () => {
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
                const current = tokenDataRef.current;
                if (current) {
                    const refreshed = await ensureValidToken(current);
                    if (refreshed) {
                        await handleTokenRefreshed(refreshed);
                        return;
                    }
                }
                logout();
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
    }, [tokenData ? 'has-token' : 'no-token', logout, handleTokenRefreshed]);

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

    const loadDevices = useCallback(() => {
        if (!tokenData) return;
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
        },
        [tokenData, withErrorHandling, handleTokenRefreshed]
    );

    const login = useCallback(() => {
        import('../spotifyConfig').then(({ getAuthUrl }) => {
            getAuthUrl().then(url => {
                window.location.href = url;
            });
        });
    }, []);

    const value: SpotifyPlayerContextValue = {
        tokenData,
        isReady,
        deviceId,
        currentTrack,
        isPlaying,
        position,
        duration,
        volume,
        shuffleOn,
        repeatMode,
        error,
        devices,
        devicesLoading,
        login,
        logout,
        togglePlay,
        skipNext,
        skipPrevious,
        seekTo,
        changeVolume,
        toggleShuffle,
        cycleRepeat,
        loadDevices,
        selectDevice,
        handleTokenRefreshed,
        withErrorHandling
    };

    return <SpotifyPlayerContext.Provider value={value}>{children}</SpotifyPlayerContext.Provider>;
}