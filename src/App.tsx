import React, {useState} from 'react';
import './App.css';
import Messenger from './Messenger';
import Gmail from './Gmail';
import Work from './Work';
import Timetable from './Timetable';
import menuIcon from './icons/menu.svg';
import messengerIcon from './icons/messenger.svg'
import gmailIcon from './icons/gmail.svg'
//import Spotify from "./spotify/Spotify";
//import Spotify from './spotify/SpotifyWeb';
import Spotify from './spotify/SpotifyIframe';


function App() {
    const [currentView, setCurrentView] = useState('home');
    const [sideBarOpen, setSideBarOpen] = useState(false);
    const [MenuOpen, setMenuOpen] = useState(false);
  return (
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
            </div>
          <aside className={`sidebar ${MenuOpen?'sidebar-open':''}`}>
            <h2>Navigation</h2>
            <nav>
                <button onClick={() => setCurrentView('messenger')}>Messenger</button>
              <button onClick={()=> setCurrentView("gmail")}>Gmail</button>
              <button onClick={()=> setCurrentView("work")}>Work Email</button>
                <button onClick={()=> setCurrentView("spotify")}>Spotify</button>
                <button onClick={()=> setCurrentView("Timetable")}>Timetable</button>
              <button onClick={()=> setSideBarOpen(prev => !prev)}>Todo List</button>
            </nav>
          </aside>

            <main className="main-content">
                {currentView === 'home' && (
                    <>
                        <h2>Welcome to your Dashboard</h2>
                        <p>Select a feature from the sidebar</p>
                    </>
                )}
                {currentView === 'messenger' && <Messenger />}
                {currentView === 'gmail' && <Gmail />}
                {currentView === 'work' && <Work/>}
                {currentView === 'spotify' && <Spotify/>}
                {currentView === 'Timetable' && <Timetable/> }
                {sideBarOpen && (
                    <aside className="todo-sidebar">
                        <button className="close-todo" onClick={() => setSideBarOpen(false)}>Close</button>
                        <h2>TODO</h2>
                        <p>TODO content will go here</p>
                        <p>Napsat Frantovi ze je kokot</p>
                    </aside>
                )}
            </main>
        </div>
      </div>
  );
}

export default App;