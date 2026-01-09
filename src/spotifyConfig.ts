export const SPOTIFY_CONFIG = {
    CLIENT_ID: process.env.REACT_APP_SPOTIFY_CLIENT_ID || '',
    REDIRECT_URI: 'http://localhost:3000/callback',
    SCOPES: [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-library-read',
        'playlist-read-private'
    ].join(' ')
};

export const getAuthUrl = () => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        response_type: 'token',
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        scope: SPOTIFY_CONFIG.SCOPES
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
};