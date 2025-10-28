import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';
import { EventBus } from '../game/EventBus';
import ObjectiveDisplay from './ObjectiveDisplay';
import TurnTransition from './TurnTransition';
import TroopAllocation from './TroopAllocation';
import AttackMenu from './AttackMenu';
import PostConquestMove from './PostConquestMove';
import AttackResult from './AttackResult';
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

  // Estado para rastrear se tropas já foram alocadas nesta fase
  const [troopsAllocatedThisPhase, setTroopsAllocatedThisPhase] = useState(false);

  // Função para calcular tropas disponíveis para alocar
  const getAvailableTroopsToAllocate = () => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || troopsAllocatedThisPhase) return 0;
    
    // Calcular tropas base (mesmo cálculo do TroopAllocation)
    let territoryBonus = Math.max(3, Math.floor(currentPlayer.territories.length / 2));
    const roundBonus = currentPlayer.id % 3;
    let continentBonus = 0;
    if (currentPlayer.territories.length > 10) {
      continentBonus = 2;
    }
    let cardBonus = 0;
    if (currentPlayer.id === 0) {
      cardBonus = 4;
    }
    
    const totalTroops = Math.min(territoryBonus + roundBonus + continentBonus + cardBonus, 20);
    return totalTroops;
  };
  
  const [showObjective, setShowObjective] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
  const [showTransition, setShowTransition] = useState(false);
  const [showTroopAllocation, setShowTroopAllocation] = useState(false);
  const [showAttackMenu, setShowAttackMenu] = useState(false);
  const [showAttackResult, setShowAttackResult] = useState(false);
  const [attackResultData, setAttackResultData] = useState<any>(null);
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

  const handleCloseAttackResult = () => {
    setShowAttackResult(false);
    setAttackResultData(null);
  };

  const handleSendTroops = () => {
    // Fechar o modal de resultado de ataque
    setShowAttackResult(false);
    // O PostConquestMove já deve estar escutando o evento 'post-conquest'
    // que será emitido automaticamente quando necessário
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
    setTroopsAllocatedThisPhase(true); // Marcar que tropas foram alocadas
    setShowTroopAllocation(false);
  };

  // Reset do estado quando muda de jogador ou fase
  useEffect(() => {
    // Reset quando muda jogador, rodada ou fase
    setTroopsAllocatedThisPhase(false);
  }, [getCurrentPlayer()?.id, currentRound, currentPhase]);

  // Event listener para resultados de ataque
  useEffect(() => {
    const handleAttackResult = (data: any) => {
      console.log('🎲 Resultado do ataque recebido:', data);
      setAttackResultData(data);
      setShowAttackResult(true);
    };

    EventBus.on('attack-result', handleAttackResult);
    return () => {
      EventBus.removeListener('attack-result', handleAttackResult);
    };
  }, []);

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
              className={`troop-allocation-btn ${getAvailableTroopsToAllocate() === 0 ? 'disabled' : ''}`}
              onClick={getAvailableTroopsToAllocate() > 0 ? handleShowTroopAllocation : undefined}
              disabled={getAvailableTroopsToAllocate() === 0}
              title={getAvailableTroopsToAllocate() > 0 
                ? "Alocar tropas de reforço nos seus territórios" 
                : "Tropas já foram alocadas nesta fase"}
            >
              {getAvailableTroopsToAllocate() > 0 ? 'Alocar Tropas' : 'Tropas Alocadas'}
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
      
      <AttackResult
        isVisible={showAttackResult}
        result={attackResultData}
        onClose={handleCloseAttackResult}
        onSendTroops={handleSendTroops}
      />
      
      <PostConquestMove />
    </>
  );
};

export default GameUI;