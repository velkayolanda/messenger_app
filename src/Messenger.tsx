import React from 'react';

function Messenger() {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <webview
                src="https://www.messenger.com"
                style={{ flex: 1, width: '100%', height: '100%' }}
                partition="persist:messenger"
            />
        </div>
    );
}

export default Messenger;