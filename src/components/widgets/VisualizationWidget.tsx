import React from 'react';
import './VisualizationWidget.css';

const VisualizationWidget: React.FC = () => {
  return (
    <div className="visualization-widget glass">
      <div className="landscape-container">
        <div className="sky">
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>
        </div>
        <div className="mountains">
          <div className="mountain mountain-1"></div>
          <div className="mountain mountain-2"></div>
          <div className="mountain mountain-3"></div>
        </div>
        <div className="ground"></div>
      </div>
    </div>
  );
};

export default VisualizationWidget;