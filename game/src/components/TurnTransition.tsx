import React, { useState, useEffect } from 'react';
import { useGameContext } from '../context/GameContext';
import './TurnTransition.css';

interface TurnTransitionProps {
  onObjectiveShown: () => void;
}

const TurnTransition: React.FC<TurnTransitionProps> = ({ onObjectiveShown }) => {
  const { getCurrentPlayer, currentPhase, currentRound } = useGameContext();
  const [countdown, setCountdown] = useState(5);

  const currentPlayer = getCurrentPlayer();

  useEffect(() => {
    setCountdown(5);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onObjectiveShown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [onObjectiveShown]);

  if (!currentPlayer) {
    return null;
  }

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
    <div className="turn-transition-overlay">
      <div className="turn-transition-content">
        <div className="transition-header">
          <h2>Vez do Jogador</h2>
          <div className="player-info-large">
            <div 
              className="player-indicator-large"
              style={{ backgroundColor: getPlayerColorStyle(currentPlayer.color) }}
            />
            <h1>{currentPlayer.color.charAt(0).toUpperCase() + currentPlayer.color.slice(1)}</h1>
          </div>
        </div>

        <div className="transition-info">
          <div className="info-grid">
            <div className="info-card">
              <span className="info-label">Rodada</span>
              <span className="info-value">{currentRound + 1}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Fase</span>
              <span className="info-value">{currentPhase}</span>
            </div>
          </div>
        </div>

        <div className="transition-footer">
          <div className="privacy-warning">
            <p>
              Certifique-se de que apenas você está vendo a tela antes de prosseguir.
              Você verá seu objetivo secreto em breve!
            </p>
          </div>
          
          <div className="countdown-container">
            <div className="countdown-circle">
              <span className="countdown-number">{countdown}</span>
            </div>
            <p>Mostrando objetivo em {countdown} segundos...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurnTransition;