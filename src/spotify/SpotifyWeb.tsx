import React from 'react';

function SpotifyWeb() {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <webview
                src="https://open.spotify.com"
                style={{ flex: 1, width: '100%', height: '100%' }}
                partition="persist:spotify"
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                {...({ allowpopups: 'yes', plugins: 'yes' } as any)}
            />
        </div>
    );
}

export default SpotifyWeb;