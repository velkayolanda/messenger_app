const { app, BrowserWindow, components } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;
const { ipcMain } = require('electron');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const Store = require('electron-store').default;
const store = new Store({ name: 'email-credentials' });
let imapConnection = null;
const fs = require('fs');

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

let mainWindow;

async function createWindow() {
    // Wait for Widevine CDM to be ready (Castlabs Electron)
    await components.whenReady();
    console.log('Widevine CDM ready:', components.status());

    mainWindow = new BrowserWindow({
        width: 1500,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            partition: 'persist:main',
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            plugins: true,
            sandbox: false
        }
    });
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'mediaKeySystem'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    // Load your React app
    const startUrl = isDev
        ? 'http://localhost:3000'  // Development: from React dev server
        : `file://${path.join(__dirname, 'build', 'index.html')}`; // Production: from built files

    mainWindow.loadURL(startUrl);

    // Open DevTools in development mode
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Suppress Autofill DevTools errors
    mainWindow.webContents.on('console-message', (event, level, message) => {
        if (message.includes('Autofill')) {
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// When Electron is ready, create the window
app.whenReady().then(createWindow);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Handle email_unused connection
ipcMain.handle('email_unused:connect', async (event, credentials) => {
    try {
        return new Promise((resolve, reject) => {
            imapConnection = new Imap({
                user: credentials.email,
                password: credentials.password,
                host: 'imap.unob.cz',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                connTimeout: 30000,  // Add this - 30 second timeout
                authTimeout: 30000   // Add this - 30 second auth timeout
            });

            imapConnection.once('ready', () => {
                console.log('IMAP connection successful');  // Add logging
                resolve({ success: true });
            });

            imapConnection.once('error', (err) => {
                console.error('IMAP error:', err);  // Add logging
                reject({ success: false, error: err.message });
            });

            imapConnection.connect();
        });
    } catch (error) {
        console.error('Connection error:', error);  // Add logging
        return { success: false, error: error.message };
    }
});

// Handle fetching emails
ipcMain.handle('email_unused:fetch', async () => {
    if (!imapConnection) {
        return { success: false, error: 'Not connected' };
    }

    return new Promise((resolve, reject) => {
        imapConnection.openBox('INBOX', false, (err, box) => {
            if (err) return reject({ success: false, error: err.message });

            const emails = [];
            const limit = 50;
            const fetch = imapConnection.seq.fetch(
                `${Math.max(1, box.messages.total - limit + 1)}:*`,
                { bodies: '', struct: true }
            );

            fetch.on('message', (msg, seqno) => {
                msg.on('body', (stream) => {
                    simpleParser(stream, (err, parsed) => {
                        if (!err) {
                            emails.push({
                                id: seqno,
                                subject: parsed.subject || '(No Subject)',
                                from: parsed.from?.text || 'Unknown',
                                date: parsed.date || new Date(),
                                body: parsed.text || parsed.html || '',
                                isRead: false
                            });
                        }
                    });
                });
            });

            fetch.once('error', (err) => {
                reject({ success: false, error: err.message });
            });

            fetch.once('end', () => {
                resolve({ success: true, emails: emails.reverse() });
            });
        });
    });
});

// Handle disconnect
ipcMain.handle('email_unused:disconnect', async () => {
    if (imapConnection) {
        imapConnection.end();
        imapConnection = null;
    }
    return { success: true };
});

// Storage handlers
ipcMain.handle('storage:save', async (event, credentials) => {
    store.set('workEmail', credentials);
    return { success: true };
});

ipcMain.handle('storage:get', async () => {
    const creds = store.get('workEmail');
    return creds || null;
});

ipcMain.handle('storage:clear', async () => {
    store.delete('workEmail');
    return { success: true };
});
ipcMain.handle('storage:saveTimetableId', async (event, id) => {
    store.set('timetableId', id);
    return { success: true };
});

ipcMain.handle('storage:getTimetableId', async () => {
    const id = store.get('timetableId');
    return id || null;
});
ipcMain.handle('storage:saveSpotifyToken', async (event, tokenData) => {
    // tokenData: { accessToken, refreshToken, expiresAt }
    store.set('spotifyToken', tokenData);
    return { success: true };
});

ipcMain.handle('storage:getSpotifyToken', async () => {
    const tokenData = store.get('spotifyToken');
    return tokenData || null;
});

ipcMain.handle('storage:clearSpotifyToken', async () => {
    store.delete('spotifyToken');
    return { success: true };
});

// Timetable file lives in Electron's userData directory (writable both in dev
// and in a packaged app), not in public/, which is read-only once bundled.
const timetableDir = path.join(app.getPath('userData'), 'timetable');
const timetableFilePath = path.join(timetableDir, 'rozvrh.ics');

ipcMain.handle('fs:saveTimetableFile', async (event, icsContent) => {
    try {
        fs.mkdirSync(timetableDir, { recursive: true });
        fs.writeFileSync(timetableFilePath, icsContent, 'utf8');
        const stats = fs.statSync(timetableFilePath);
        return { success: true, lastModified: stats.mtime.toISOString() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:readTimetableFile', async () => {
    try {
        const data = fs.readFileSync(timetableFilePath, 'utf8');
        const stats = fs.statSync(timetableFilePath);
        return {
            success: true,
            data: data,
            lastModified: stats.mtime.toISOString()
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:checkTimetableExists', async () => {
    try {
        return { exists: fs.existsSync(timetableFilePath) };
    } catch (error) {
        return { exists: false };
    }
});

ipcMain.handle('storage:saveGoogleToken', async (event, tokenData) => {
    store.set('googleToken', tokenData);
    return { success: true };
});

ipcMain.handle('storage:getGoogleToken', async () => {
    const tokenData = store.get('googleToken');
    return tokenData || null;
});

ipcMain.handle('storage:clearGoogleToken', async () => {
    store.delete('googleToken');
    return { success: true };
});

ipcMain.handle('storage:saveLocalTodos', async (event, todosJson) => {
    store.set('localTodos', todosJson);
    return { success: true };
});

ipcMain.handle('storage:getLocalTodos', async () => {
    const todosJson = store.get('localTodos');
    return todosJson || null;
});