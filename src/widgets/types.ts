export interface CalendarEvent {
    id: string;
    calendarId: string;
    calendarName: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
    isAllDay: boolean;
}

export interface WeatherLocation {
    name: string;
    latitude: number;
    longitude: number;
}

export interface WeatherData {
    temperatureC: number;
    weatherCode: number;
    isDay: boolean;
    windSpeedKph: number;
}