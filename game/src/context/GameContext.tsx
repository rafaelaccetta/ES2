import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";

import { GameManager } from "../../game-logic/GameManager.js";

import { Player } from "../../game-logic/Player.js";

import resolveAttack from "../../game-logic/Combat.js";
import { EventBus } from "../game/EventBus";

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
    territorySelectionCallback: ((territory: string) => void) | null;
    troopsAllocatedThisPhase: boolean;
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
    setTerritorySelectionCallback: (callback: ((territory: string) => void) | null) => void;
    onTerritorySelected: (territory: string) => void;
    applyPostConquestMove: (source: string, target: string, moved: number) => void;
    hasTroopsAllocatedThisPhase: () => boolean;
    markTroopsAllocated: () => void;
}

const initialState: GameState = {
    gameManager: null,
    players: [],
    currentPlayerIndex: 0,
    currentPhase: "REFORÇAR",
    currentRound: 0,
    objectives: [],
    gameStarted: false,
    showObjectiveConfirmation: false,
    firstRoundObjectiveShown: new Set(),
    territorySelectionCallback: null,
    troopsAllocatedThisPhase: false,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error("useGameContext must be used within a GameProvider");
    }
    return context;
};

interface GameProviderProps {
    children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
    const [gameState, setGameState] = useState<GameState>(initialState);

    useEffect(() => {
        const loadObjectives = async () => {
            try {
                const response = await fetch("/data/objectives.json");
                const objectivesData = await response.json();
                setGameState((prevState) => ({
                    ...prevState,
                    objectives: objectivesData.objectives,
                }));
            } catch (error) {
                console.error("Erro ao carregar objectives:", error);
            }
        };

        loadObjectives();
    }, []);

    const startGame = (playerCount: number) => {
        const playerColors = ["azul", "vermelho", "verde", "branco"];
        const gamePlayers = Array.from(
            { length: playerCount },
            (_, index) => new Player(index, playerColors[index])
        );

        console.log('🎮 Iniciando jogo com jogadores:', gamePlayers.map(p => ({ id: p.id, color: p.color })));

        const gameManager = new GameManager(gamePlayers);
        gameManager.distributeObjectives(gameState.objectives);

        setGameState((prevState) => ({
            ...prevState,
            gameManager,
            players: gamePlayers,
            currentPlayerIndex: 0,
            currentPhase: gameManager.getPhaseName(),
            currentRound: gameManager.round,
            gameStarted: true,
            firstRoundObjectiveShown: new Set(), 
        }));

        console.log('🎯 Estado inicial - firstRoundObjectiveShown resetado');

        EventBus.emit("players-updated", {
            playerCount,
            players: gamePlayers.map((player) => ({
                id: player.id,
                color: player.color,
                territories: player.territories,
                territoriesArmies: player.territoriesArmies,
                armies: player.armies,
            })),
        });
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

        if (
            typeof currentPlayer.objective === "object" &&
            currentPlayer.objective.id
        ) {
            return currentPlayer.objective as Objective;
        }

        return (
            gameState.objectives.find(
                (obj) =>
                    obj.title === currentPlayer.objective ||
                    obj.description === currentPlayer.objective
            ) || null
        );
    };

    const nextPhase = () => {
        if (!gameState.gameManager) return;

        gameState.gameManager.passPhase();

        setGameState((prevState) => ({
            ...prevState,
            currentPlayerIndex: gameState.gameManager!.turn,
            currentPhase: gameState.gameManager!.getPhaseName(),
            currentRound: gameState.gameManager!.round,
            troopsAllocatedThisPhase: false, // Reset allocation flag when phase changes
        }));

        EventBus.emit("players-updated", {
            playerCount: gameState.players.length,
            players: gameState.players.map((player) => ({
                id: player.id,
                color: player.color,
                territories: player.territories,
                territoriesArmies: player.territoriesArmies,
                armies: player.armies,
            })),
        });
    };

    useEffect(() => {
        const handleAttackRequest = (data: { source: string; target: string; troops: number }) => {
            console.log('🎯 GameContext recebeu attack-request:', data);
            
            try {
                if (!gameState.gameManager) {
                    console.warn('❌ No game manager available to process attack');
                    return;
                }

                const { source, target, troops } = data as any;
                console.log('🔍 Processando ataque:', { source, target, troops });
                
                const currentPlayer = getCurrentPlayer();
                if (!currentPlayer) {
                    console.warn('❌ No current player for attack');
                    return;
                }

                if (!currentPlayer.territories.includes(source)) {
                    console.warn('❌ Attack source does not belong to current player:', source);
                    return;
                }
                
                console.log('✅ Validações iniciais passaram, iniciando combate...');

                const armiesAtSource = currentPlayer.territoriesArmies?.[source] ?? 0;
                const maxAttackable = Math.min(3, Math.max(0, armiesAtSource - 1));
                if (troops > maxAttackable) {
                    console.warn('Requested troops greater than available to attack', { troops, maxAttackable });
                    return;
                }

                const defender = gameState.players.find((p) => p.territories.includes(target));
                const defenderArmies = defender?.territoriesArmies?.[target] ?? 0;

                
                const { aDice, dDice, attackerLoss, defenderLoss } = resolveAttack(troops, defenderArmies);

                currentPlayer.territoriesArmies[source] = Math.max(0, (currentPlayer.territoriesArmies[source] ?? 0) - attackerLoss);
                currentPlayer.armies = Math.max(0, currentPlayer.armies - attackerLoss);

                if (defender) {
                    defender.territoriesArmies[target] = Math.max(0, (defender.territoriesArmies[target] ?? 0) - defenderLoss);
                    defender.armies = Math.max(0, defender.armies - defenderLoss);
                }

                let conquered = false;
                if ((defender ? (defender.territoriesArmies[target] ?? 0) : 0) <= 0) {
                    conquered = true;
                    if (defender) defender.removeTerritory(target);
                    currentPlayer.addTerritory(target);

                    const survivors = Math.max(0, troops - attackerLoss);
                    const armiesBefore = armiesAtSource;
                    const sourceAfterLosses = Math.max(0, armiesBefore - attackerLoss);

                    const maxCanMove = Math.max(0, sourceAfterLosses - 1);

                    currentPlayer.territoriesArmies[target] = 0;

                    EventBus.emit('post-conquest', {
                        source,
                        target,
                        troopsRequested: troops,
                        attackerLoss,
                        defenderLoss,
                        survivors,
                        armiesBefore,
                        sourceAfterLosses,
                        maxCanMove,
                    });
                }

                EventBus.emit('players-updated', {
                    playerCount: gameState.players.length,
                    players: gameState.players.map((player) => ({
                        id: player.id,
                        color: player.color,
                        territories: player.territories,
                        territoriesArmies: player.territoriesArmies,
                        armies: player.armies,
                    })),
                });

                const attackResult = {
                    source,
                    target,
                    troopsRequested: troops,
                    attackerDice: aDice,
                    defenderDice: dDice,
                    attackerLoss,
                    defenderLoss,
                    conquered,
                };
                
                console.log('📡 Emitindo attack-result:', attackResult);
                EventBus.emit('attack-result', attackResult);
            } catch (err) {
                console.error('Error processing attack-request', err);
            }
        };

        EventBus.on('attack-request', handleAttackRequest as any);

        const handleMoveConfirm = (data: { source: string; target: string; moved: number }) => {
            const { source, target, moved } = data as any;
            applyPostConquestMove(source, target, moved);
        };

        EventBus.on('move-confirm', handleMoveConfirm as any);

        return () => {
            EventBus.removeListener('attack-request');
                EventBus.removeListener('move-confirm');
        };
    }, [gameState.gameManager, gameState.players, getCurrentPlayer]);

        const applyPostConquestMove = (source: string, target: string, moved: number) => {
            try {
                const currentPlayer = getCurrentPlayer();
                if (!currentPlayer) return;

                if (!currentPlayer.territories.includes(source) || !currentPlayer.territories.includes(target)) {
                    console.warn('applyPostConquestMove invalid: player does not own source or target', { source, target });
                    return;
                }

                const sourceAfterLosses = currentPlayer.territoriesArmies?.[source] ?? 0;
                const maxCanMove = Math.max(0, sourceAfterLosses - 1);
                const toMove = Math.max(0, Math.min(moved, maxCanMove));

                console.log('applyPostConquestMove', { source, target, moved, sourceAfterLosses, maxCanMove, toMove });
                console.log('before apply', { src: currentPlayer.territoriesArmies[source], tgt: currentPlayer.territoriesArmies[target] });

                currentPlayer.territoriesArmies[source] = Math.max(1, sourceAfterLosses - toMove);
                currentPlayer.territoriesArmies[target] = toMove;

                console.log('after apply', { src: currentPlayer.territoriesArmies[source], tgt: currentPlayer.territoriesArmies[target] });

                setGameState((prev) => {
                    const updatedPlayers = prev.players.map((p) => p);

                    const payload = updatedPlayers.map((player) => ({
                        id: player.id,
                        color: player.color,
                        territories: player.territories,
                        territoriesArmies: player.territoriesArmies,
                        armies: player.armies,
                    }));

                    console.log('GameContext: emitting players-updated with payload', {
                        playerCount: updatedPlayers.length,
                        players: payload,
                        lastMove: { source, target, toMove },
                    });

                    try {
                        console.log('GameContext: players-updated (json)', JSON.stringify({
                            playerCount: updatedPlayers.length,
                            players: payload,
                            lastMove: { source, target, toMove },
                        }, null, 2));
                    } catch (e) {}

                    EventBus.emit('players-updated', {
                        playerCount: updatedPlayers.length,
                        players: payload,
                        lastMove: { source, target, toMove },
                    });

                    return { ...prev, players: updatedPlayers };
                });
            } catch (err) {
                console.error('Error in applyPostConquestMove', err);
            }
        };

    const resetGame = () => {
        setGameState((prevState) => ({
            ...initialState,
            objectives: prevState.objectives, 
            firstRoundObjectiveShown: new Set(), 
        }));
    };

    const shouldShowAutomaticObjective = (): boolean => {
        const currentPlayer = getCurrentPlayer();
        if (!currentPlayer) return false;

        return (
            gameState.currentRound === 0 &&
            !gameState.firstRoundObjectiveShown.has(currentPlayer.id)
        );
    };

    const markObjectiveAsShown = () => {
        const currentPlayer = getCurrentPlayer();
        if (currentPlayer) {
            console.log(`Marcando objetivo como visto para jogador ${currentPlayer.id}`);
            setGameState((prevState) => ({
                ...prevState,
                firstRoundObjectiveShown: new Set(
                    prevState.firstRoundObjectiveShown.add(currentPlayer.id)
                ),
            }));
        }
    };

    const setShowObjectiveConfirmation = (show: boolean) => {
        setGameState((prevState) => ({
            ...prevState,
            showObjectiveConfirmation: show,
        }));
    };

    const setTerritorySelectionCallback = (callback: ((territory: string) => void) | null) => {
        setGameState((prevState) => ({
            ...prevState,
            territorySelectionCallback: callback,
        }));
    };

    const onTerritorySelected = (territory: string) => {
        if (gameState.territorySelectionCallback) {
            gameState.territorySelectionCallback(territory);
        }
    };

    const hasTroopsAllocatedThisPhase = () => {
        return gameState.troopsAllocatedThisPhase;
    };

    const markTroopsAllocated = () => {
        setGameState(prevState => ({
            ...prevState,
            troopsAllocatedThisPhase: true
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
        setTerritorySelectionCallback,
        onTerritorySelected,
        applyPostConquestMove,
        hasTroopsAllocatedThisPhase,
        markTroopsAllocated,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export default GameContext;
