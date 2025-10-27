import React, { useState } from 'react';
import './ReminderWidget.css';

const initialReminders = [
  "SOFTENG: Act 1",
  "COMSA: PubMat",
  "SOFTENG: Proposal",
  "OS: Lab Act 2"
];

const ReminderWidget: React.FC = () => {
  const [reminders, setReminders] = useState(initialReminders);
  const [input, setInput] = useState("");

  const addReminder = () => {
    if (input.trim()) {
      setReminders([...reminders, input.trim()]);
      setInput("");
    }
  };

  return (
    <div className="reminder-widget">
      <div className="reminder-title">Reminders</div>
      <div className="reminder-list">
        {reminders.map((r, i) => (
          <div className="reminder-item" key={i}>
            <input type="checkbox" />
            <span>{r}</span>
          </div>
        ))}
      </div>
      <div className="reminder-add">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add reminder..."
        />
        <button onClick={addReminder}>+</button>
      </div>
    </div>
  );
};

export default ReminderWidget;