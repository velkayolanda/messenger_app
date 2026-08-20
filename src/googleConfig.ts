export interface GoogleTokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // epoch ms
}

export const GOOGLE_CONFIG = {
    CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
    // TEMPORARY: only needed because the current OAuth client is a "Web application"
    // type, which requires a client_secret on the token exchange even with PKCE.
    // Remove this once swapped to a "Desktop app" client type, which doesn't need one.
    CLIENT_SECRET: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '',
    REDIRECT_URI: 'http://127.0.0.1:3000/oauth-calendar-callback',
    SCOPES: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
    ].join(' ')
};

const EXPIRY_SAFETY_MARGIN_MS = 60 * 1000;

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

export async function getGoogleAuthUrl(): Promise<string> {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.localStorage.setItem('google_code_verifier', codeVerifier);


    const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        response_type: 'code',
        redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
        scope: GOOGLE_CONFIG.SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        access_type: 'offline',
        prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function toTokenData(data: any, fallbackRefreshToken?: string): GoogleTokenData | null {
    if (!data.access_token) return null;

    const expiresInMs = (data.expires_in ?? 3600) * 1000;
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || fallbackRefreshToken || '',
        expiresAt: Date.now() + expiresInMs
    };
}

export async function exchangeGoogleCodeForToken(code: string): Promise<GoogleTokenData | null> {
    const codeVerifier = window.localStorage.getItem('google_code_verifier');



    if (!codeVerifier) {
        console.error('No Google code verifier found');
        return null;
    }

    const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
        code_verifier: codeVerifier
    });

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data = await response.json();
        const tokenData = toTokenData(data);

        if (tokenData) {
            window.localStorage.removeItem('google_code_verifier');
        } else {
            console.error('Google token exchange failed:', data);
        }

        return tokenData;
    } catch (error) {
        console.error('Google token exchange failed:', error);
        return null;
    }
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenData | null> {
    if (!refreshToken) {
        console.error('No Google refresh token available');
        return null;
    }

    const params = new URLSearchParams({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        if (!response.ok) {
            console.error('Google refresh failed with status', response.status);
            return null;
        }

        const data = await response.json();
        return toTokenData(data, refreshToken);
    } catch (error) {
        console.error('Google token refresh failed:', error);
        return null;
    }
}

export function isGoogleTokenExpired(tokenData: GoogleTokenData): boolean {
    return Date.now() >= tokenData.expiresAt - EXPIRY_SAFETY_MARGIN_MS;
}

export async function ensureValidGoogleToken(tokenData: GoogleTokenData): Promise<GoogleTokenData | null> {
    if (!isGoogleTokenExpired(tokenData)) {
        return tokenData;
    }
    return refreshGoogleAccessToken(tokenData.refreshToken);
}