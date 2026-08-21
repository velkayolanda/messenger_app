import { WeatherData, WeatherLocation } from './types';

export async function geocodeCity(query: string): Promise<WeatherLocation[]> {
    const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to search for that city');
    const data = await response.json();

    return (data.results || []).map((r: any) => ({
        name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        latitude: r.latitude,
        longitude: r.longitude
    }));
}

export async function getCurrentWeather(location: WeatherLocation): Promise<WeatherData> {
    const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: 'temperature_2m,weather_code,is_day,wind_speed_10m'
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to load weather');
    const data = await response.json();

    return {
        temperatureC: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        windSpeedKph: data.current.wind_speed_10m
    };
}

export function describeWeatherCode(code: number, isDay: boolean): { label: string; icon: string } {
    if (code === 0) return { label: 'Clear sky', icon: isDay ? '☀️' : '🌙' };
    if (code === 1) return { label: 'Mainly clear', icon: isDay ? '🌤️' : '🌙' };
    if (code === 2) return { label: 'Partly cloudy', icon: '⛅' };
    if (code === 3) return { label: 'Overcast', icon: '☁️' };
    if (code === 45 || code === 48) return { label: 'Fog', icon: '🌫️' };
    if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: '🌦️' };
    if (code >= 61 && code <= 67) return { label: 'Rain', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { label: 'Snow', icon: '❄️' };
    if (code >= 80 && code <= 82) return { label: 'Rain showers', icon: '🌧️' };
    if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: '🌨️' };
    if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: '⛈️' };
    return { label: 'Unknown', icon: '🌡️' };
}