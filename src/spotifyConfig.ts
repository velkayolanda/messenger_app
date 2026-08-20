import { SpotifyTokenData } from './electron.d';

export const SPOTIFY_CONFIG = {
    CLIENT_ID: process.env.REACT_APP_SPOTIFY_CLIENT_ID || '',
    REDIRECT_URI: 'http://127.0.0.1:3000/callback',
    SCOPES: [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-recently-played',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative'
    ].join(' ')
};

// How long before actual expiry we treat the token as "expired" and refresh it.
const EXPIRY_SAFETY_MARGIN_MS = 60 * 1000;

// Generate code verifier and challenge for PKCE
function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
    // @ts-ignore
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

export async function getAuthUrl(): Promise<string> {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        scope: SPOTIFY_CONFIG.SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function toTokenData(data: any, fallbackRefreshToken?: string): SpotifyTokenData | null {
    if (!data.access_token) return null;

    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    return {
        accessToken: data.access_token,
        // Spotify doesn't always return a new refresh_token; keep the old one if absent.
        refreshToken: data.refresh_token || fallbackRefreshToken || '',
        expiresAt: Date.now() + expiresInMs
    };
}

export async function exchangeCodeForToken(code: string): Promise<SpotifyTokenData | null> {
    const codeVerifier = window.localStorage.getItem('code_verifier');

    if (!codeVerifier) {
        console.error('No code verifier found');
        return null;
    }

    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        code_verifier: codeVerifier
    });

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data = await response.json();
        const tokenData = toTokenData(data);

        if (tokenData) {
            window.localStorage.removeItem('code_verifier');
        }

        return tokenData;
    } catch (error) {
        console.error('Token exchange failed:', error);
        return null;
    }
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenData | null> {
    if (!refreshToken) {
        console.error('No refresh token available');
        return null;
    }

    const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        if (!response.ok) {
            console.error('Refresh failed with status', response.status);
            return null;
        }

        const data = await response.json();
        return toTokenData(data, refreshToken);
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

export function isTokenExpired(tokenData: SpotifyTokenData): boolean {
    return Date.now() >= tokenData.expiresAt - EXPIRY_SAFETY_MARGIN_MS;
}

// Ensures a token is valid, refreshing it if needed. Returns the (possibly refreshed)
// token data, or null if refresh failed and the user needs to log in again.
export async function ensureValidToken(tokenData: SpotifyTokenData): Promise<SpotifyTokenData | null> {
    if (!isTokenExpired(tokenData)) {
        return tokenData;
    }
    return refreshAccessToken(tokenData.refreshToken);
}