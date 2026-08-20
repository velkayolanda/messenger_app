import { SpotifyTokenData } from '../electron.d';
import { ensureValidToken } from '../spotifyConfig';
import { Device, Playlist, Track } from './types';

const BASE_URL = 'https://api.spotify.com/v1';

export class SpotifyAuthError extends Error {
    constructor() {
        super('Spotify authentication expired');
        this.name = 'SpotifyAuthError';
    }
}

interface RequestOptions extends RequestInit {
    // if true, don't throw on non-2xx (caller checks response.ok itself)
    allowNonOk?: boolean;
}

/**
 * Wraps fetch to the Spotify API. Ensures the token is fresh before every call
 * and persists any refreshed token back to electron storage via onTokenRefreshed.
 * Throws SpotifyAuthError if the token cannot be refreshed (caller should log out).
 */
export async function spotifyFetch(
    path: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (tokenData: SpotifyTokenData) => void,
    options: RequestOptions = {},
    _isRetry = false
): Promise<Response> {
    const validToken = await ensureValidToken(tokenData);
    if (!validToken) {
        throw new SpotifyAuthError();
    }
    if (validToken.accessToken !== tokenData.accessToken) {
        onTokenRefreshed(validToken);
    }

    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${validToken.accessToken}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });

    if (response.status === 401) {
        if (_isRetry) {
            throw new SpotifyAuthError();
        }
        const { refreshAccessToken } = await import('../spotifyConfig');
        const refreshed = await refreshAccessToken(validToken.refreshToken);
        if (!refreshed) {
            throw new SpotifyAuthError();
        }
        onTokenRefreshed(refreshed);
        return spotifyFetch(path, refreshed, onTokenRefreshed, options, true);
    }

    return response;
}

export async function searchTracks(
    query: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<Track[]> {
    const response = await spotifyFetch(
        `/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
        tokenData,
        onTokenRefreshed
    );
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    return data.tracks?.items || [];
}

export async function getUserPlaylists(
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<Playlist[]> {
    const response = await spotifyFetch('/me/playlists?limit=50', tokenData, onTokenRefreshed);
    if (!response.ok) throw new Error('Failed to load playlists');
    const data = await response.json();
    return data.items || [];
}

export async function getPlaylistTracks(
    playlistId: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<Track[]> {
    const allTracks: Track[] = [];
    let url: string | null = `/playlists/${playlistId}/tracks?limit=100`;

    while (url) {
        const response: Response = await spotifyFetch(url, tokenData, onTokenRefreshed);
        if (!response.ok) throw new Error('Failed to load playlist tracks');
        const data = await response.json();

        const pageTracks = (data.items || [])
            .map((item: any) => item.track)
            .filter((track: any): track is Track => Boolean(track));
        allTracks.push(...pageTracks);

        url = data.next || null;
    }

    return allTracks;
}

export async function getLikedSongs(
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<Track[]> {
    const allTracks: Track[] = [];
    let url: string | null = '/me/tracks?limit=50';

    while (url) {
        const response: Response = await spotifyFetch(url, tokenData, onTokenRefreshed);
        if (!response.ok) throw new Error('Failed to load liked songs');
        const data = await response.json();

        const pageTracks = (data.items || [])
            .map((item: any) => item.track)
            .filter((track: any): track is Track => Boolean(track));
        allTracks.push(...pageTracks);

        url = data.next || null;
    }

    return allTracks;
}

export async function playTrackOnDevice(
    deviceId: string,
    uri: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(`/me/player/play?device_id=${deviceId}`, tokenData, onTokenRefreshed, {
        method: 'PUT',
        body: JSON.stringify({ uris: [uri] })
    });
}

export async function playContextOnDevice(
    deviceId: string,
    contextUri: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(`/me/player/play?device_id=${deviceId}`, tokenData, onTokenRefreshed, {
        method: 'PUT',
        body: JSON.stringify({ context_uri: contextUri })
    });
}

export async function addToQueue(
    uri: string,
    deviceId: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(
        `/me/player/queue?uri=${encodeURIComponent(uri)}&device_id=${deviceId}`,
        tokenData,
        onTokenRefreshed,
        { method: 'POST' }
    );
}

export async function setShuffle(
    state: boolean,
    deviceId: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(
        `/me/player/shuffle?state=${state}&device_id=${deviceId}`,
        tokenData,
        onTokenRefreshed,
        { method: 'PUT' }
    );
}

export async function setRepeat(
    state: 'off' | 'context' | 'track',
    deviceId: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(
        `/me/player/repeat?state=${state}&device_id=${deviceId}`,
        tokenData,
        onTokenRefreshed,
        { method: 'PUT' }
    );
}

export async function toggleLikedSong(
    trackId: string,
    liked: boolean,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(`/me/tracks?ids=${trackId}`, tokenData, onTokenRefreshed, {
        method: liked ? 'PUT' : 'DELETE'
    });
}

export async function checkLikedSongs(
    trackIds: string[],
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<boolean[]> {
    if (trackIds.length === 0) return [];
    const response = await spotifyFetch(
        `/me/tracks/contains?ids=${trackIds.join(',')}`,
        tokenData,
        onTokenRefreshed
    );
    if (!response.ok) return trackIds.map(() => false);
    return response.json();
}
export async function getAvailableDevices(
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<Device[]> {
    const response = await spotifyFetch('/me/player/devices', tokenData, onTokenRefreshed);
    if (!response.ok) throw new Error('Failed to load devices');
    const data = await response.json();
    return data.devices || [];
}

export async function transferPlayback(
    deviceId: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void,
    play: boolean = true
): Promise<void> {
    await spotifyFetch('/me/player', tokenData, onTokenRefreshed, {
        method: 'PUT',
        body: JSON.stringify({ device_ids: [deviceId], play })
    });
}

export async function getQueue(
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<{ currentlyPlaying: Track | null; queue: Track[] }> {
    const response = await spotifyFetch('/me/player/queue', tokenData, onTokenRefreshed);
    if (!response.ok) throw new Error('Failed to load queue');
    const data = await response.json();
    return {
        currentlyPlaying: data.currently_playing || null,
        queue: data.queue || []
    };
}
export interface PlaybackState {
    deviceId: string | null;
    isPlaying: boolean;
    trackUri: string | null;
    positionMs: number;
}

export async function getCurrentPlaybackState(
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<PlaybackState | null> {
    const response = await spotifyFetch('/me/player', tokenData, onTokenRefreshed);
    // 204 means nothing is currently playing anywhere.
    if (response.status === 204) return null;
    if (!response.ok) throw new Error('Failed to load playback state');
    const data = await response.json();
    if (!data) return null;
    return {
        deviceId: data.device?.id || null,
        isPlaying: Boolean(data.is_playing),
        trackUri: data.item?.uri || null,
        positionMs: data.progress_ms || 0
    };
}

export async function seekToPosition(
    positionMs: number,
    deviceId: string,
    tokenData: SpotifyTokenData,
    onTokenRefreshed: (t: SpotifyTokenData) => void
): Promise<void> {
    await spotifyFetch(
        `/me/player/seek?position_ms=${Math.round(positionMs)}&device_id=${deviceId}`,
        tokenData,
        onTokenRefreshed,
        { method: 'PUT' }
    );
}