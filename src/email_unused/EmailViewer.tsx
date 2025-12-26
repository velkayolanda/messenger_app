import React from 'react';
import { Email } from '../electron';

interface EmailViewerProps {
    email: Email | null;
}

function EmailViewer({ email }: EmailViewerProps) {
    if (!email) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
            }}>
                Select an email to read
            </div>
        );
    }

    return (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: 'white' }}>
            <h2 style={{ marginBottom: '10px', fontSize: '20px' }}>{email.subject}</h2>
            <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '15px',
                paddingBottom: '15px',
                borderBottom: '1px solid #ddd'
            }}>
                <div style={{ marginBottom: '5px' }}><strong>From:</strong> {email.from}</div>
                <div><strong>Date:</strong> {new Date(email.date).toLocaleString()}</div>
            </div>
            <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
            }}>
                {email.body}
            </div>
        </div>
    );
}

export default EmailViewer;