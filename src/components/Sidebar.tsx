import React, { useState } from 'react';
import { 
  HomeIcon, 
  GridIcon, 
  ActivityIcon, 
  ProcessIcon, 
  StarIcon, 
  WeatherIcon, 
  DocumentIcon, 
  SettingsIcon 
} from '../assets/icons';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { icon: HomeIcon, label: 'Overview', active: true },
    { icon: GridIcon, label: 'Analytics', active: false },
    { icon: ActivityIcon, label: 'Monitor', active: false },
    { icon: ProcessIcon, label: 'Processes', active: false },
    { icon: StarIcon, label: 'Favorites', active: false },
    { icon: WeatherIcon, label: 'Weather', active: false },
    { icon: DocumentIcon, label: 'Logs', active: false },
    { icon: SettingsIcon, label: 'Settings', active: false },
  ];

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <div className="hamburger-menu" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </div>
      
      <div className="sidebar-menu">
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={index} className={`menu-item ${item.active ? 'active' : ''}`}>
              <IconComponent className="menu-icon" />
              {isExpanded && <span className="menu-label">{item.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;