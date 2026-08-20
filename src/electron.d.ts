export interface EmailCredentials {
    email: string;
    password: string;
}

export interface Email {
    id: number;
    subject: string;
    from: string;
    date: Date;
    body: string;
    isRead: boolean;
}

export interface SpotifyTokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // epoch ms
}

export interface GoogleTokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // epoch ms
}

export interface ElectronAPI {
    connectEmail: (credentials: EmailCredentials) => Promise<{ success: boolean; error?: string }>;
    fetchEmails: () => Promise<{ success: boolean; emails?: Email[]; error?: string }>;
    disconnectEmail: () => Promise<{ success: boolean }>;
    saveCredentials: (credentials: EmailCredentials) => Promise<{ success: boolean }>;
    getCredentials: () => Promise<EmailCredentials | null>;
    clearCredentials: () => Promise<{ success: boolean }>;
    saveTimetableId: (id: string) => Promise<{ success: boolean }>;
    getTimetableId: () => Promise<string | null>;
    saveSpotifyToken: (tokenData: SpotifyTokenData) => Promise<{ success: boolean }>;
    getSpotifyToken: () => Promise<SpotifyTokenData | null>;
    clearSpotifyToken: () => Promise<{ success: boolean }>;
    saveTimetableFile: (icsContent: string) => Promise<{ success: boolean; lastModified?: string; error?: string }>;
    readTimetableFile: () => Promise<{ success: boolean; data?: string; lastModified?: string; error?: string }>;
    checkTimetableExists: () => Promise<{ exists: boolean }>;
    saveGoogleToken: (tokenData: GoogleTokenData) => Promise<{ success: boolean }>;
    getGoogleToken: () => Promise<GoogleTokenData | null>;
    clearGoogleToken: () => Promise<{ success: boolean }>;
    saveLocalTodos: (todosJson: string) => Promise<{ success: boolean }>;
    getLocalTodos: () => Promise<string | null>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
        Spotify: typeof Spotify;
        onSpotifyWebPlaybackSDKReady: () => void;
    }
}

declare namespace Spotify {
    interface Player {
        connect(): Promise<boolean>;
        disconnect(): void;
        togglePlay(): Promise<void>;
        nextTrack(): Promise<void>;
        previousTrack(): Promise<void>;
        seek(position_ms: number): Promise<void>;
        setVolume(volume: number): Promise<void>;
        getVolume(): Promise<number>;
        getCurrentState(): Promise<PlaybackState | null>;
        addListener(event: 'ready', callback: (state: { device_id: string }) => void): void;
        addListener(event: 'not_ready', callback: (state: { device_id: string }) => void): void;
        addListener(event: 'player_state_changed', callback: (state: PlaybackState | null) => void): void;
        addListener(event: 'initialization_error', callback: (error: { message: string }) => void): void;
        addListener(event: 'authentication_error', callback: (error: { message: string }) => void): void;
        addListener(event: 'account_error', callback: (error: { message: string }) => void): void;
        addListener(event: 'playback_error', callback: (error: { message: string }) => void): void;
        removeListener(event: string, callback?: Function): void;
    }

    interface PlayerOptions {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
    }

    interface PlaybackState {
        paused: boolean;
        position: number;
        duration: number;
        track_window: {
            current_track: WebPlaybackTrack;
            previous_tracks: WebPlaybackTrack[];
            next_tracks: WebPlaybackTrack[];
        };
    }

    interface WebPlaybackTrack {
        uri: string;
        id: string;
        type: string;
        media_type: string;
        name: string;
        is_playable: boolean;
        album: {
            uri: string;
            name: string;
            images: { url: string; height: number; width: number }[];
        };
        artists: { uri: string; name: string }[];
    }

    const Player: {
        new(options: PlayerOptions): Player;
    };
}