import React from 'react';
import './Widgets.css';
import WeatherWidget from '../widgets/WeatherWidget';
import ReminderWidget from '../widgets/ReminderWidget';

const Widgets: React.FC = () => {
  return (
    <div className="widgets-hub">
      <div className="widgets-title">WIDGET HUB</div>
      <div className="widgets-grid">
        <WeatherWidget />
        <ReminderWidget />
        {/* Add more widgets here */}
      </div>
    </div>
  );
};

export default Widgets;