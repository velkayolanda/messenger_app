import React, { useState, useEffect, useCallback } from 'react';
import { useSpotifyPlayer } from '../spotify/SpotifyPlayerContext';
import SpotifyDevices from '../spotify/SpotifyDevices';
import {
    getCurrentPlaybackState,
    resumePlaybackOnDevice,
    pausePlaybackOnDevice,
    skipNextOnDevice,
    skipPreviousOnDevice,
    seekToPosition
} from '../spotify/api';
import { Track } from '../spotify/types';
import './spotifyBar.css';

const DEVICE_POLL_INTERVAL_MS = 10 * 1000;
const REMOTE_STATE_POLL_INTERVAL_MS = 5 * 1000;

function formatTime(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SpotifyBar() {
    const {
        tokenData,
        isReady,
        deviceId,
        currentTrack,
        isPlaying,
        position,
        duration,
        volume,
        devices,
        devicesLoading,
        togglePlay,
        skipNext,
        skipPrevious,
        seekTo,
        changeVolume,
        loadDevices,
        selectDevice,
        handleTokenRefreshed,
        withErrorHandling
    } = useSpotifyPlayer();

    const [showDevices, setShowDevices] = useState(false);

    const [remoteTrack, setRemoteTrack] = useState<Track | null>(null);
    const [remotePosition, setRemotePosition] = useState(0);
    const [remoteDuration, setRemoteDuration] = useState(0);
    const [remoteIsPlaying, setRemoteIsPlaying] = useState(false);

    useEffect(() => {
        if (!tokenData) return;
        loadDevices();
        const interval = setInterval(loadDevices, DEVICE_POLL_INTERVAL_MS);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenData]);

    const activeDevice = devices.find(d => d.is_active);
    const isPlayingHere = !activeDevice || activeDevice.id === deviceId;

    const refreshRemoteState = useCallback(async () => {
        if (!tokenData) return;
        try {
            const state = await getCurrentPlaybackState(tokenData, handleTokenRefreshed);
            if (state) {
                setRemoteTrack(state.track);
                setRemotePosition(state.positionMs);
                setRemoteDuration(state.durationMs);
                setRemoteIsPlaying(state.isPlaying);
            }
        } catch {
            // Best-effort - leave previous remote state showing rather than clearing it.
        }
    }, [tokenData, handleTokenRefreshed]);

    useEffect(() => {
        if (!tokenData || isPlayingHere) return;

        let cancelled = false;
        const poll = async () => {
            if (!cancelled) await refreshRemoteState();
        };

        poll();
        const interval = setInterval(poll, REMOTE_STATE_POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [tokenData, isPlayingHere, refreshRemoteState]);

    if (!tokenData) return null;

    const displayTrack = isPlayingHere ? currentTrack : remoteTrack;
    const displayPosition = isPlayingHere ? position : remotePosition;
    const displayDuration = isPlayingHere ? duration : remoteDuration;
    const displayIsPlaying = isPlayingHere ? isPlaying : remoteIsPlaying;

    const handleTogglePlay = () => {
        if (isPlayingHere) {
            togglePlay();
            return;
        }
        if (!activeDevice?.id) return;
        const wasPlaying = remoteIsPlaying;
        setRemoteIsPlaying(!wasPlaying);
        withErrorHandling(async () => {
            if (wasPlaying) {
                await pausePlaybackOnDevice(activeDevice.id!, tokenData, handleTokenRefreshed);
            } else {
                await resumePlaybackOnDevice(activeDevice.id!, tokenData, handleTokenRefreshed);
            }
            setTimeout(refreshRemoteState, 500);
        }, 'Could not control playback on that device.');
    };

    const handleSkipNext = () => {
        if (isPlayingHere) {
            skipNext();
            return;
        }
        if (!activeDevice?.id) return;
        withErrorHandling(async () => {
            await skipNextOnDevice(activeDevice.id!, tokenData, handleTokenRefreshed);
            setTimeout(refreshRemoteState, 500);
        }, 'Could not skip on that device.');
    };

    const handleSkipPrevious = () => {
        if (isPlayingHere) {
            skipPrevious();
            return;
        }
        if (!activeDevice?.id) return;
        withErrorHandling(async () => {
            await skipPreviousOnDevice(activeDevice.id!, tokenData, handleTokenRefreshed);
            setTimeout(refreshRemoteState, 500);
        }, 'Could not skip on that device.');
    };

    const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!displayDuration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const targetMs = Math.round(ratio * displayDuration);

        if (isPlayingHere) {
            seekTo(targetMs);
            return;
        }
        if (!activeDevice?.id) return;
        setRemotePosition(targetMs);
        withErrorHandling(async () => {
            await seekToPosition(targetMs, activeDevice.id!, tokenData, handleTokenRefreshed);
            setTimeout(refreshRemoteState, 500);
        }, 'Could not seek on that device.');
    };

    const openDevicePicker = () => {
        setShowDevices(true);
        loadDevices();
    };

    const progressPct = displayDuration ? (displayPosition / displayDuration) * 100 : 0;

    return (
        <div className="spotify-bar">
            {showDevices && (
                <SpotifyDevices
                    devices={devices}
                    loading={devicesLoading}
                    onSelectDevice={(id) => { selectDevice(id); setShowDevices(false); }}
                    onClose={() => setShowDevices(false)}
                />
            )}

            <div className="spotify-bar-track">
                {displayTrack ? (
                    <>
                        <img
                            src={displayTrack.album.images[displayTrack.album.images.length - 1]?.url}
                            alt={displayTrack.name}
                            className="spotify-bar-artwork"
                        />
                        <div className="spotify-bar-meta">
                            <div className="spotify-bar-title">{displayTrack.name}</div>
                            <div className="spotify-bar-artist">
                                {displayTrack.artists.map(a => a.name).join(', ')}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="spotify-bar-meta">
                        <div className="spotify-bar-title">{isReady ? 'Nothing playing' : 'Connecting...'}</div>
                    </div>
                )}
            </div>

            <div className="spotify-bar-center">
                <div className="spotify-bar-controls">
                    <button className="spotify-bar-icon-button" onClick={handleSkipPrevious} aria-label="Previous">
                        &#9198;
                    </button>
                    <button
                        className="spotify-bar-play-pause"
                        onClick={handleTogglePlay}
                        aria-label={displayIsPlaying ? 'Pause' : 'Play'}
                    >
                        {displayIsPlaying ? '\u23F8' : '\u25B6'}
                    </button>
                    <button className="spotify-bar-icon-button" onClick={handleSkipNext} aria-label="Next">
                        &#9197;
                    </button>
                </div>
                <div className="spotify-bar-progress-row">
                    <span className="spotify-bar-time">{formatTime(displayPosition)}</span>
                    <div className="spotify-bar-progress-bar" onClick={handleSeekClick}>
                        <div className="spotify-bar-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="spotify-bar-time">{formatTime(displayDuration)}</span>
                </div>
            </div>

            <div className="spotify-bar-right">
                <button
                    className={`spotify-bar-device-button ${!isPlayingHere ? 'elsewhere' : ''}`}
                    onClick={openDevicePicker}
                    title="Devices"
                >
                    {isPlayingHere ? '\uD83D\uDD0A' : '\uD83D\uDCF1'}
                    <span className="spotify-bar-device-name">
                        {isPlayingHere ? 'This app' : `Playing on ${activeDevice?.name || 'another device'}`}
                    </span>
                </button>
                <div className="spotify-bar-volume">
                    <span className="spotify-bar-volume-icon">{volume === 0 ? '\uD83D\uDD07' : '\uD83D\uDD0A'}</span>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) => changeVolume(Number(e.target.value))}
                        className="spotify-bar-volume-slider"
                        aria-label="Volume"
                    />
                </div>
            </div>
        </div>
    );
}

export default SpotifyBar;