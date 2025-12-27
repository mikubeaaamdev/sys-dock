import React, { useState } from 'react';
import './CalculatorWidget.css';

const CalculatorWidget: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expressionHistory, setExpressionHistory] = useState<string>('');

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const allClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setExpressionHistory('');
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(display);
      setExpressionHistory(display + ' ' + nextOperation);
    } else if (operation && !waitingForOperand) {
      const currentValue = parseFloat(previousValue);
      let newValue = currentValue;

      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = inputValue !== 0 ? currentValue / inputValue : currentValue;
          break;
        case '%':
          newValue = currentValue % inputValue;
          break;
      }

      setPreviousValue(String(newValue));
      setDisplay(String(newValue));
      setExpressionHistory(expressionHistory + ' ' + display + ' ' + nextOperation);
    } else {
      setExpressionHistory(expressionHistory + ' ' + nextOperation);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const currentValue = parseFloat(previousValue);
      let newValue = currentValue;

      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '×':
          newValue = currentValue * inputValue;
          break;
        case '÷':
          newValue = currentValue / inputValue;
          break;
        case '%':
          newValue = currentValue % inputValue;
          break;
      }

      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
      setExpressionHistory('');
    }
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  return (
    <div className="calculator-widget glass">
      <div className="calculator-header">
        <span className="calc-title">Calculator</span>
      </div>
      <div className="calculator-display-container">
        <div className="calculator-expression">
          {expressionHistory || ' '}
        </div>
        <div className="calculator-display">{display}</div>
      </div>
      <div className="calculator-buttons">
        <button className="btn-function" onClick={allClear}>{display === '0' && !expressionHistory ? 'AC' : 'C'}</button>
        <button className="btn-function" onClick={toggleSign}>±</button>
        <button className="btn-function" onClick={() => performOperation('%')}>%</button>
        <button className="btn-operator" onClick={() => performOperation('÷')}>÷</button>

        <button onClick={() => inputDigit('7')}>7</button>
        <button onClick={() => inputDigit('8')}>8</button>
        <button onClick={() => inputDigit('9')}>9</button>
        <button className="btn-operator" onClick={() => performOperation('×')}>×</button>

        <button onClick={() => inputDigit('4')}>4</button>
        <button onClick={() => inputDigit('5')}>5</button>
        <button onClick={() => inputDigit('6')}>6</button>
        <button className="btn-operator" onClick={() => performOperation('-')}>−</button>

        <button onClick={() => inputDigit('1')}>1</button>
        <button onClick={() => inputDigit('2')}>2</button>
        <button onClick={() => inputDigit('3')}>3</button>
        <button className="btn-operator" onClick={() => performOperation('+')}>+</button>

        <button className="btn-zero" onClick={() => inputDigit('0')}>0</button>
        <button onClick={inputDot}>.</button>
        <button className="btn-operator" onClick={handleEquals}>=</button>
      </div>
    </div>
  );
};

export default CalculatorWidget;
