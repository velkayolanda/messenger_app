export interface Track {
    id?: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[]; name?: string };
    duration_ms: number;
    uri: string;
}

export interface Playlist {
    id: string;
    name: string;
    description: string;
    images: { url: string }[] | null;
    tracks: { total: number } | null;
    uri: string;
    owner: { display_name: string };
}

export type RepeatMode = 'off' | 'context' | 'track';

export interface Device {
    id: string | null;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    type: string; // "Computer" | "Smartphone" | "Speaker" | ...
    volume_percent: number | null;
}

export interface SpotifyPlayerState {
    token: string | null;
    player: Spotify.Player | null;
    deviceId: string;
    currentTrack: Track | null;
    isPlaying: boolean;
    position: number;
    duration: number;
}