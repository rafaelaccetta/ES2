import React, { useState, useEffect } from 'react';
import { useGameContext } from '../context/GameContext';
import './ObjectiveDisplay.css';

interface ObjectiveDisplayProps {
  showObjective: boolean;
  onClose: () => void;
}

const ObjectiveDisplay: React.FC<ObjectiveDisplayProps> = ({ showObjective, onClose }) => {
  const { getCurrentPlayer, getCurrentObjective, currentPhase, currentRound } = useGameContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (showObjective) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showObjective]);

  const currentPlayer = getCurrentPlayer();
  const currentObjective = getCurrentObjective();

  if (!isVisible || !currentPlayer || !currentObjective) {
    return null;
  }

  const getObjectiveIcon = (type: string) => {
    switch (type) {
      case 'conquest':
        return '🏴';
      case 'territory_count':
        return '🎯';
      case 'elimination':
        return '⚔️';
      case 'mixed':
        return '🏆';
      default:
        return '📋';
    }
  };

  const getPlayerColorStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      azul: '#2563eb',      
      vermelho: '#dc2626',  
      verde: '#16a34a',     
      branco: '#d2d9e3ff'     
    };
    return colorMap[color] || '#d2d9e3ff';
  };

  return (
    <div className={`objective-overlay ${showObjective ? 'show' : 'hide'}`}>
      <div className="objective-modal">
        <div className="objective-header">
          <div className="player-info">
            <div 
              className="player-indicator"
              style={{ backgroundColor: getPlayerColorStyle(currentPlayer.color) }}
            />
            <h2>Jogador {currentPlayer.color.charAt(0).toUpperCase() + currentPlayer.color.slice(1)}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="objective-content">
          <div className="objective-icon">
            {getObjectiveIcon(currentObjective.type)}
          </div>
          <h3 className="objective-title">{currentObjective.title}</h3>
          <p className="objective-description">{currentObjective.description}</p>
          
          <div className="game-info">
            <div className="info-item">
              <span className="label">Rodada:</span>
              <span className="value">{currentRound + 1}</span>
            </div>
            <div className="info-item">
              <span className="label">Fase:</span>
              <span className="value">{currentPhase}</span>
            </div>
          </div>
        </div>

        <div className="objective-footer">
          <p className="privacy-notice">
            Este objetivo é confidencial e só deve ser visto por você!
          </p>
          <button className="continue-btn" onClick={onClose}>
            Continuar Jogando
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveDisplay;