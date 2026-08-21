import React from 'react';
import ClockWidget from './ClockWidget';
import WeatherWidget from './WeatherWidget';
import CalendarWidget from './CalendarWidget';
import MessengerNotificationWidget from './MessengerNotificationWidget';
import './widgets.css';

function WidgetGrid() {
    return (
        <div className="widget-grid">
            <ClockWidget />
            <WeatherWidget />
            <MessengerNotificationWidget />
            <CalendarWidget />
        </div>
    );
}

export default WidgetGrid;