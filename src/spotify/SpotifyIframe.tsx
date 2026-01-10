import React, { useEffect } from 'react';

function SpotifyIframe() {
    useEffect(() => {
        // Request media permissions
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(() => console.log('Media permissions granted'))
                .catch((err) => console.log('Media permissions denied', err));
        }
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <iframe
                src="https://open.spotify.com/embed"
                style={{
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
        </div>
    );
}

export default SpotifyIframe;