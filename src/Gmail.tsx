import React from 'react';

function Gmail() {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <webview
                src="https://mail.google.com"
                style={{ flex: 1, width: '100%', height: '100%' }}
                partition="persist:gmail"
            />
        </div>
    );
}

export default Gmail;