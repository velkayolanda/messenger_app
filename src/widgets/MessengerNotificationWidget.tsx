import React, { useState, useEffect } from 'react';

const POLL_INTERVAL_MS = 15 * 1000;

function parseUnreadCount(title: string): number | null {
    const match = title.match(/^\((\d+)\)/);
    if (!match) return 0;
    return parseInt(match[1], 10);
}

function MessengerNotificationWidget() {
    const [unreadCount, setUnreadCount] = useState<number | null>(null);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            const webview = document.getElementById('messenger-webview') as (HTMLElement & {
                executeJavaScript?: (code: string) => Promise<any>;
            }) | null;
            if (!webview || typeof webview.executeJavaScript !== 'function') {
                if (!cancelled) setUnavailable(true);
                return;
            }

            try {
                const title: string = await webview.executeJavaScript('document.title');
                if (!cancelled) {
                    setUnavailable(false);
                    setUnreadCount(parseUnreadCount(title));
                }
            } catch {
                if (!cancelled) setUnavailable(true);
            }
        };

        poll();
        const interval = setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="widget widget-notification">
            <div className="widget-notification-icon">💬</div>
            <div className="widget-notification-label">Messenger</div>
            {unavailable ? (
                <div className="widget-notification-status">Not available</div>
            ) : (
                <div className={`widget-notification-count ${unreadCount ? 'has-unread' : ''}`}>
                    {unreadCount === null ? '...' : unreadCount}
                </div>
            )}
        </div>
    );
}

export default MessengerNotificationWidget;