import React from 'react';
import WeatherIcon from '../../assets/icons/WeatherIcon';
import './WeatherWidget.css';

interface WeatherData {
  location: string;
  temperature: number;
  condition: 'cloud' | 'sun' | 'rain' | 'cloudy';
  description: string;
}

const WeatherWidget: React.FC = () => {
  const currentTime = "10:51 am";
  
  const weatherData: WeatherData[] = [
    {
      location: "MANILA",
      temperature: 33,
      condition: "cloudy",
      description: "Overcast Clouds"
    },
    {
      location: "QUEZON",
      temperature: 31,
      condition: "cloudy",
      description: "Overcast Clouds"
    },
    {
      location: "BATANGAS",
      temperature: 31,
      condition: "cloudy",
      description: "Overcast Clouds"
    },
    {
      location: "ILOCOS",
      temperature: 31,
      condition: "cloudy",
      description: "Overcast Clouds"
    }
  ];

  return (
    <div className="weather-widget glass">
      <div className="weather-header">
        <div className="weather-title">
          <WeatherIcon type="cloud" size={20} className="weather-icon" />
          <span>Weather</span>
        </div>
        <span className="weather-time">Current Weather</span>
        <span className="current-time">{currentTime}</span>
      </div>
      
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
    </div>
  );
};

export default WeatherWidget;