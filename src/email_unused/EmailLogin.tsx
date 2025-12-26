import React, { useState } from 'react';

interface EmailLoginProps {
    onLogin: (email: string, password: string) => void;
    loading: boolean;
    error: string;
}

function EmailLogin({ onLogin, loading, error }: EmailLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        onLogin(email, password);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Work Email Login</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                        placeholder="your.email@unob.cz"
                        disabled={loading}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                        disabled={loading}
                    />
                </div>
                {error && (
                    <div style={{
                        padding: '10px',
                        marginBottom: '15px',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        borderRadius: '4px'
                    }}>
                        {error}
                    </div>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: loading ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        width: '100%'
                    }}
                >
                    {loading ? 'Connecting...' : 'Login'}
                </button>
            </form>
        </div>
    );
}

export default EmailLogin;