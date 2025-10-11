import React, { useContext } from 'react';
import sysLogo from '../assets/syslogo.svg';
import './Header.css';
import { 
  SearchIcon, 
  HomeIcon, 
  NotificationIcon, 
  SettingsIcon 
} from '../assets/icons';
import { SidebarContext } from '../context/SidebarContext';

interface HeaderProps {
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  subtitle = "Smart Monitoring Info Tool and Widget Manager" 
}) => {
  const { isExpanded } = useContext(SidebarContext);
  
  return (
    <header className={`header ${isExpanded ? 'sidebar-expanded' : ''}`}>
      <div className="header-content">
        <div className="header-title">
          <img src={sysLogo} alt="SysDock Logo" className="header-logo" />
          <div className="title-text">
            <span className="subtitle">{subtitle}</span>
          </div>
        </div>
        
        <div className="header-controls">
          <button className="control-btn">
            <SearchIcon className="control-icon" />
          </button>
          <button className="control-btn home-button active-icon">
            <HomeIcon className="control-icon" />
          </button>
          <button className="control-btn">
            <NotificationIcon className="control-icon" />
          </button>
          <button className="control-btn">
            <SettingsIcon className="control-icon" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;