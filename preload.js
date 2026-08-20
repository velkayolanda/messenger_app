const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Email functions
    connectEmail: (credentials) => ipcRenderer.invoke('email_unused:connect', credentials),
    fetchEmails: () => ipcRenderer.invoke('email_unused:fetch'),
    disconnectEmail: () => ipcRenderer.invoke('email_unused:disconnect'),

    // Storage functions
    saveCredentials: (credentials) => ipcRenderer.invoke('storage:save', credentials),
    getCredentials: () => ipcRenderer.invoke('storage:get'),
    clearCredentials: () => ipcRenderer.invoke('storage:clear'),

    saveTimetableId: (id) => ipcRenderer.invoke('storage:saveTimetableId', id),
    getTimetableId: () => ipcRenderer.invoke('storage:getTimetableId'),
    saveSpotifyToken: (token) => ipcRenderer.invoke('storage:saveSpotifyToken', token),
    getSpotifyToken: () => ipcRenderer.invoke('storage:getSpotifyToken'),
    clearSpotifyToken: () => ipcRenderer.invoke('storage:clearSpotifyToken'),
    saveTimetableFile: (icsContent) => ipcRenderer.invoke('fs:saveTimetableFile', icsContent),
    readTimetableFile: () => ipcRenderer.invoke('fs:readTimetableFile'),
    checkTimetableExists: () => ipcRenderer.invoke('fs:checkTimetableExists'),

    saveGoogleToken: (tokenData) => ipcRenderer.invoke('storage:saveGoogleToken', tokenData),
    getGoogleToken: () => ipcRenderer.invoke('storage:getGoogleToken'),
    clearGoogleToken: () => ipcRenderer.invoke('storage:clearGoogleToken'),

    saveLocalTodos: (todosJson) => ipcRenderer.invoke('storage:saveLocalTodos', todosJson),
    getLocalTodos: () => ipcRenderer.invoke('storage:getLocalTodos'),
});