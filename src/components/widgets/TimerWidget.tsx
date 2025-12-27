import React, { useState, useEffect, useRef } from 'react';
import './TimerWidget.css';

type Mode = 'timer' | 'stopwatch';

const TimerWidget: React.FC = () => {
  const [mode, setMode] = useState<Mode>('timer');
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // in seconds
  const [inputMinutes, setInputMinutes] = useState('5');
  const [inputSeconds, setInputSeconds] = useState('0');
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isInitialMount = useRef(true);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sysdock-timer-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setMode(state.mode);
        setIsRunning(state.isRunning);
        setInputMinutes(state.inputMinutes || '5');
        setInputSeconds(state.inputSeconds || '0');
        
        // If it was running, calculate elapsed time
        if (state.isRunning && state.startTime) {
          const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
          if (state.mode === 'timer') {
            const remaining = Math.max(0, state.time - elapsed);
            setTime(remaining);
            if (remaining === 0) {
              setIsRunning(false);
              playSound();
            }
          } else {
            setTime(state.time + elapsed);
          }
          startTimeRef.current = state.startTime;
        } else {
          setTime(state.time || 0);
        }
      } catch (e) {
        console.error('Error loading timer state:', e);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes (skip on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const state = {
      mode,
      isRunning,
      time,
      inputMinutes,
      inputSeconds,
      startTime: startTimeRef.current
    };
    localStorage.setItem('sysdock-timer-state', JSON.stringify(state));
  }, [mode, isRunning, time, inputMinutes, inputSeconds]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          if (mode === 'timer') {
            if (prevTime <= 1) {
              setIsRunning(false);
              playSound();
              return 0;
            }
            return prevTime - 1;
          } else {
            return prevTime + 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode]);

  const playSound = () => {
    // Browser beep for timer completion
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKzn77JeGAU7k9n0yXkpBSl+zPLaizsKGGS56+ihUBELTKXh8bllHAU2jdXzzn0vBSaAzvLajDkIGGe76+OZTQwOT6vn8LJfGAU7lNn0yHcpBSh9y/HajDsKGGS56+mjUREKTKXi8bllHAU1jdT0z3wvBSaAzvPajTkIG2i76+SaTAwNUKzn8LFfGAU7lNr0yHcnBSh9y/HajDsKF2O56+mjUhEKS6Xh8blnHAU1jdTy0HwvBSaAzvLajDkIG2m76+SaTAwNUKzn8LFfGAU7ltr0yHYnBSl9y/HajDwKF2S56+mjUhEKS6Xh8blmHAU1jdTy0HwvBSaAzvLajDkIG2m76+SaTQwMT6zn8LJfGAU7ldny0HUpBSh/y/LaizsLF2S56+mjUhEKS6Xh8LlmHAU1i9Xy0H0vBSaAzvLaizkIG2i76+SbTAwNT6zn8LJfGAU7lNry0HUpBSh/y/LaizsLF2S56+mjUREKTKbh8blmHAU2i9Xy0H0vBSaAzvLaizkIG2i76+SbTAwNT6zm8LJfGAU7lNry0HQpBSh/y/LbizsLF2S56+mjUhEKTKbh8LlmHAU2i9Xy0H4vBSeAz/LajDkIG2m76+OaTAwNT6vn8LFeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU7ltryyHUpBSh9y/HajDwLF2S46+mjUhEKTKbh8LlnHAU1i9Xy0H4vBSeAzvLajTkHG2m76+OaTQwMT6vn8LJeGAU=');
    audio.play().catch(() => {});
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (mode === 'timer' && time === 0) {
      const totalSeconds = parseInt(inputMinutes) * 60 + parseInt(inputSeconds);
      if (totalSeconds > 0) {
        setTime(totalSeconds);
        setIsRunning(true);
        startTimeRef.current = Date.now();
      }
    } else {
      setIsRunning(true);
      startTimeRef.current = Date.now();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    startTimeRef.current = 0;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setInputMinutes('5');
    setInputSeconds('0');
    startTimeRef.current = 0;
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setIsRunning(false);
    setTime(0);
    setInputMinutes('5');
    setInputSeconds('0');
    startTimeRef.current = 0;
  };

  return (
    <div className="timer-widget glass">
      <div className="timer-header">
        <div className="timer-mode-toggle">
          <button 
            className={mode === 'timer' ? 'active' : ''} 
            onClick={() => switchMode('timer')}
          >
            Timer
          </button>
          <button 
            className={mode === 'stopwatch' ? 'active' : ''} 
            onClick={() => switchMode('stopwatch')}
          >
            Stopwatch
          </button>
        </div>
      </div>

      <div className="timer-display">
        <div className="time-text">{formatTime(time)}</div>
      </div>

      {mode === 'timer' && time === 0 && !isRunning && (
        <div className="timer-input">
          <div className="input-group">
            <input
              type="number"
              value={inputMinutes}
              onChange={(e) => setInputMinutes(e.target.value)}
              min="0"
              max="99"
            />
            <span>min</span>
          </div>
          <div className="input-group">
            <input
              type="number"
              value={inputSeconds}
              onChange={(e) => setInputSeconds(e.target.value)}
              min="0"
              max="59"
            />
            <span>sec</span>
          </div>
        </div>
      )}

      <div className="timer-controls">
        {!isRunning ? (
          <button className="btn-start" onClick={handleStart}>Start</button>
        ) : (
          <button className="btn-pause" onClick={handlePause}>Pause</button>
        )}
        <button className="btn-reset" onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
};

export default TimerWidget;
