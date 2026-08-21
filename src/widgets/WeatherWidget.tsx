import React, { useState, useEffect, useCallback } from 'react';
import { WeatherData, WeatherLocation } from './types';
import { geocodeCity, getCurrentWeather, describeWeatherCode } from './weatherApi';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

function WeatherWidget() {
    const [location, setLocation] = useState<WeatherLocation | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingCity, setEditingCity] = useState(false);
    const [cityQuery, setCityQuery] = useState('');
    const [searchResults, setSearchResults] = useState<WeatherLocation[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const load = async () => {
            let savedJson: string | null = null;
            if (window.electronAPI) {
                savedJson = await window.electronAPI.getWeatherLocation();
            } else {
                savedJson = window.localStorage.getItem('weather_location');
            }

            if (savedJson) {
                try {
                    setLocation(JSON.parse(savedJson));
                } catch {
                    // ignore corrupt data
                }
            } else {
                setEditingCity(true);
            }
            setLoading(false);
        };
        load();
    }, []);

    const fetchWeather = useCallback(async (loc: WeatherLocation) => {
        try {
            setError(null);
            const data = await getCurrentWeather(loc);
            setWeather(data);
        } catch (err) {
            console.error(err);
            setError('Could not load weather.');
        }
    }, []);

    useEffect(() => {
        if (!location) return;
        fetchWeather(location);
        const interval = setInterval(() => fetchWeather(location), REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [location, fetchWeather]);

    const saveLocation = useCallback(async (loc: WeatherLocation) => {
        setLocation(loc);
        setEditingCity(false);
        setSearchResults([]);
        setCityQuery('');

        const json = JSON.stringify(loc);
        if (window.electronAPI) {
            await window.electronAPI.saveWeatherLocation(json);
        } else {
            window.localStorage.setItem('weather_location', json);
        }
    }, []);

    const runCitySearch = useCallback(async () => {
        if (!cityQuery.trim()) return;
        setSearching(true);
        setError(null);
        try {
            const results = await geocodeCity(cityQuery.trim());
            setSearchResults(results);
            if (results.length === 0) {
                setError('No cities found with that name.');
            }
        } catch (err) {
            console.error(err);
            setError('City search failed.');
        } finally {
            setSearching(false);
        }
    }, [cityQuery]);

    if (loading) {
        return <div className="widget widget-weather widget-loading">Loading...</div>;
    }

    if (editingCity) {
        return (
            <div className="widget widget-weather">
                <div className="widget-weather-setup">
                    <p className="widget-weather-setup-label">Set your city</p>
                    <div className="widget-weather-search-row">
                        <input
                            type="text"
                            value={cityQuery}
                            onChange={(e) => setCityQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runCitySearch()}
                            placeholder="Search city..."
                            className="widget-weather-search-input"
                        />
                        <button onClick={runCitySearch} className="widget-weather-search-button">
                            {searching ? '...' : 'Search'}
                        </button>
                    </div>
                    {error && <p className="widget-weather-error">{error}</p>}
                    {searchResults.map((result, idx) => (
                        <button
                            key={idx}
                            className="widget-weather-result"
                            onClick={() => saveLocation(result)}
                        >
                            {result.name}
                        </button>
                    ))}
                    {location && (
                        <button className="widget-weather-cancel" onClick={() => setEditingCity(false)}>
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!location) {
        return <div className="widget widget-weather widget-loading">Set a city to see weather.</div>;
    }

    const conditions = weather ? describeWeatherCode(weather.weatherCode, weather.isDay) : null;

    return (
        <div className="widget widget-weather" onClick={() => setEditingCity(true)} title="Click to change city">
            {error && <p className="widget-weather-error">{error}</p>}
            {weather && conditions ? (
                <>
                    <div className="widget-weather-icon">{conditions.icon}</div>
                    <div className="widget-weather-temp">{Math.round(weather.temperatureC)}°C</div>
                    <div className="widget-weather-label">{conditions.label}</div>
                    <div className="widget-weather-location">{location.name}</div>
                </>
            ) : (
                <p className="widget-loading">Loading weather...</p>
            )}
        </div>
    );
}

export default WeatherWidget;