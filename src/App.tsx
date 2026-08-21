import React, {useState} from 'react';
import './App.css';
import Messenger from './Messenger';
import Gmail from './Gmail';
import Work from './Work';
import Timetable from './Timetable';
import menuIcon from './icons/menu.svg';
import messengerIcon from './icons/messenger.svg'
import gmailIcon from './icons/gmail.svg'
import workIcon from './icons/work.svg';
import spotifyIcon from './icons/spotify.svg';
import timetableIcon from './icons/timetable.svg';
import todoIcon from './icons/todo.svg';
import Spotify from "./spotify/Spotify";
import { SpotifyPlayerProvider } from "./spotify/SpotifyPlayerContext";
import SpotifyBar from "./widgets/SpotifyBar";
import Todo from "./todo/Todo";
import WidgetGrid from "./widgets/WidgetGrid";


function App() {
    const [currentView, setCurrentView] = useState(() => {
        if (window.location.pathname === '/oauth-calendar-callback') return 'home';
        if (window.location.search.includes('code=')) return 'spotify';
        return 'home';
    });
    const [sideBarOpen, setSideBarOpen] = useState(
        () => window.location.pathname === '/oauth-calendar-callback'
    );
    const [MenuOpen, setMenuOpen] = useState(false);
    return (
        <SpotifyPlayerProvider>
            <div className="App">
                <header className="app-header">
                    <button onClick ={() => setCurrentView('home')} className="header-button">My Dashboard</button>
                </header>

                <div className="app-container">
                    <div className="hamburger-container">
                        <button className="hamburger-button" onClick={()=> setMenuOpen(!MenuOpen)} aria-label="Toggle Menu">
                            <img src={menuIcon} alt="Menu" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                        <button className="hamburger-button" onClick={()=> setCurrentView('messenger')} aria-label="Messenger">
                            <img src={messengerIcon} alt="Messenger" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                        <button className="hamburger-button" onClick={()=> setCurrentView('gmail')} aria-label="Gmail">
                            <img src={gmailIcon} alt="Gmail" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                        <button className="hamburger-button" onClick={()=> setCurrentView('work')} aria-label="Work Email">
                            <img src={workIcon} alt="Work Email" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                        <button className="hamburger-button" onClick={()=> setCurrentView('spotify')} aria-label="Spotify">
                            <img src={spotifyIcon} alt="Spotify" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                        <button className="hamburger-button" onClick={()=> setCurrentView('Timetable')} aria-label="Timetable">
                            <img src={timetableIcon} alt="Timetable" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                        <button className="hamburger-button" onClick={()=> setSideBarOpen(prev => !prev)} aria-label="Todo List">
                            <img src={todoIcon} alt="Todo List" style={{ width: '1.5625rem', height: '1.5625rem' }} />
                        </button>
                    </div>
                    <aside className={`sidebar ${MenuOpen?'sidebar-open':''}`}>
                        <h2>Navigation</h2>
                        <nav>
                            <button onClick={() => setCurrentView('messenger')}>
                                <img src={messengerIcon} alt="" style={{ width: '1.25rem', height: '1.25rem', marginRight: '8px', verticalAlign: 'middle' }} />
                                Messenger
                            </button>
                            <button onClick={()=> setCurrentView("gmail")}>
                                <img src={gmailIcon} alt="" style={{ width: '1.25rem', height: '1.25rem', marginRight: '8px', verticalAlign: 'middle' }} />
                                Gmail
                            </button>
                            <button onClick={()=> setCurrentView("work")}>
                                <img src={workIcon} alt="" style={{ width: '1.25rem', height: '1.25rem', marginRight: '8px', verticalAlign: 'middle' }} />
                                Work Email
                            </button>
                            <button onClick={()=> setCurrentView("spotify")}>
                                <img src={spotifyIcon} alt="" style={{ width: '1.25rem', height: '1.25rem', marginRight: '8px', verticalAlign: 'middle' }} />
                                Spotify
                            </button>
                            <button onClick={()=> setCurrentView("Timetable")}>
                                <img src={timetableIcon} alt="" style={{ width: '1.25rem', height: '1.25rem', marginRight: '8px', verticalAlign: 'middle' }} />
                                Timetable
                            </button>
                            <button onClick={()=> setSideBarOpen(prev => !prev)}>
                                <img src={todoIcon} alt="" style={{ width: '1.25rem', height: '1.25rem', marginRight: '8px', verticalAlign: 'middle' }} />
                                Todo List
                            </button>
                        </nav>
                    </aside>

                    <main className="main-content">
                        <div style={{ display: currentView === 'home' ? 'block' : 'none' }}>
                            <h2>Welcome to your Dashboard</h2>
                            <p>Select a feature from the sidebar</p>
                            <WidgetGrid />
                        </div>
                        <div style={{ display: currentView === 'messenger' ? 'block' : 'none', height: '100%' }}>
                            <Messenger />
                        </div>
                        <div style={{ display: currentView === 'gmail' ? 'block' : 'none', height: '100%' }}>
                            <Gmail />
                        </div>
                        <div style={{ display: currentView === 'work' ? 'block' : 'none', height: '100%' }}>
                            <Work />
                        </div>
                        <div style={{ display: currentView === 'spotify' ? 'block' : 'none', height: '100%' }}>
                            <Spotify />
                        </div>
                        <div style={{ display: currentView === 'Timetable' ? 'block' : 'none', height: '100%' }}>
                            <Timetable />
                        </div>
                        {sideBarOpen && <Todo onClose={() => setSideBarOpen(false)} />}
                    </main>
                </div>
                {currentView === 'home' && <SpotifyBar />}
            </div>
        </SpotifyPlayerProvider>
    );
}

export default App;