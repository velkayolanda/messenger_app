import React from 'react';
import { getAuthUrl } from '../spotifyConfig';

interface SpotifyLoginProps {
    onLogout?: () => void;
    isLoggedIn: boolean;
}

function SpotifyLogin({ onLogout, isLoggedIn }: SpotifyLoginProps) {
    const handleLogin = async () => {
        const authUrl = await getAuthUrl();
        window.location.href = authUrl;
    };

    if (isLoggedIn && onLogout) {
        return (
            <button className="spotify-logout-button" onClick={onLogout}>
                Logout
            </button>
        );
    }

    return (
        <div className="spotify-login-screen">
            <h2>Connect to Spotify</h2>
            <p className="spotify-login-note">Note: Spotify Premium is required for playback</p>
            <button className="spotify-login-button" onClick={handleLogin}>
                Login with Spotify
            </button>
        </div>
    );
}

export default SpotifyLogin;