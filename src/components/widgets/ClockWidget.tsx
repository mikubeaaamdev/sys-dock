import React, { useState, useEffect } from 'react';
import './ClockWidget.css';

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(() => {
    const saved = localStorage.getItem('sysdock-clock-24hr');
    return saved ? saved === 'true' : false;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('sysdock-clock-24hr', String(is24Hour));
  }, [is24Hour]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: !is24Hour 
    });
  };

  const toggleFormat = () => {
    setIs24Hour(!is24Hour);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="clock-widget glass">
      <div className="clock-header">
        <span className="clock-title">Clock</span>
        <button className="format-toggle-btn" onClick={toggleFormat} title="Toggle 12/24 hour">
          {is24Hour ? '24H' : '12H'}
        </button>
      </div>
      <div className="clock-display">
        <div className="time">{formatTime(time)}</div>
        <div className="date">{formatDate(time)}</div>
      </div>
    </div>
  );
};

export default ClockWidget;
