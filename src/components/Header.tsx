import React from 'react';
import { 
  SearchIcon, 
  DashboardIcon, 
  NotificationIcon, 
  ConfigIcon 
} from '../assets/icons';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>SysDock</h1>
          <span className="subtitle">Smart Monitoring Info Tool and Widget Manager</span>
        </div>
        <div className="header-controls">
          <button className="control-btn" title="Search">
            <SearchIcon className="control-icon" />
          </button>
          <button className="control-btn" title="Dashboard">
            <DashboardIcon className="control-icon" />
          </button>
          <button className="control-btn" title="Notifications">
            <NotificationIcon className="control-icon" />
          </button>
          <button className="control-btn" title="Settings">
            <ConfigIcon className="control-icon" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;