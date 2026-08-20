import React from 'react';
import { Device } from './types';

interface SpotifyDevicesProps {
    devices: Device[];
    loading: boolean;
    onSelectDevice: (deviceId: string) => void;
    onClose: () => void;
}

const DEVICE_ICONS: Record<string, string> = {
    Computer: '\uD83D\uDCBB',
    Smartphone: '\uD83D\uDCF1',
    Speaker: '\uD83D\uDD0A',
    TV: '\uD83D\uDCFA',
    Tablet: '\uD83D\uDCF1',
    CastVideo: '\uD83D\uDCFA',
    CastAudio: '\uD83D\uDD0A'
};

function SpotifyDevices({ devices, loading, onSelectDevice, onClose }: SpotifyDevicesProps) {
    return (
        <div className="spotify-devices-overlay" onClick={onClose}>
            <div className="spotify-devices-panel" onClick={(e) => e.stopPropagation()}>
                <div className="spotify-devices-header">
                    <h3>Connect to a device</h3>
                    <button className="spotify-devices-close" onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                {loading && <p className="spotify-empty-state">Looking for devices...</p>}

                {!loading && devices.length === 0 && (
                    <p className="spotify-empty-state">
                        No devices found. Open Spotify somewhere first.
                    </p>
                )}

                {!loading && devices.map((device) => (
                    <button
                        key={device.id || device.name}
                        className={`spotify-device-row ${device.is_active ? 'active' : ''}`}
                        onClick={() => device.id && onSelectDevice(device.id)}
                        disabled={!device.id}
                    >
                        <span className="spotify-device-icon">
                            {DEVICE_ICONS[device.type] || '\uD83D\uDD0A'}
                        </span>
                        <span className="spotify-device-name">{device.name}</span>
                        {device.is_active && <span className="spotify-device-active-badge">Playing here</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default SpotifyDevices;