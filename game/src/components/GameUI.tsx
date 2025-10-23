import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';
import ObjectiveDisplay from './ObjectiveDisplay';
import TurnTransition from './TurnTransition';
import './GameUI.css';

const GameUI: React.FC = () => {
  const { 
    gameStarted, 
    getCurrentPlayer, 
    currentPhase, 
    currentRound, 
    nextPhase, 
    startGame,
    players 
  } = useGameContext();
  
  const [showObjective, setShowObjective] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
  const [showTransition, setShowTransition] = useState(false);
  const lastPlayerRef = useRef<number | null>(null);

  useEffect(() => {
    const currentPlayer = getCurrentPlayer();
    if (currentPlayer && gameStarted) {
      if (lastPlayerRef.current !== currentPlayer.id && currentPhase === 'REINFORCE') {
        setShowTransition(true);
        setShowObjective(false);
      }
      lastPlayerRef.current = currentPlayer.id;
    }
  }, [getCurrentPlayer()?.id, currentPhase, gameStarted]);

  const handleStartGame = (playerCount: number) => {
    startGame(playerCount);
    setShowStartMenu(false);
    setShowTransition(false);
  };

  const handleShowObjective = () => {
    setShowObjective(true);
  };

  const handleCloseObjective = () => {
    setShowObjective(false);
  };

  const handleTurnTransitionComplete = () => {
    setShowTransition(false);
    setShowObjective(true);
  };

  const getPlayerColor = (color: string) => {
    const colorMap: Record<string, string> = {
      azul: '#2563eb',      
      vermelho: '#dc2626',  
      verde: '#16a34a',     
      branco: '#d2d9e3ff'     
    };
    return colorMap[color] || '#d2d9e3ff';
  };

  const currentPlayer = getCurrentPlayer();

  if (showStartMenu) {
    return (
      <div className="start-menu">
        <div className="start-menu-content">
          <h1>WAR</h1>
          <p>Selecione o número de jogadores para começar</p>
          <div className="player-selection">
            {[1, 2, 3].map(count => (
              <button
                key={count}
                className="player-count-btn"
                onClick={() => handleStartGame(count)}
              >
                {count} {count === 1 ? 'Jogador' : 'Jogadores'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!gameStarted || !currentPlayer) {
    return null;
  }

  return (
    <>
      <div className="game-ui">
        <div className="game-status">
          <div className="current-player">
            <div 
              className="player-color-indicator"
              style={{ backgroundColor: getPlayerColor(currentPlayer.color) }}
            />
            <span>Jogador {currentPlayer.color.charAt(0).toUpperCase() + currentPlayer.color.slice(1)}</span>
          </div>
          
          <div className="game-info">
            <span>Rodada: {currentRound + 1}</span>
            <span>Fase: {currentPhase}</span>
          </div>
        </div>

        <div className="game-controls">
          <button 
            className="objective-btn"
            onClick={handleShowObjective}
            title="Ver meu objetivo (confidencial)"
          >
            Meu Objetivo
          </button>
          
          <button 
            className="next-phase-btn"
            onClick={nextPhase}
            title="Avançar para próxima fase"
          >
            Próxima Fase
          </button>
        </div>

        <div className="players-info">
          <h4>Jogadores:</h4>
          <div className="players-list">
            {players.map(player => (
              <div 
                key={player.id} 
                className={`player-item ${player.id === currentPlayer.id ? 'active' : ''}`}
              >
                <div 
                  className="player-dot"
                  style={{ backgroundColor: getPlayerColor(player.color) }}
                />
                {player.color}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showTransition && (
        <TurnTransition onObjectiveShown={handleTurnTransitionComplete} />
      )}
      
      <ObjectiveDisplay 
        showObjective={showObjective && !showTransition}
        onClose={handleCloseObjective}
      />
    </>
  );
};

export default GameUI;