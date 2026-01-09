import React from 'react';

function Spotify() {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <webview
                src="https://open.spotify.com"
                style={{ flex: 1, width: '100%', height: '100%' }}
                partition="persist:spotify"
            />
        </div>
    );
}

export default Spotify;