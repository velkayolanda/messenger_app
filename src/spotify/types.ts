export interface Track {
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
    duration_ms: number;
    uri: string;
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