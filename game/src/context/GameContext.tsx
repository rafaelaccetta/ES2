import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameManager } from '../../game-logic/GameManager.js';
import { Player } from '../../game-logic/Player.js';
import { EventBus } from '../game/EventBus';

export interface Objective {
  id: number;
  type: string;
  title: string;
  description: string;
  target: {
    continents?: string[];
    territory_count?: number;
    eliminate_player?: string;
  };
}

export interface GameState {
  gameManager: GameManager | null;
  players: Player[];
  currentPlayerIndex: number;
  currentPhase: string;
  currentRound: number;
  objectives: Objective[];
  gameStarted: boolean;
  showObjectiveConfirmation: boolean;
  firstRoundObjectiveShown: Set<number>;
}

interface GameContextType extends GameState {
  startGame: (playerCount: number) => void;
  getCurrentPlayer: () => Player | null;
  getCurrentObjective: () => Objective | null;
  nextPhase: () => void;
  resetGame: () => void;
  shouldShowAutomaticObjective: () => boolean;
  markObjectiveAsShown: () => void;
  setShowObjectiveConfirmation: (show: boolean) => void;
}

const initialState: GameState = {
  gameManager: null,
  players: [],
  currentPlayerIndex: 0,
  currentPhase: 'REINFORCE',
  currentRound: 0,
  objectives: [],
  gameStarted: false,
  showObjectiveConfirmation: false,
  firstRoundObjectiveShown: new Set(),
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);

  // Carregar objectives do arquivo JSON
  useEffect(() => {
    const loadObjectives = async () => {
      try {
        const response = await fetch('/data/objectives.json');
        const objectivesData = await response.json();
        setGameState(prevState => ({
          ...prevState,
          objectives: objectivesData.objectives
        }));
      } catch (error) {
        console.error('Erro ao carregar objectives:', error);
      }
    };

    loadObjectives();
  }, []);

  const startGame = (playerCount: number) => {
    const playerColors = ['azul', 'vermelho', 'verde', 'branco'];
    const gamePlayers = Array.from({ length: playerCount }, (_, index) => 
      new Player(index, playerColors[index])
    );

    const gameManager = new GameManager(gamePlayers);
    gameManager.distributeObjectives(gameState.objectives);

    setGameState(prevState => ({
      ...prevState,
      gameManager,
      players: gamePlayers,
      currentPlayerIndex: 0,
      currentPhase: gameManager.getPhaseName(),
      currentRound: gameManager.round,
      gameStarted: true,
    }));

    // Emitir evento para a cena Jogo saber quantos jogadores há
    EventBus.emit('players-updated', { playerCount });
  };

  const getCurrentPlayer = (): Player | null => {
    if (!gameState.gameManager || gameState.players.length === 0) {
      return null;
    }
    return gameState.gameManager.getPlayerPlaying();
  };

  const getCurrentObjective = (): Objective | null => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.objective) {
      return null;
    }
    
    if (typeof currentPlayer.objective === 'object' && currentPlayer.objective.id) {
      return currentPlayer.objective as Objective;
    }
    
    return gameState.objectives.find(obj => 
      obj.title === currentPlayer.objective || 
      obj.description === currentPlayer.objective
    ) || null;
  };

  const nextPhase = () => {
    if (!gameState.gameManager) return;
    
    gameState.gameManager.passPhase();
    
    setGameState(prevState => ({
      ...prevState,
      currentPlayerIndex: gameState.gameManager!.turn,
      currentPhase: gameState.gameManager!.getPhaseName(),
      currentRound: gameState.gameManager!.round,
    }));
  };

  const resetGame = () => {
    setGameState(initialState);
  };

  const shouldShowAutomaticObjective = (): boolean => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return false;
    
    // Só mostra automaticamente na primeira rodada E se o jogador ainda não viu o objetivo
    return gameState.currentRound === 0 && !gameState.firstRoundObjectiveShown.has(currentPlayer.id);
  };

  const markObjectiveAsShown = () => {
    const currentPlayer = getCurrentPlayer();
    if (currentPlayer) {
      setGameState(prevState => ({
        ...prevState,
        firstRoundObjectiveShown: new Set(prevState.firstRoundObjectiveShown.add(currentPlayer.id))
      }));
    }
  };

  const setShowObjectiveConfirmation = (show: boolean) => {
    setGameState(prevState => ({
      ...prevState,
      showObjectiveConfirmation: show
    }));
  };

  const contextValue: GameContextType = {
    ...gameState,
    startGame,
    getCurrentPlayer,
    getCurrentObjective,
    nextPhase,
    resetGame,
    shouldShowAutomaticObjective,
    markObjectiveAsShown,
    setShowObjectiveConfirmation,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;