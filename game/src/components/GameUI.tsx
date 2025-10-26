import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';
import { EventBus } from '../game/EventBus';
import ObjectiveDisplay from './ObjectiveDisplay';
import TurnTransition from './TurnTransition';
import TroopAllocation from './TroopAllocation';
import AttackMenu from './AttackMenu';
import PostConquestMove from './PostConquestMove';
import './GameUI.css';

const GameUI: React.FC = () => {
  const { 
    gameStarted, 
    getCurrentPlayer, 
    currentPhase, 
    currentRound, 
    nextPhase, 
    startGame,
    players,
    shouldShowAutomaticObjective,
    markObjectiveAsShown,
    showObjectiveConfirmation,
    setShowObjectiveConfirmation,
    firstRoundObjectiveShown
  } = useGameContext();
  
  const [showObjective, setShowObjective] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
  const [showTransition, setShowTransition] = useState(false);
  const [showTroopAllocation, setShowTroopAllocation] = useState(false);
  const [showAttackMenu, setShowAttackMenu] = useState(false);
  const lastPlayerRef = useRef<number | null>(null);

  useEffect(() => {
    const currentPlayer = getCurrentPlayer();
    if (currentPlayer && gameStarted && currentPhase === 'REFORÇAR') {
      
      const isNewPlayer = lastPlayerRef.current !== currentPlayer.id;
      
      if (isNewPlayer) {
        const hasSeenObjective = firstRoundObjectiveShown.has(currentPlayer.id);
        
        console.log(`🔄 Mudança de jogador para ${currentPlayer.id} (${currentPlayer.color}):`, {
          previousPlayer: lastPlayerRef.current,
          hasSeenObjective,
          willShowTransition: !hasSeenObjective
        });
        
        if (!hasSeenObjective) {
          console.log(`🎯 Iniciando transição para jogador ${currentPlayer.id}`);
          setShowTransition(true);
          setShowObjective(false);
        }
      }
      
      lastPlayerRef.current = currentPlayer.id;
    }
  }, [getCurrentPlayer()?.id, currentPhase, gameStarted, firstRoundObjectiveShown]);

  const handleStartGame = (playerCount: number) => {
    startGame(playerCount);
    setShowStartMenu(false);
    setShowTransition(false);
  };

  const handleShowObjective = () => {
    // Se estamos na primeira rodada e o jogador ainda não viu o objetivo, mostra direto
    if (shouldShowAutomaticObjective()) {
      setShowObjective(true);
      markObjectiveAsShown();
    } else {
      // Caso contrário, mostra o modal de confirmação
      setShowObjectiveConfirmation(true);
    }
  };

  const handleCloseObjective = () => {
    setShowObjective(false);
  };

  const handleTurnTransitionComplete = () => {
    setShowTransition(false);
    setShowObjective(true);
    markObjectiveAsShown();
  };

  const handleConfirmShowObjective = () => {
    setShowObjectiveConfirmation(false);
    setShowObjective(true);
  };

  const handleCancelShowObjective = () => {
    setShowObjectiveConfirmation(false);
  };

  const handleShowTroopAllocation = () => {
    setShowTroopAllocation(true);
  };

  const handleShowAttackMenu = () => {
    setShowAttackMenu(true);
  };

  const handleCloseAttackMenu = () => {
    setShowAttackMenu(false);
  };

  const handleCloseTroopAllocation = () => {
    setShowTroopAllocation(false);
  };

  const handleConfirmTroopAllocation = (allocations: Record<string, number>) => {
    const currentPlayer = getCurrentPlayer();
    
    if (!currentPlayer) {
      console.error('Jogador atual não encontrado');
      return;
    }

    console.log('🪖 Aplicando alocações:', allocations);
    
    Object.entries(allocations).forEach(([territory, quantity]) => {
      if (currentPlayer.territories.includes(territory)) {
        currentPlayer.addArmies(territory, quantity);
        console.log(`✅ Adicionado ${quantity} tropas ao território ${territory}`);
      }
    });

    EventBus.emit('players-updated', {
      playerCount: players.length,
      players: players.map((player) => ({
        id: player.id,
        color: player.color,
        territories: player.territories,
        territoriesArmies: player.territoriesArmies,
        armies: player.armies,
      })),
    });

    console.log('🗺️ Mapa atualizado com novas tropas');
    setShowTroopAllocation(false);
  };

  const getPlayerColor = (color: string) => {
    const colorMap: Record<string, string> = {
      azul: '#2563eb',      
      vermelho: '#dc2626',  
      verde: '#16a34a',     
      branco: '#b7c0cd'     
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
            {[1, 2, 3, 4].map(count => (
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
          <div className="current-player" style={{display: 'flex', justifyContent: 'center', fontSize: '15px'}}>
            <span>Jogador {currentPlayer.color.charAt(0).toUpperCase() + currentPlayer.color.slice(1)}</span>
          </div>
          
          <div className="game-info">
            <span>Rodada: {currentRound + 1}</span>
            <span className={`phase-indicator ${currentPhase === 'REFORÇAR' ? 'reinforcement-phase' : ''}`}>
              Fase: {currentPhase}
              {currentPhase === 'REFORÇAR'}
            </span>
          </div>
        </div>

        <div className="game-controls">
          {currentPhase === 'REFORÇAR' && (
            <button 
              className="troop-allocation-btn"
              onClick={handleShowTroopAllocation}
              title="Alocar tropas de reforço nos seus territórios"
            >
              Alocar Tropas
            </button>
          )}

          {currentPhase === 'ATACAR' && (
            <button
              className="attack-toggle-btn"
              onClick={handleShowAttackMenu}
              title="Abrir menu de ataque"
            >
              Atacar
            </button>
          )}
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
        showConfirmation={showObjectiveConfirmation}
        onClose={handleCloseObjective}
        onConfirm={handleConfirmShowObjective}
        onCancel={handleCancelShowObjective}
      />

      <TroopAllocation
        isVisible={showTroopAllocation}
        onClose={handleCloseTroopAllocation}
        onConfirm={handleConfirmTroopAllocation}
      />

      <AttackMenu
        isVisible={showAttackMenu}
        onClose={handleCloseAttackMenu}
      />
      <PostConquestMove />
    </>
  );
};

export default GameUI;