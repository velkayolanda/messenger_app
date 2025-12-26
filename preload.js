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
});