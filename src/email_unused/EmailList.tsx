import React from 'react';
import { Email } from '../electron';

interface EmailListProps {
    emails: Email[];
    onEmailClick: (email: Email) => void;
    selectedEmail: Email | null;
}

function EmailList({ emails, onEmailClick, selectedEmail }: EmailListProps) {
    return (
        <div style={{
            width: '350px',
            borderRight: '1px solid #ddd',
            overflowY: 'auto',
            backgroundColor: '#f5f5f5'
        }}>
            {emails.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No emails</p>
            ) : (
                emails.map((email) => (
                    <div
                        key={email.id}
                        onClick={() => onEmailClick(email)}
                        style={{
                            padding: '15px',
                            borderBottom: '1px solid #ddd',
                            cursor: 'pointer',
                            backgroundColor: selectedEmail?.id === email.id ? '#e3f2fd' : 'white',
                        }}
                    >
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                            {email.subject}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>
                            {email.from}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                            {new Date(email.date).toLocaleDateString()}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default EmailList;