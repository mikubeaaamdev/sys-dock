import React from 'react';
import './AboutWidget.css';

const AboutWidget: React.FC = () => {
  return (
    <div className="about-widget glass">
      <div className="about-header">
        <span className="info-icon">ℹ️</span>
        <h3>About SysDock</h3>
      </div>
      
      <div className="about-content">
        <p>
          This system combines two functions in one tool: system monitoring and widget management. 
          It tracks CPU, RAM, disk, and network performance with alerts, logs, and process controls 
          to keep the system healthy. At the same time, it provides a customizable widget dock for 
          quick access to tools like weather, notes, to-do lists, timers, and system shortcuts, 
          making the desktop both efficient and user-friendly.
        </p>
      </div>
    </div>
  );
};

export default AboutWidget;