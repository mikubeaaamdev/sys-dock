import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import WeatherIcon from '../../assets/icons/WeatherIcon';
import './WeatherWidget.css';

interface WeatherData {
  location: string;
  temperature: number;
  condition: 'cloud' | 'sun' | 'rain' | 'cloudy';
  description: string;
}

interface City {
  name: string;
  lat: number;
  lon: number;
  region: string;
}

interface City {
  name: string;
  lat: number;
  lon: number;
  region: string;
}

// Major cities in the Philippines
const PHILIPPINE_CITIES: City[] = [
  // National Capital Region
  { name: 'Manila', lat: 14.5995, lon: 120.9842, region: 'NCR' },
  { name: 'Quezon City', lat: 14.6760, lon: 121.0437, region: 'NCR' },
  { name: 'Makati', lat: 14.5547, lon: 121.0244, region: 'NCR' },
  { name: 'Pasig', lat: 14.5764, lon: 121.0851, region: 'NCR' },
  { name: 'Taguig', lat: 14.5176, lon: 121.0509, region: 'NCR' },
  { name: 'Pasay', lat: 14.5378, lon: 120.9896, region: 'NCR' },
  
  // Luzon
  { name: 'Baguio', lat: 16.4023, lon: 120.5960, region: 'CAR' },
  { name: 'Laoag', lat: 18.1987, lon: 120.5937, region: 'Region I' },
  { name: 'Vigan', lat: 17.5747, lon: 120.3869, region: 'Region I' },
  { name: 'Dagupan', lat: 16.0433, lon: 120.3334, region: 'Region I' },
  { name: 'Baguio City', lat: 16.4023, lon: 120.5960, region: 'CAR' },
  { name: 'Tuguegarao', lat: 17.6132, lon: 121.7270, region: 'Region II' },
  { name: 'Cauayan', lat: 16.9272, lon: 121.7705, region: 'Region II' },
  { name: 'Olongapo', lat: 14.8294, lon: 120.2824, region: 'Region III' },
  { name: 'Angeles', lat: 15.1450, lon: 120.5887, region: 'Region III' },
  { name: 'San Fernando (Pampanga)', lat: 15.0288, lon: 120.6897, region: 'Region III' },
  { name: 'Cabanatuan', lat: 15.4860, lon: 120.9671, region: 'Region III' },
  { name: 'Batangas City', lat: 13.7565, lon: 121.0583, region: 'Region IV-A' },
  { name: 'Lipa', lat: 13.9411, lon: 121.1624, region: 'Region IV-A' },
  { name: 'Lucena', lat: 13.9372, lon: 121.6176, region: 'Region IV-A' },
  { name: 'Antipolo', lat: 14.5863, lon: 121.1758, region: 'Region IV-A' },
  { name: 'Calamba', lat: 14.2117, lon: 121.1653, region: 'Region IV-A' },
  { name: 'Puerto Princesa', lat: 9.7392, lon: 118.7353, region: 'Region IV-B' },
  { name: 'Naga', lat: 13.6192, lon: 123.1814, region: 'Region V' },
  { name: 'Legazpi', lat: 13.1391, lon: 123.7437, region: 'Region V' },
  
  // Visayas
  { name: 'Cebu City', lat: 10.3157, lon: 123.8854, region: 'Region VII' },
  { name: 'Mandaue', lat: 10.3237, lon: 123.9222, region: 'Region VII' },
  { name: 'Lapu-Lapu', lat: 10.3103, lon: 123.9494, region: 'Region VII' },
  { name: 'Dumaguete', lat: 9.3068, lon: 123.3054, region: 'Region VII' },
  { name: 'Tagbilaran', lat: 9.6474, lon: 123.8533, region: 'Region VII' },
  { name: 'Iloilo City', lat: 10.7202, lon: 122.5621, region: 'Region VI' },
  { name: 'Bacolod', lat: 10.6770, lon: 122.9502, region: 'Region VI' },
  { name: 'Roxas', lat: 11.5854, lon: 122.7510, region: 'Region VI' },
  { name: 'Tacloban', lat: 11.2447, lon: 125.0037, region: 'Region VIII' },
  { name: 'Ormoc', lat: 11.0059, lon: 124.6074, region: 'Region VIII' },
  { name: 'Calbayog', lat: 12.0667, lon: 124.6000, region: 'Region VIII' },
  
  // Mindanao
  { name: 'Davao City', lat: 7.0731, lon: 125.6128, region: 'Region XI' },
  { name: 'Zamboanga City', lat: 6.9214, lon: 122.0790, region: 'Region IX' },
  { name: 'Cagayan de Oro', lat: 8.4542, lon: 124.6319, region: 'Region X' },
  { name: 'General Santos', lat: 6.1164, lon: 125.1716, region: 'Region XII' },
  { name: 'Iligan', lat: 8.2280, lon: 124.2452, region: 'Region X' },
  { name: 'Butuan', lat: 8.9475, lon: 125.5406, region: 'Region XIII' },
  { name: 'Cotabato City', lat: 7.2231, lon: 124.2452, region: 'BARMM' },
  { name: 'Dipolog', lat: 8.5833, lon: 123.3417, region: 'Region IX' },
  { name: 'Pagadian', lat: 7.8256, lon: 123.4364, region: 'Region IX' },
  { name: 'Koronadal', lat: 6.5008, lon: 124.8469, region: 'Region XII' },
];

const DEFAULT_CITIES = ['Manila', 'Quezon City', 'Cebu City', 'Davao City', 'Baguio', 'Iloilo City'];

const WeatherWidget: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    const saved = localStorage.getItem('weatherCities');
    return saved ? JSON.parse(saved) : DEFAULT_CITIES;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);

  const toggleCity = (cityName: string) => {
    const newSelected = selectedCities.includes(cityName)
      ? selectedCities.filter(c => c !== cityName)
      : [...selectedCities, cityName];
    
    setSelectedCities(newSelected);
    localStorage.setItem('weatherCities', JSON.stringify(newSelected));
  };

  const selectAll = () => {
    const allCities = PHILIPPINE_CITIES.map(c => c.name);
    setSelectedCities(allCities);
    localStorage.setItem('weatherCities', JSON.stringify(allCities));
  };

  const clearAll = () => {
    setSelectedCities([]);
    localStorage.setItem('weatherCities', JSON.stringify([]));
  };

  const resetToDefault = () => {
    setSelectedCities(DEFAULT_CITIES);
    localStorage.setItem('weatherCities', JSON.stringify(DEFAULT_CITIES));
  };

  const regions = ['all', ...Array.from(new Set(PHILIPPINE_CITIES.map(c => c.region)))].sort();

  const filteredCities = PHILIPPINE_CITIES.filter(city => {
    const matchesSearch = city.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || city.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  useEffect(() => {
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    // Fetch weather data from Open-Meteo API
    const fetchWeather = async () => {
      if (selectedCities.length === 0) {
        setWeatherData([]);
        return;
      }

      const cities = PHILIPPINE_CITIES.filter(city => selectedCities.includes(city.name));

      try {
        const weatherPromises = cities.map(city =>
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weathercode&timezone=auto`)
            .then(res => res.json())
        );

        const results = await Promise.all(weatherPromises);
        const newWeatherData = results.map((data, index) => ({
          location: cities[index].name.toUpperCase(),
          temperature: Math.round(data.current.temperature_2m),
          condition: mapWeatherCode(data.current.weathercode),
          description: getWeatherDescription(data.current.weathercode)
        }));

        setWeatherData(newWeatherData);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    fetchWeather();
    // Update weather every 10 minutes
    const weatherInterval = setInterval(fetchWeather, 600000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(weatherInterval);
    };
  }, [selectedCities]);

  // Helper function to map WMO weather codes to icons
  const mapWeatherCode = (code: number): 'cloud' | 'sun' | 'rain' | 'cloudy' => {
    if (code === 0) return 'sun'; // Clear sky
    if (code <= 3) return 'cloudy'; // Partly cloudy
    if (code <= 48) return 'cloud'; // Fog
    if (code <= 67 || (code >= 80 && code <= 82)) return 'rain'; // Rain
    if (code >= 71 && code <= 77) return 'cloud'; // Snow
    if (code >= 95) return 'rain'; // Thunderstorm
    return 'cloudy';
  };

  // Get weather description from WMO code
  const getWeatherDescription = (code: number): string => {
    const descriptions: { [key: number]: string } = {
      0: 'Clear Sky',
      1: 'Mainly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing Rime Fog',
      51: 'Light Drizzle',
      53: 'Moderate Drizzle',
      55: 'Dense Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      71: 'Slight Snow',
      73: 'Moderate Snow',
      75: 'Heavy Snow',
      80: 'Slight Rain Showers',
      81: 'Moderate Rain Showers',
      82: 'Violent Rain Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Hail',
      99: 'Thunderstorm with Heavy Hail'
    };
    return descriptions[code] || 'Unknown';
  };

  // Helper function to map weather conditions to icons (kept for compatibility)
  const mapWeatherCondition = (condition: string): 'cloud' | 'sun' | 'rain' | 'cloudy' => {
    const conditionMap: { [key: string]: 'cloud' | 'sun' | 'rain' | 'cloudy' } = {
      'Clear': 'sun',
      'Clouds': 'cloudy',
      'Rain': 'rain',
      'Drizzle': 'rain',
      'Thunderstorm': 'rain',
      'Snow': 'cloud',
      'Mist': 'cloud',
      'Fog': 'cloud'
    };
    return conditionMap[condition] || 'cloudy';
  };

  return (
    <div className="weather-widget glass">
      <div className="weather-header">
        <div className="weather-title">
          <WeatherIcon type="cloud" size={20} className="weather-icon" />
          <span>Weather</span>
          <button 
            className="weather-settings-btn"
            onClick={() => setShowSettings(true)}
            title="Select Cities"
          >
            ⚙️
          </button>
        </div>
        <span className="weather-time">Current Weather</span>
        <span className="current-time">{currentTime}</span>
      </div>
      
      {weatherData.length === 0 ? (
        <div className="no-cities-message">
          <p>No cities selected</p>
          <button onClick={() => setShowSettings(true)} className="select-cities-btn">
            Select Cities
          </button>
        </div>
      ) : (
        <div className="weather-grid">
          {weatherData.map((weather, index) => (
            <div key={index} className="weather-card">
              <WeatherIcon 
                type={weather.condition} 
                size={24} 
                className="location-weather-icon"
              />
              <div className="weather-info">
                <div className="location-name">{weather.location}</div>
                <div className="temperature">{weather.temperature}°C</div>
                <div className="weather-description">{weather.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && createPortal(
        <div className="weather-settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="weather-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>Select Philippine Cities</h3>
              <button 
                className="settings-close-btn"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>

            <div className="settings-controls">
              <input
                type="text"
                placeholder="Search cities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="city-search-input"
              />
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="region-filter"
              >
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region === 'all' ? 'All Regions' : region}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-actions">
              <button onClick={selectAll} className="action-btn">
                Select All
              </button>
              <button onClick={clearAll} className="action-btn">
                Clear All
              </button>
              <button onClick={resetToDefault} className="action-btn">
                Reset Default
              </button>
              <span className="selected-count">
                {selectedCities.length} selected
              </span>
            </div>

            <div className="cities-list">
              {filteredCities.map(city => (
                <label key={city.name} className="city-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedCities.includes(city.name)}
                    onChange={() => toggleCity(city.name)}
                  />
                  <span className="city-info">
                    <span className="city-name">{city.name}</span>
                    <span className="city-region">{city.region}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="settings-footer">
              <button 
                className="done-btn"
                onClick={() => setShowSettings(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WeatherWidget;