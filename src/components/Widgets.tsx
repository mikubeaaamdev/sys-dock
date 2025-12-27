import React, { useState, useEffect } from 'react';
import './Widgets.css';
import WeatherWidget from './widgets/WeatherWidget';
import ReminderWidget from './widgets/ReminderWidget';
import ClockWidget from './widgets/ClockWidget';
import TimerWidget from './widgets/TimerWidget';
import CalculatorWidget from './widgets/CalculatorWidget';
import NotesWidget from './widgets/NotesWidget';
import CalendarWidget from './widgets/CalendarWidget';
import SystemInfoWidget from './widgets/SystemInfoWidget';
import QuickControlsWidget from './widgets/QuickControlsWidget';
import {
  ClockIcon,
  WeatherWidgetIcon,
  SystemIcon,
  TimerIcon,
  CalculatorIcon,
  NotesIcon,
  ReminderIcon,
  CalendarIcon,
  QuickControlsIcon,
  LibraryIcon,
  EmptyBoxIcon
} from '../assets/icons';

type WidgetType = {
  id: string;
  name: string;
  description: string;
  component: React.FC;
  category: 'essentials' | 'productivity' | 'system' | 'tools';
  icon: React.FC<{ className?: string }>;
};

const AVAILABLE_WIDGETS: WidgetType[] = [
  {
    id: 'clock',
    name: 'Clock',
    description: 'Real-time clock with date display',
    component: ClockWidget,
    category: 'essentials',
    icon: ClockIcon
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather conditions',
    component: WeatherWidget,
    category: 'essentials',
    icon: WeatherWidgetIcon
  },
  {
    id: 'system-info',
    name: 'System Info',
    description: 'CPU, RAM, and disk usage',
    component: SystemInfoWidget,
    category: 'system',
    icon: SystemIcon
  },
  {
    id: 'timer',
    name: 'Timer & Stopwatch',
    description: 'Timer and stopwatch functionality',
    component: TimerWidget,
    category: 'productivity',
    icon: TimerIcon
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Basic arithmetic calculator',
    component: CalculatorWidget,
    category: 'tools',
    icon: CalculatorIcon
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Quick notes with local storage',
    component: NotesWidget,
    category: 'productivity',
    icon: NotesIcon
  },
  {
    id: 'reminder',
    name: 'Reminder',
    description: 'Set reminders and alerts',
    component: ReminderWidget,
    category: 'productivity',
    icon: ReminderIcon
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Interactive calendar view',
    component: CalendarWidget,
    category: 'productivity',
    icon: CalendarIcon
  },
  {
    id: 'quick-controls',
    name: 'Quick Controls',
    description: 'System quick actions',
    component: QuickControlsWidget,
    category: 'system',
    icon: QuickControlsIcon
  }
];

const DEFAULT_WIDGETS = ['clock', 'weather', 'system-info', 'timer', 'calculator'];

const Widgets: React.FC = () => {
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const saved = localStorage.getItem('activeWidgets');
    if (saved) {
      setActiveWidgets(JSON.parse(saved));
    } else {
      setActiveWidgets(DEFAULT_WIDGETS);
    }
  }, []);

  const toggleWidget = (widgetId: string) => {
    const newActive = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(id => id !== widgetId)
      : [...activeWidgets, widgetId];
    
    setActiveWidgets(newActive);
    localStorage.setItem('activeWidgets', JSON.stringify(newActive));
  };

  const resetToDefault = () => {
    setActiveWidgets(DEFAULT_WIDGETS);
    localStorage.setItem('activeWidgets', JSON.stringify(DEFAULT_WIDGETS));
  };

  const filteredWidgets = selectedCategory === 'all'
    ? AVAILABLE_WIDGETS
    : AVAILABLE_WIDGETS.filter(w => w.category === selectedCategory);

  return (
    <div className="widgets-hub">
      <div className="widgets-header">
        <div className="widgets-title">WIDGET HUB</div>
        <button 
          className="widget-library-btn"
          onClick={() => setShowLibrary(true)}
        >
          <LibraryIcon className="btn-icon" />
          Widget Library
        </button>
      </div>
      
      <div className="widgets-grid">
        {AVAILABLE_WIDGETS
          .filter(widget => activeWidgets.includes(widget.id))
          .map(widget => (
            <widget.component key={widget.id} />
          ))}
      </div>

      {activeWidgets.length === 0 && (
        <div className="no-widgets">
          <EmptyBoxIcon className="no-widgets-icon" />
          <h3>No Widgets Active</h3>
          <p>Open the Widget Library to add widgets</p>
          <button 
            className="widget-library-btn"
            onClick={() => setShowLibrary(true)}
          >
            Open Widget Library
          </button>
        </div>
      )}

      {showLibrary && (
        <div className="widget-library-overlay" onClick={() => setShowLibrary(false)}>
          <div className="widget-library-modal" onClick={(e) => e.stopPropagation()}>
            <div className="library-header">
              <h2>Widget Library</h2>
              <button 
                className="library-close-btn"
                onClick={() => setShowLibrary(false)}
              >
                ✕
              </button>
            </div>

            <div className="library-controls">
              <div className="category-filters">
                <button 
                  className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </button>
                <button 
                  className={`category-btn ${selectedCategory === 'essentials' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('essentials')}
                >
                  Essentials
                </button>
                <button 
                  className={`category-btn ${selectedCategory === 'productivity' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('productivity')}
                >
                  Productivity
                </button>
                <button 
                  className={`category-btn ${selectedCategory === 'system' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('system')}
                >
                  System
                </button>
                <button 
                  className={`category-btn ${selectedCategory === 'tools' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('tools')}
                >
                  Tools
                </button>
              </div>
              <button className="reset-btn" onClick={resetToDefault}>
                Reset to Default
              </button>
            </div>

            <div className="library-stats">
              <span>{activeWidgets.length} of {AVAILABLE_WIDGETS.length} widgets active</span>
            </div>

            <div className="library-grid">
              {filteredWidgets.map(widget => (
                <div 
                  key={widget.id}
                  className={`library-item ${activeWidgets.includes(widget.id) ? 'active' : ''}`}
                >
                  <div className="library-item-header">
                    <widget.icon className="library-item-icon" />
                    <div className="library-item-info">
                      <h3>{widget.name}</h3>
                      <span className="library-item-category">{widget.category}</span>
                    </div>
                  </div>
                  <p className="library-item-description">{widget.description}</p>
                  <button 
                    className={`library-toggle-btn ${activeWidgets.includes(widget.id) ? 'remove' : 'add'}`}
                    onClick={() => toggleWidget(widget.id)}
                  >
                    {activeWidgets.includes(widget.id) ? '✓ Active' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Widgets;