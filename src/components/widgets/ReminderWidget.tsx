import React, { useState, useEffect, useRef } from 'react';
import SystemIcon from '../../assets/icons/SystemIcon';
import './ReminderWidget.css';

interface ReminderItem {
  id: number;
  title: string;
  subtitle: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

const ReminderWidget: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderPriority, setNewReminderPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showInput, setShowInput] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const isInitialMount = useRef(true);

  // Load reminders from localStorage on mount
  useEffect(() => {
    const loadReminders = () => {
      const saved = localStorage.getItem('sysdock-reminders');
      if (saved) {
        try {
          setReminders(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading reminders:', e);
        }
      }
    };

    loadReminders();

    // Listen for storage changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sysdock-reminders') {
        loadReminders();
      }
    };

    // Listen for custom event from calendar widget
    const handleReminderUpdate = () => {
      loadReminders();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('reminders-updated', handleReminderUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('reminders-updated', handleReminderUpdate);
    };
  }, []);

  // Save reminders to localStorage whenever they change (skip on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('sysdock-reminders', JSON.stringify(reminders));
  }, [reminders]);

  const toggleReminder = (id: number) => {
    setReminders(reminders.map(reminder =>
      reminder.id === id
        ? { ...reminder, completed: !reminder.completed }
        : reminder
    ));
  };

  const addReminder = () => {
    if (newReminderText.trim()) {
      const newReminder: ReminderItem = {
        id: Date.now(),
        title: newReminderText.trim(),
        subtitle: "",
        completed: false,
        dueDate: newReminderDate || undefined,
        priority: newReminderPriority
      };
      setReminders([...reminders, newReminder]);
      setNewReminderText('');
      setNewReminderDate('');
      setNewReminderPriority('medium');
      setShowInput(false);
      
      // Sync to calendar if there's a due date
      if (newReminderDate) {
        syncReminderToCalendar(newReminder);
      }
    }
  };

  const syncReminderToCalendar = (reminder: ReminderItem) => {
    if (!reminder.dueDate) return;
    
    try {
      const events = JSON.parse(localStorage.getItem('sysdock-calendar-events') || '[]');
      
      // Check if event already exists (to avoid duplicates)
      const eventExists = events.some((e: any) => e.id === reminder.id);
      if (eventExists) return;
      
      const newEvent = {
        id: reminder.id,
        title: reminder.title,
        date: reminder.dueDate,
        color: reminder.priority === 'high' ? '#ef4444' : reminder.priority === 'medium' ? '#f59e0b' : '#10b981'
      };
      events.push(newEvent);
      localStorage.setItem('sysdock-calendar-events', JSON.stringify(events));
      
      // Notify CalendarWidget of the update
      window.dispatchEvent(new Event('calendar-updated'));
    } catch (e) {
      console.error('Error syncing reminder to calendar:', e);
    }
  };

  const deleteReminder = (id: number) => {
    setReminders(reminders.filter(reminder => reminder.id !== id));
    
    // Remove from calendar too
    try {
      const events = JSON.parse(localStorage.getItem('sysdock-calendar-events') || '[]');
      const updatedEvents = events.filter((e: any) => e.id !== id);
      localStorage.setItem('sysdock-calendar-events', JSON.stringify(updatedEvents));
      
      // Notify CalendarWidget of the update
      window.dispatchEvent(new Event('calendar-updated'));
    } catch (e) {
      console.error('Error removing calendar event:', e);
    }
  };

  const startEdit = (reminder: ReminderItem) => {
    setEditingId(reminder.id);
    setEditText(reminder.title);
  };

  const saveEdit = (id: number) => {
    if (editText.trim()) {
      setReminders(reminders.map(r => 
        r.id === id ? { ...r, title: editText.trim() } : r
      ));
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    
    // Parse the date string correctly (YYYY-MM-DD format)
    const [year, month, day] = dueDate.split('-').map(Number);
    const dueDateTime = new Date(year, month - 1, day);
    dueDateTime.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    return dueDateTime.getTime() < today.getTime();
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    
    // Parse the date string correctly (YYYY-MM-DD format)
    const [year, month, day] = dueDate.split('-').map(Number);
    const dueDateTime = new Date(year, month - 1, day);
    dueDateTime.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 13);
    
    // Always include year in formatted date
    const formattedDate = dueDateTime.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    if (dueDateTime.getTime() === today.getTime()) return `Today - ${formattedDate}`;
    if (dueDateTime.getTime() === tomorrow.getTime()) return `Tomorrow - ${formattedDate}`;
    if (dueDateTime.getTime() >= nextWeekStart.getTime() && dueDateTime.getTime() <= nextWeekEnd.getTime()) {
      return `Next week - ${formattedDate}`;
    }
    
    return formattedDate;
  };

  // Sort reminders by priority and due date
  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });

  const pendingCount = reminders.filter(r => !r.completed).length;

  return (
    <div className="reminder-widget glass">
      <div className="reminder-header">
        <div className="reminder-title">
          <SystemIcon type="reminder" size={20} className="reminder-icon" />
          <span>Reminder</span>
        </div>
        <button 
          className="add-reminder-btn"
          onClick={() => setShowInput(!showInput)}
        >
          <span>{showInput ? '×' : '+'}</span>
        </button>
      </div>
      
      <div className="reminder-subtitle">
        {pendingCount} {pendingCount === 1 ? 'Deadline' : 'Deadlines'}
      </div>

      {showInput && (
        <div className="reminder-input-container">
          <div className="reminder-input-header">
            <span className="reminder-input-title">Add Reminder</span>
            <button 
              className="close-reminder-input-btn"
              onClick={() => setShowInput(false)}
            >
              ×
            </button>
          </div>
          <input
            type="text"
            className="reminder-input"
            placeholder="Add new reminder..."
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addReminder()}
            autoFocus
          />
          <input
            type="date"
            className="reminder-date-input"
            value={newReminderDate}
            onChange={(e) => setNewReminderDate(e.target.value)}
          />
          <select 
            className="reminder-priority-select"
            value={newReminderPriority}
            onChange={(e) => setNewReminderPriority(e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button className="btn-add" onClick={addReminder}>Add Reminder</button>
        </div>
      )}
      
      <div className="reminder-list">
        {sortedReminders.map((reminder) => (
          <div 
            key={reminder.id} 
            className={`reminder-item ${reminder.completed ? 'completed' : ''} priority-${reminder.priority} ${isOverdue(reminder.dueDate) && !reminder.completed ? 'overdue' : ''}`}
          >
            <div className="reminder-checkbox">
              <input 
                type="checkbox" 
                checked={reminder.completed}
                onChange={() => toggleReminder(reminder.id)}
                className="checkbox"
              />
            </div>
            <div className="reminder-content">
              {editingId === reminder.id ? (
                <input
                  type="text"
                  className="reminder-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit(reminder.id)}
                  onBlur={() => saveEdit(reminder.id)}
                  autoFocus
                />
              ) : (
                <>
                  <div className="reminder-text">{reminder.title}</div>
                  {reminder.dueDate && (
                    <div className={`reminder-due-date ${isOverdue(reminder.dueDate) && !reminder.completed ? 'overdue-text' : ''}`}>
                      {formatDueDate(reminder.dueDate)}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="reminder-actions">
              {editingId === reminder.id ? (
                <>
                  <button className="action-btn" onClick={() => saveEdit(reminder.id)}>✓</button>
                  <button className="action-btn" onClick={cancelEdit}>×</button>
                </>
              ) : (
                <>
                  <button className="action-btn" onClick={() => startEdit(reminder)}>✎</button>
                  <button className="action-btn delete-btn" onClick={() => deleteReminder(reminder.id)}>×</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReminderWidget;