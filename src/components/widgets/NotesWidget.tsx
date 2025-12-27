import React, { useState, useEffect } from 'react';
import './NotesWidget.css';

interface Note {
  id: number;
  title: string;
  content: string;
  timestamp: number;
}

const NotesWidget: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load notes from localStorage
    const savedNotes = localStorage.getItem('sysdock-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    // Save notes to localStorage
    if (notes.length > 0) {
      localStorage.setItem('sysdock-notes', JSON.stringify(notes));
    }
  }, [notes]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now(),
      title: 'New Note',
      content: '',
      timestamp: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setCurrentNote(newNote);
    setTitle(newNote.title);
    setContent(newNote.content);
    setIsEditing(true);
  };

  const selectNote = (note: Note) => {
    setCurrentNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(true);
  };

  const saveNote = () => {
    if (currentNote) {
      const updatedNotes = notes.map(note =>
        note.id === currentNote.id
          ? { ...note, title, content, timestamp: Date.now() }
          : note
      );
      setNotes(updatedNotes);
      setCurrentNote({ ...currentNote, title, content });
    }
  };

  const deleteNote = (id: number) => {
    setNotes(notes.filter(note => note.id !== id));
    if (currentNote?.id === id) {
      setCurrentNote(null);
      setIsEditing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="notes-widget glass">
      <div className="notes-header">
        <span className="notes-title">Quick Notes</span>
        <button className="btn-new-note" onClick={createNewNote}>+</button>
      </div>

      {!isEditing && notes.length > 0 && (
        <div className="notes-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="notes-container">
        {!isEditing ? (
          <div className="notes-list">
            {notes.length === 0 ? (
              <div className="notes-empty">
                <p>No notes yet</p>
                <button onClick={createNewNote}>Create your first note</button>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="notes-empty">
                <p>No notes found</p>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div key={note.id} className="note-item" onClick={() => selectNote(note)}>
                  <div className="note-item-header">
                    <h4>{note.title}</h4>
                    <button 
                      className="btn-delete" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <p className="note-preview">{note.content.substring(0, 50)}...</p>
                  <span className="note-date">{formatDate(note.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="note-editor">
            <input
              type="text"
              className="note-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
            />
            <textarea
              className="note-content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your note..."
            />
            <div className="char-counter">{content.length} characters</div>
            <div className="note-editor-actions">
              <button className="btn-save" onClick={() => {
                saveNote();
                setIsEditing(false);
              }}>Save</button>
              <button className="btn-cancel" onClick={() => setIsEditing(false)}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesWidget;
