import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Playlist, Track } from './types';
import SpotifyLogin from './SpotifyLogin';
import SpotifySearch from './SpotifySearch';
import SpotifyPlayer from './SpotifyPlayer';
import SpotifyPlaylists from './SpotifyPlaylists';
import SpotifyDevices from './SpotifyDevices';
import SpotifyQueue from './SpotifyQueue';
import { useSpotifyPlayer } from './SpotifyPlayerContext';
import {
    searchTracks as apiSearchTracks,
    getUserPlaylists,
    getPlaylistTracks,
    getLikedSongs,
    playTrackOnDevice,
    playContextOnDevice,
    addToQueue as apiAddToQueue,
    getQueue
} from './api';
import './spotify.css';

type Tab = 'search' | 'playlists' | 'liked';

function Spotify() {
    const {
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
    } = useSpotifyPlayer();

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

    const [showDevices, setShowDevices] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [queueTracks, setQueueTracks] = useState<Track[]>([]);
    const [queueLoading, setQueueLoading] = useState(false);

    const searchDebounce = useRef<NodeJS.Timeout | null>(null);

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
            if (!deviceId || !isReady) return;
            withErrorHandling(
                () => playContextOnDevice(deviceId, playlist.uri, tokenData, handleTokenRefreshed),
                'Could not start playback.'
            );
        },
        [tokenData, deviceId, isReady, withErrorHandling, handleTokenRefreshed]
    );

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

    const playTrack = useCallback(
        (uri: string) => {
            if (!tokenData) return;
            if (!deviceId || !isReady) return;
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
            if (!deviceId || !isReady) return;
            withErrorHandling(
                () => apiAddToQueue(uri, deviceId, tokenData, handleTokenRefreshed),
                'Could not add to queue.'
            );
        },
        [tokenData, deviceId, isReady, withErrorHandling, handleTokenRefreshed]
    );

    const openDevicePicker = useCallback(() => {
        setShowDevices(true);
        loadDevices();
    }, [loadDevices]);

    const handleSelectDevice = useCallback(
        (targetDeviceId: string) => {
            selectDevice(targetDeviceId);
            setShowDevices(false);
        },
        [selectDevice]
    );

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
                    <SpotifyLogin isLoggedIn={true} onLogout={logout} />
                </div>
            </div>

            {showDevices && (
                <SpotifyDevices
                    devices={devices}
                    loading={devicesLoading}
                    onSelectDevice={handleSelectDevice}
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