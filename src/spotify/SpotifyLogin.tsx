import React from 'react';
import { getAuthUrl } from '../spotifyConfig';

interface SpotifyLoginProps {
    onLogout?: () => void;
    isLoggedIn: boolean;
}

function SpotifyLogin({ onLogout, isLoggedIn }: SpotifyLoginProps) {
    const handleLogin = () => {
        window.location.href = getAuthUrl();
    };

    if (isLoggedIn && onLogout) {
        return (
            <button
                onClick={onLogout}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Logout
            </button>
        );
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <h2>Connect to Spotify</h2>
            <p style={{ color: '#666' }}>Note: Spotify Premium is required for playback</p>
            <button
                onClick={handleLogin}
                style={{
                    padding: '15px 30px',
                    backgroundColor: '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                Login with Spotify
            </button>
        </div>
    );
}

export default SpotifyLogin;