import React, {useState} from 'react';
import './App.css';
import Messenger from './Messenger';

function App() {
    const [currentView, setCurrentView] = useState('home');
    const [sideBarOpen, setSideBarOpen] = useState(false);
  return (
      <div className="App">
        <header className="app-header">
          <h1>My Dashboard</h1>
        </header>

        <div className="app-container">
          <aside className="sidebar">
            <h2>Navigation</h2>
            <nav>
                <button onClick={() => setCurrentView('messenger')}>Messenger</button>
              <button onClick={()=> setCurrentView("gmail")}>Gmail</button>
              <button onClick={()=> setCurrentView("work-email")}>Work Email</button>
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
                {currentView === 'gmail' && (
                    <>
                        <h2>GMAIL</h2>
                        <p>GMail content will go here</p>
                    </>
                )}
                {currentView === 'work-email' && (
                    <>
                        <h2>UNOB mail</h2>
                        <p>Unob mail content will go here</p>
                    </>
                )}
                {sideBarOpen && (
                    <aside className="todo-sidebar">
                        <button className="close-todo" onClick={() => setSideBarOpen(false)}>Close</button>
                        <h2>TODO</h2>
                        <p>TODO content will go here</p>
                    </aside>
                )}
            </main>
        </div>
      </div>
  );
}

export default App;