# Messenger App

A comprehensive desktop productivity suite built with Electron and React that integrates messaging, email, music streaming, calendar management, and task tracking into a unified dashboard.

**Version:** 0.1.0
**Author:** Jan Bartoň
**Platform:** Windows, macOS, Linux

## Features

### Communication
- **Facebook Messenger** - Embedded messenger with persistent session
- **Gmail** - Full Gmail access via webview
- **Work Email** - Integration with organizational email (IMAP support)

### Productivity
- **Todo List** - Task management with due dates, filters (All/Week/Overdue), and CSV export
- **Timetable** - ICS calendar file parsing with auto-refresh
- **Google Calendar** - OAuth2 integration for event display

### Entertainment
- **Spotify Player** - Full Spotify Web Playback integration
  - Search, playlists, liked songs
  - Device switching
  - Playback controls, queue management
  - Now playing widget on dashboard

### Dashboard Widgets
- Clock display
- Weather (Open-Meteo API with location search)
- Google Calendar events (today/week view)
- Spotify now playing bar
- Messenger notifications

## Tech Stack

- **Frontend:** React 19, TypeScript
- **Desktop:** Electron (Castlabs build for Widevine DRM)
- **State Management:** React Context API
- **Storage:** Electron Store, localStorage fallback
- **APIs:** Spotify Web Playback SDK, Google Calendar API, Open-Meteo

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd messenger_app

# Install dependencies
npm install
```

### Development

```bash
# Start React development server only
npm start

# Start Electron with React (recommended for development)
npm run electron-dev
```

The app will open at [http://localhost:3000](http://localhost:3000) in development mode.

### Building for Production

```bash
# Build React app
npm run build

# Package Electron app (unpacked)
npm run pack

# Create distributable installer
npm run dist
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start React development server |
| `npm test` | Run tests in watch mode |
| `npm run build` | Build React app for production |
| `npm run electron` | Run Electron (requires built React app) |
| `npm run electron-dev` | Run Electron with React dev server |
| `npm run pack` | Build and package Electron app |
| `npm run dist` | Build and create distributable |

## Project Structure

```
src/
├── App.tsx                 # Main app with routing
├── Messenger.tsx           # Facebook Messenger webview
├── Gmail.tsx               # Gmail webview
├── Work.tsx                # Work email webview
├── Timetable.tsx           # Calendar/timetable parser
├── spotify/                # Spotify player module
│   ├── Spotify.tsx         # Main player component
│   ├── SpotifyPlayerContext.tsx  # Global state
│   ├── api.ts              # Spotify API wrapper
│   └── ...
├── todo/                   # Todo list module
│   ├── Todo.tsx            # Todo component
│   ├── csvExport.ts        # CSV export utility
│   └── ...
├── widgets/                # Dashboard widgets
│   ├── WidgetGrid.tsx      # Widget container
│   ├── WeatherWidget.tsx   # Weather display
│   ├── CalendarWidget.tsx  # Calendar events
│   └── ...
└── icons/                  # SVG navigation icons

electron.js                 # Electron main process
preload.js                  # Secure IPC bridge
```

## Configuration

### Spotify Integration
Requires Spotify Developer credentials:
1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Set redirect URI to `http://127.0.0.1:3000/callback`
3. Update credentials in `src/spotifyConfig.ts`

### Google Calendar Integration
Requires Google Cloud Console setup:
1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google Calendar API
3. Create OAuth2 credentials with redirect URI `http://127.0.0.1:3000/oauth-calendar-callback`
4. Update credentials in `src/googleConfig.ts`

## Security

- **Context Isolation** - Enabled for renderer process security
- **Node Integration** - Disabled in renderer
- **PKCE OAuth2** - Secure authentication without client secrets
- **Secure Storage** - Tokens stored via Electron Store with expiration validation
- **Widevine DRM** - Castlabs Electron build for protected content

## License

This project is private/proprietary.
