import React from 'react';
import { Track } from './types';

interface SpotifyPlayerProps {
    currentTrack: Track | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    onTogglePlay: () => void;
    onSkipNext: () => void;
    onSkipPrevious: () => void;
}

function SpotifyPlayer({
                           currentTrack,
                           isPlaying,
                           position,
                           duration,
                           onTogglePlay,
                           onSkipNext,
                           onSkipPrevious
                       }: SpotifyPlayerProps) {

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!currentTrack) {
        return (
            <div style={{
                backgroundColor: '#282828',
                padding: '20px',
                borderRadius: '8px',
                color: 'white',
                textAlign: 'center'
            }}>
                <p style={{ color: '#b3b3b3' }}>Search and play a song to get started</p>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#282828',
            padding: '20px',
            borderRadius: '8px',
            color: 'white'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <img
                    src={currentTrack.album.images[0]?.url}
                    alt={currentTrack.name}
                    style={{ width: '60px', height: '60px', borderRadius: '4px' }}
                />
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{currentTrack.name}</div>
                    <div style={{ fontSize: '14px', color: '#b3b3b3' }}>
                        {currentTrack.artists.map(a => a.name).join(', ')}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: '15px' }}>
                <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#404040',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${(position / duration) * 100}%`,
                        height: '100%',
                        backgroundColor: '#1DB954'
                    }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px', color: '#b3b3b3' }}>
                    <span>{formatTime(position)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <button
                    onClick={onSkipPrevious}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#404040',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer'
                    }}
                >
                    ⏮️ Previous
                </button>
                <button
                    onClick={onTogglePlay}
                    style={{
                        padding: '10px 30px',
                        backgroundColor: '#1DB954',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                    onClick={onSkipNext}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#404040',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: 'pointer'
                    }}
                >
                    Next ⏭️
                </button>
            </div>
        </div>
    );
}

export default SpotifyPlayer;