import React from 'react';
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
import { useSidebar } from '../context/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const { isExpanded, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: HomeIcon, label: 'Overview', route: '/' },
    { icon: GridIcon, label: 'Performance', route: '/performance' },
    { icon: ProcessIcon, label: 'Processes', route: '/processes' }, // <-- moved up
    { icon: ActivityIcon, label: 'Monitor', route: '/monitor' },    // <-- moved down
    { icon: StarIcon, label: 'Favorites', route: '/favorites' },
    { icon: WeatherIcon, label: 'Weather', route: '/weather' },
    { icon: DocumentIcon, label: 'Logs', route: '/logs' },
    { icon: SettingsIcon, label: 'Settings', route: '/settings' },
  ];

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <div className="hamburger-menu" onClick={toggleSidebar}>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </div>
      
      <div className="sidebar-menu">
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.route;
          return (
            <div 
              key={index} 
              className={`menu-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(item.route)}
              style={{ cursor: 'pointer' }}
            >
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