import React from 'react';

function Work() {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <webview
                src="https://email.unob.cz/"
                style={{ flex: 1, width: '100%', height: '100%' }}
                partition="persist:work"
            />
        </div>
    );
}

export default Work;