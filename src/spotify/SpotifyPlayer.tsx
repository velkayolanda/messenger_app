import React from 'react';
import { Track, RepeatMode } from './types';

interface SpotifyPlayerProps {
    currentTrack: Track | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    volume: number;
    shuffleOn: boolean;
    repeatMode: RepeatMode;
    onTogglePlay: () => void;
    onSkipNext: () => void;
    onSkipPrevious: () => void;
    onSeek: (positionMs: number) => void;
    onVolumeChange: (volume: number) => void;
    onToggleShuffle: () => void;
    onCycleRepeat: () => void;
}

function formatTime(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SpotifyPlayer({
                           currentTrack,
                           isPlaying,
                           position,
                           duration,
                           volume,
                           shuffleOn,
                           repeatMode,
                           onTogglePlay,
                           onSkipNext,
                           onSkipPrevious,
                           onSeek,
                           onVolumeChange,
                           onToggleShuffle,
                           onCycleRepeat
                       }: SpotifyPlayerProps) {
    const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        onSeek(Math.round(ratio * duration));
    };

    if (!currentTrack) {
        return (
            <div className="spotify-player spotify-player-empty">
                <p>Search and play a song to get started</p>
            </div>
        );
    }

    const progressPct = duration ? (position / duration) * 100 : 0;

    return (
        <div className="spotify-player">
            <div className="spotify-player-track-info">
                <img
                    src={currentTrack.album.images[0]?.url}
                    alt={currentTrack.name}
                    className="spotify-player-artwork"
                />
                <div className="spotify-player-meta">
                    <div className="spotify-player-track-name">{currentTrack.name}</div>
                    <div className="spotify-player-artist-name">
                        {currentTrack.artists.map(a => a.name).join(', ')}
                    </div>
                </div>
                <div className="spotify-player-volume">
                    <span className="spotify-volume-icon">{volume === 0 ? '\uD83D\uDD07' : '\uD83D\uDD0A'}</span>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) => onVolumeChange(Number(e.target.value))}
                        className="spotify-volume-slider"
                        aria-label="Volume"
                    />
                </div>
            </div>

            <div className="spotify-progress-row">
                <span className="spotify-time">{formatTime(position)}</span>
                <div className="spotify-progress-bar" onClick={handleSeekClick}>
                    <div className="spotify-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="spotify-time">{formatTime(duration)}</span>
            </div>

            <div className="spotify-controls-row">
                <button
                    className={`spotify-icon-button ${shuffleOn ? 'active' : ''}`}
                    onClick={onToggleShuffle}
                    aria-label="Shuffle"
                    title="Shuffle"
                >
                    &#128256;
                </button>
                <button className="spotify-icon-button" onClick={onSkipPrevious} aria-label="Previous">
                    &#9198;
                </button>
                <button className="spotify-play-pause" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? '\u23F8' : '\u25B6'}
                </button>
                <button className="spotify-icon-button" onClick={onSkipNext} aria-label="Next">
                    &#9197;
                </button>
                <button
                    className={`spotify-icon-button ${repeatMode !== 'off' ? 'active' : ''}`}
                    onClick={onCycleRepeat}
                    aria-label="Repeat"
                    title={`Repeat: ${repeatMode}`}
                >
                    {repeatMode === 'track' ? '\uD83D\uDD01\uFE0F1' : '\uD83D\uDD01'}
                </button>
            </div>
        </div>
    );
}

export default SpotifyPlayer;