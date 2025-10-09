import React from 'react';
import SystemIcon from '../../assets/icons/SystemIcon';
import './ReminderWidget.css';

interface ReminderItem {
  id: number;
  title: string;
  subtitle: string;
  completed: boolean;
}

const ReminderWidget: React.FC = () => {
  const reminders: ReminderItem[] = [
    {
      id: 1,
      title: "SOFTENG: Act 1",
      subtitle: "",
      completed: false
    },
    {
      id: 2,
      title: "COMSA: PubMat",
      subtitle: "",
      completed: false
    },
    {
      id: 3,
      title: "SOFTENG: Proposal",
      subtitle: "",
      completed: false
    },
    {
      id: 4,
      title: "OS: Lab Act 2",
      subtitle: "",
      completed: false
    }
  ];

  return (
    <div className="reminder-widget glass">
      <div className="reminder-header">
        <div className="reminder-title">
          <SystemIcon type="reminder" size={20} className="reminder-icon" />
          <span>Reminder</span>
        </div>
        <button className="add-reminder-btn">
          <span>+</span>
        </button>
      </div>
      
      <div className="reminder-subtitle">
        5 Deadlines
      </div>
      
      <div className="reminder-list">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="reminder-item">
            <div className="reminder-checkbox">
              <input 
                type="checkbox" 
                checked={reminder.completed}
                onChange={() => {}}
                className="checkbox"
              />
            </div>
            <div className="reminder-content">
              <div className="reminder-text">{reminder.title}</div>
              {reminder.subtitle && (
                <div className="reminder-subtext">{reminder.subtitle}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReminderWidget;