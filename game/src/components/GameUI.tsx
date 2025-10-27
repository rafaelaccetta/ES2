import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';
import { EventBus } from '../game/EventBus';
import ObjectiveDisplay from './ObjectiveDisplay';
import TurnTransition from './TurnTransition';
import TroopAllocation from './TroopAllocation';
import AttackMenu from './AttackMenu';
import AttackResult from './AttackResult';
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
    firstRoundObjectiveShown,
    hasTroopsAllocatedThisPhase,
    markTroopsAllocated
  } = useGameContext();  const [showObjective, setShowObjective] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
  const [showTransition, setShowTransition] = useState(false);
  const [showTroopAllocation, setShowTroopAllocation] = useState(false);
  const [showAttackMenu, setShowAttackMenu] = useState(false);
  const [showAttackResult, setShowAttackResult] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
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
    if (shouldShowAutomaticObjective()) {
      setShowObjective(true);
      markObjectiveAsShown();
    } else {
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
    if (hasTroopsAllocatedThisPhase()) {
      console.warn('[GameUI] Troops already allocated this phase - cannot open allocation window');
      return;
    }
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
    setBattleResult(null);
  };

  useEffect(() => {
    console.log('🎧 GameUI: Configurando listener para attack-result');
    
    const handleAttackResult = (result: any) => {
      console.log('🎯 GameUI: Resultado do combate recebido:', {
        conquered: result.conquered,
        source: result.source,
        target: result.target,
        attackerLoss: result.attackerLoss,
        defenderLoss: result.defenderLoss,
        attackerDice: result.attackerDice,
        defenderDice: result.defenderDice
      });
      
      if (result.conquered) {
        console.log('� GameUI: VITÓRIA - território conquistado');
      } else {
        console.log('🛡️ GameUI: DERROTA - ataque falhou');
      }
      
      const attacker = players?.find(p => p.territories.includes(result.source));
      const defender = players?.find(p => p.territories.includes(result.target));
      
      const battleData = {
        source: result.source,
        target: result.target,
        troopsUsed: result.troopsRequested,
        attackerDice: result.attackerDice,
        defenderDice: result.defenderDice,
        attackerLoss: result.attackerLoss,
        defenderLoss: result.defenderLoss,
        conquered: result.conquered,
        attackerColor: attacker?.color,
        defenderColor: defender?.color
      };
      
      console.log('📝 GameUI: Configurando battleResult:', battleData);
      setBattleResult(battleData);
      
      console.log('� GameUI: Configurando battleResult e exibindo modal');
      setBattleResult(battleData);
      setShowAttackResult(true);
      
      console.log('🎯 GameUI: Modal de resultado configurado para mostrar:', {
        conquered: battleData.conquered,
        isVisible: true
      });
    };

    EventBus.on('attack-result', handleAttackResult);
    console.log('🎧 GameUI: Listener configurado com sucesso');
    
    const handleAttackRequest = (data: any) => {
      console.log('🎯 GameUI: Interceptou attack-request (debug):', data);
    };
    EventBus.on('attack-request', handleAttackRequest);

    return () => {
      console.log('🔇 GameUI: Removendo listeners');
      EventBus.off('attack-result', handleAttackResult);
      EventBus.off('attack-request', handleAttackRequest);
    };
  }, []);

  const handleCloseTroopAllocation = () => {
    setShowTroopAllocation(false);
  };

    const handleConfirmTroopAllocation = (allocations: { [territoryId: string]: number }) => {
        console.log('[GameUI] Confirming troop allocation:', allocations);
        
        if (hasTroopsAllocatedThisPhase()) {
            console.warn('[GameUI] Troops already allocated this phase - ignoring duplicate allocation');
            setShowTroopAllocation(false);
            return;
        }
        
        const currentPlayer = getCurrentPlayer();
        if (currentPlayer) {
            Object.entries(allocations).forEach(([territoryId, troops]) => {
                if (troops > 0) {
                    currentPlayer.addArmies(territoryId, troops);
                    console.log(`[GameUI] Allocated ${troops} troops to territory ${territoryId}`);
                }
            });
        }
        
        markTroopsAllocated();
        
        setShowTroopAllocation(false);
        
        console.log('[GameUI] Allocation confirmed, phase marked, and window closed');
    };  const getPlayerColor = (color: string) => {
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
              className={`troop-allocation-btn ${hasTroopsAllocatedThisPhase() ? 'allocation-completed' : ''}`}
              onClick={handleShowTroopAllocation}
              title={hasTroopsAllocatedThisPhase() 
                ? "Tropas já foram alocadas nesta fase" 
                : "Alocar tropas de reforço nos seus territórios"
              }
              disabled={hasTroopsAllocatedThisPhase()}
            >
              {hasTroopsAllocatedThisPhase() ? 'Tropas Alocadas' : 'Alocar Tropas'}
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
        result={battleResult}
        onClose={handleCloseAttackResult}
      />
      
      
      <PostConquestMove />
    </>
  );
};

export default GameUI;