import React from 'react';
import './WeatherWidget.css';

const sampleWeather = [
  { city: "MANILA", temp: 33, desc: "Overcast Clouds" },
  { city: "QUEZON", temp: 31, desc: "Overcast Clouds" },
  { city: "BATANGAS", temp: 31, desc: "Overcast Clouds" },
  { city: "ILOCOS", temp: 31, desc: "Overcast Clouds" },
];

const WeatherWidget: React.FC = () => (
  <div className="weather-widget">
    <div className="weather-title">Weather</div>
    <div className="weather-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    <div className="weather-cities">
      {sampleWeather.map(w => (
        <div className="weather-city" key={w.city}>
          <div className="weather-temp">{w.temp}°C</div>
          <div className="weather-city-name">{w.city}</div>
          <div className="weather-desc">{w.desc}</div>
        </div>
      ))}
    </div>
  </div>
);

export default WeatherWidget;