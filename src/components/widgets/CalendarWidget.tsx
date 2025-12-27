import React, { useState, useEffect, useRef } from 'react';
import './CalendarWidget.css';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  color: string;
}

const CalendarWidget: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventInput, setShowEventInput] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState('#3b82f6');
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const isInitialMount = useRef(true);

  // Load events from localStorage
  useEffect(() => {
    const loadEvents = () => {
      const saved = localStorage.getItem('sysdock-calendar-events');
      if (saved) {
        try {
          setEvents(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading calendar events:', e);
        }
      }
    };

    loadEvents();

    // Listen for storage changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sysdock-calendar-events') {
        loadEvents();
      }
    };

    // Listen for custom event from reminder widget
    const handleCalendarUpdate = () => {
      loadEvents();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('calendar-updated', handleCalendarUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calendar-updated', handleCalendarUpdate);
    };
  }, []);

  // Save events to localStorage (skip on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('sysdock-calendar-events', JSON.stringify(events));
  }, [events]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const selectMonth = (monthIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex));
    setShowMonthYearPicker(false);
  };

  const selectYear = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth()));
  };

  const addEvent = () => {
    if (newEventTitle.trim()) {
      // Format date using local time to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;
      
      const newEvent: CalendarEvent = {
        id: Date.now(),
        title: newEventTitle.trim(),
        date: localDate,
        color: newEventColor
      };
      setEvents([...events, newEvent]);
      setNewEventTitle('');
      setShowEventInput(false);
      
      // Sync to reminders
      syncEventToReminder(newEvent);
    }
  };

  const syncEventToReminder = (event: CalendarEvent) => {
    try {
      const reminders = JSON.parse(localStorage.getItem('sysdock-reminders') || '[]');
      const newReminder = {
        id: event.id,
        title: event.title,
        subtitle: '',
        completed: false,
        dueDate: event.date,
        priority: 'medium' as const
      };
      reminders.push(newReminder);
      localStorage.setItem('sysdock-reminders', JSON.stringify(reminders));
      
      // Notify ReminderWidget of the update
      window.dispatchEvent(new Event('reminders-updated'));
    } catch (e) {
      console.error('Error syncing event to reminder:', e);
    }
  };

  const deleteEvent = (id: number) => {
    setEvents(events.filter(event => event.id !== id));
    
    // Remove from reminders too
    try {
      const reminders = JSON.parse(localStorage.getItem('sysdock-reminders') || '[]');
      const updatedReminders = reminders.filter((r: any) => r.id !== id);
      localStorage.setItem('sysdock-reminders', JSON.stringify(updatedReminders));
      
      // Notify ReminderWidget of the update
      window.dispatchEvent(new Event('reminders-updated'));
    } catch (e) {
      console.error('Error removing reminder:', e);
    }
  };

  const getEventsForDate = (date: Date) => {
    // Format date using local time to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return events.filter(event => event.date === dateString);
  };

  const hasEventsOnDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return getEventsForDate(date).length > 0;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      const isSelected = 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEventsOnDate(day) ? 'has-events' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="day-number">{day}</span>
          {hasEventsOnDate(day) && <div className="event-indicator"></div>}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="calendar-widget glass">
      <div className="calendar-header">
        <button onClick={previousMonth}>‹</button>
        <div 
          className="calendar-month-year clickable"
          onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
        >
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button onClick={nextMonth}>›</button>
      </div>

      {showMonthYearPicker && (
        <div className="month-year-picker">
          <div className="year-selector">
            <button onClick={() => selectYear(currentDate.getFullYear() - 1)}>‹</button>
            <span className="current-year">{currentDate.getFullYear()}</span>
            <button onClick={() => selectYear(currentDate.getFullYear() + 1)}>›</button>
          </div>
          <div className="month-grid">
            {monthNames.map((month, index) => (
              <button
                key={month}
                className={`month-option ${currentDate.getMonth() === index ? 'selected' : ''}`}
                onClick={() => selectMonth(index)}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="calendar-weekdays">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="calendar-days">
        {renderCalendar()}
      </div>

      <div className="calendar-selected-info">
        <div className="selected-date-header">
          <span className="selected-date-label">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <button 
            className="add-event-btn"
            onClick={() => setShowEventInput(!showEventInput)}
          >
            {showEventInput ? '×' : '+'}
          </button>
        </div>

        {showEventInput && (
          <div className="event-input-container">
            <div className="event-input-header">
              <span className="event-input-title">Add Event</span>
              <button 
                className="close-event-input-btn"
                onClick={() => setShowEventInput(false)}
              >
                ×
              </button>
            </div>
            <input
              type="text"
              className="event-input"
              placeholder="Event title..."
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addEvent()}
              autoFocus
            />
            <div className="event-color-picker">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                <button
                  key={color}
                  className={`color-option ${newEventColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewEventColor(color)}
                />
              ))}
            </div>
            <button className="btn-add-event" onClick={addEvent}>Add Event</button>
          </div>
        )}

        <div className="events-list">
          {getEventsForDate(selectedDate).length === 0 ? (
            <div className="no-events">No events scheduled</div>
          ) : (
            getEventsForDate(selectedDate).map(event => (
              <div key={event.id} className="event-item" style={{ borderLeftColor: event.color }}>
                <span className="event-title">{event.title}</span>
                <button 
                  className="delete-event-btn"
                  onClick={() => deleteEvent(event.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
