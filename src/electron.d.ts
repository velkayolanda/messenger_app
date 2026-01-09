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

export interface ElectronAPI {
    connectEmail: (credentials: EmailCredentials) => Promise<{ success: boolean; error?: string }>;
    fetchEmails: () => Promise<{ success: boolean; emails?: Email[]; error?: string }>;
    disconnectEmail: () => Promise<{ success: boolean }>;
    saveCredentials: (credentials: EmailCredentials) => Promise<{ success: boolean }>;
    getCredentials: () => Promise<EmailCredentials | null>;
    clearCredentials: () => Promise<{ success: boolean }>;
    saveTimetableId: (id: string) => Promise<{ success: boolean }>;
    getTimetableId: () => Promise<string | null>;
    saveSpotifyToken: (token: string) => Promise<{ success: boolean }>;
    getSpotifyToken: () => Promise<string | null>;
    clearSpotifyToken: () => Promise<{ success: boolean }>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}