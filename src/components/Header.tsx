import React, { useContext, useState, useRef, useEffect } from 'react';
import sysLogo from '../assets/syslogo.svg';
import './Header.css';
import { 
  SearchIcon, 
  HomeIcon, 
  NotificationIcon, 
  SettingsIcon 
} from '../assets/icons';
import { SidebarContext } from '../context/SidebarContext';
import { useAlert } from '../context/AlertContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  subtitle = "Smart Monitoring Info Tool and Widget Manager" 
}) => {
  const { isExpanded } = useContext(SidebarContext);
  const { alert } = useAlert();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleBellClick = () => setShowDropdown(!showDropdown);
  const handleAlertClick = () => {
    setShowDropdown(false);
    navigate('/performance');
    localStorage.setItem('performanceTab', 'cpu');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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
          <button
            className="control-btn home-button"
            onClick={() => navigate('/')}
          >
            <HomeIcon className="control-icon" />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="control-btn" onClick={handleBellClick}>
              <NotificationIcon className="control-icon" />
              {alert && (
                <span style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>!</span>
              )}
            </button>
            {showDropdown && alert && (
              <div
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: 0,
                  background: '#fff',
                  color: '#222',
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  zIndex: 4000,
                  minWidth: '220px',
                  padding: '12px'
                }}
              >
                <div
                  style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                  onClick={handleAlertClick}
                >
                  {alert}
                </div>
              </div>
            )}
          </div>
          <button className="control-btn">
            <SettingsIcon className="control-icon" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;