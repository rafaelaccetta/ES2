import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from "react";
import { GameManager } from "../../game-logic/GameManager.js";
import { Player } from "../../game-logic/Player.js";
import { createObjectiveFromJson } from "../../game-logic/Objective.js";
import { EventBus } from "../game/EventBus";
import { CardManager } from "../../game-logic/CardManager.js";
import { PlayerCards } from "../../game-logic/PlayerCards.js";

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
    cardManager: CardManager | null;
    players: Player[];
    currentPlayerIndex: number;
    currentPhase: string;
    currentRound: number;
    objectives: Objective[];
    gameStarted: boolean;
    showObjectiveConfirmation: boolean;
    firstRoundObjectiveShown: Set<number>;
    territorySelectionCallback: ((territory: string) => void) | null;
    fortificationBudget: Record<string, number>;
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
    moveArmies: (source: string, target: string, moved: number) => void;
    calculateReinforcementTroops: (player?: Player) => any;
    placeReinforcement: (territory: string) => void;
    undoReinforcement: (territory: string, type: 'exclusive' | 'continent' | 'free') => void;
}

const initialState: GameState = {
    gameManager: null,
    cardManager: null,
    players: [],
    currentPlayerIndex: 0,
    currentPhase: "REFORÇAR",
    currentRound: 0,
    objectives: [],
    gameStarted: false,
    showObjectiveConfirmation: false,
    firstRoundObjectiveShown: new Set(),
    territorySelectionCallback: null,
    fortificationBudget: {},
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

    const broadcastGameState = useCallback(() => {
        if (!gameState.gameManager) return;

        const playersPayload = gameState.gameManager.players.map((p) => {
            const territoriesArmies: Record<string, number> = {};
            p.territories.forEach((t) => {
                territoriesArmies[t] = gameState.gameManager!.getTerritoryArmies(t);
            });

            const exclusiveArmies: Record<string, number> = {};
            if (p.armiesExclusiveToTerritory) {
                for (const [t, amount] of p.armiesExclusiveToTerritory.entries()) {
                    if (amount > 0) exclusiveArmies[t] = amount;
                }
            }

            return Object.assign(Object.create(Object.getPrototypeOf(p)), p, {
                territoriesArmies: territoriesArmies,
                pendingReinforcements: p.armies,
                exclusiveArmies: exclusiveArmies
            });
        });

        const budget = { ...((gameState.gameManager as any).fortificationBudget || {}) };

        setGameState(prev => ({
            ...prev,
            players: playersPayload,
            fortificationBudget: budget
        }));

        EventBus.emit("players-updated", {
            playerCount: gameState.players.length,
            players: playersPayload,
        });
    }, [gameState.gameManager, gameState.players.length]);


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

    useEffect(() => {
        const handleRequestState = () => {
            broadcastGameState();
        };
        EventBus.on("request-game-state", handleRequestState);
        return () => {
            EventBus.removeListener("request-game-state", handleRequestState);
        };
    }, [broadcastGameState]);

    useEffect(() => {
        if (!gameState.gameStarted || !gameState.gameManager) return;

        const currentPlayer = gameState.gameManager.getPlayerPlaying();

        if (currentPlayer && currentPlayer.isAI && currentPlayer.isActive) {
            console.log(`🤖 Detetada vez da IA (${currentPlayer.color}). Executando...`);

            gameState.gameManager.executeAITurn();

            setGameState((prevState) => ({
                ...prevState,
                currentPlayerIndex: gameState.gameManager!.turn,
                currentPhase: gameState.gameManager!.getPhaseName(),
                currentRound: gameState.gameManager!.round,
            }));

            broadcastGameState();
        }
    }, [
        gameState.gameStarted,
        gameState.currentPlayerIndex,
        gameState.currentPhase,
        gameState.gameManager,
        broadcastGameState
    ]);

    const startGame = (playerCount: number) => {
        const playerColors = ["azul", "vermelho", "verde", "branco"];
        const gamePlayers = Array.from(
            { length: 4 },
            (_, index) => new Player(index, playerColors[index], null, (index >= playerCount))
        );

        console.log('🎮 Iniciando jogo com jogadores:', gamePlayers.map(p => ({ id: p.id, color: p.color, isAI: p.isAI })));

        const cardManager = new CardManager();
        const gameManager = new GameManager(gamePlayers, cardManager);

        let objectiveInstances = (gameState.objectives || [])
            .map((o) => createObjectiveFromJson(o))
            .filter((o) => o !== null);

        for (let i = objectiveInstances.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [objectiveInstances[i], objectiveInstances[j]] = [objectiveInstances[j], objectiveInstances[i]];
        }

        if (objectiveInstances.length < gamePlayers.length) {
            const needed = gamePlayers.length - objectiveInstances.length;
            for (let i = 0; i < needed; i++) {
                objectiveInstances.push(objectiveInstances[i % objectiveInstances.length]);
            }
        }

        objectiveInstances = objectiveInstances.slice(0, gamePlayers.length);
        gameManager.distributeObjectives(objectiveInstances);

        setGameState((prevState) => ({
            ...prevState,
            gameManager,
            cardManager,
            players: gamePlayers,
            currentPlayerIndex: 0,
            currentPhase: gameManager.getPhaseName(),
            currentRound: gameManager.round,
            gameStarted: true,
            firstRoundObjectiveShown: new Set(),
        }));

        const playersPayload = gamePlayers.map((p) => {
            const territoriesArmies: Record<string, number> = {};
            p.territories.forEach((t) => {
                territoriesArmies[t] = gameManager.getTerritoryArmies(t);
            });
            return Object.assign(Object.create(Object.getPrototypeOf(p)), p, {
                territoriesArmies: territoriesArmies,
                pendingReinforcements: p.armies,
                exclusiveArmies: {}
            });
        });

        EventBus.emit("players-updated", {
            playerCount,
            players: playersPayload
        });
    };

    const getCurrentPlayer = (): Player | null => {
        if (gameState.players.length > 0 && gameState.currentPlayerIndex < gameState.players.length) {
            return gameState.players[gameState.currentPlayerIndex];
        }
        if (gameState.gameManager) {
            return gameState.gameManager.getPlayerPlaying();
        }
        return null;
    };

    const getCurrentObjective = (): Objective | null => {
        const currentPlayer = getCurrentPlayer();
        if (!currentPlayer || !currentPlayer.objective) {
            return null;
        }

        if (typeof currentPlayer.objective === "object") {
            const obj = currentPlayer.objective as any;
            if (obj.id || obj.title || obj.description) {
                return {
                    id: obj.id || -1,
                    type: obj.type || "custom",
                    title: obj.title || (obj.description ? obj.description.slice(0, 30) : ""),
                    description: obj.description || "",
                    target: obj.target || {},
                } as Objective;
            }
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

        const currentPlayer = getCurrentPlayer();
        const reserves = (currentPlayer as any).pendingReinforcements || currentPlayer.armies || 0;

        if (gameState.currentPhase === 'REFORÇAR' && currentPlayer && reserves > 0) {
            console.warn('Não pode avançar: ainda existem reforços para alocar.');
            return;
        }

        if (currentPlayer && gameState.currentPhase === "REFORÇAR" && currentPlayer.cards.length >= 5) {
            console.warn("Não pode avançar, troca de cartas é obrigatória.");
            return;
        }

        const previousPhase = gameState.currentPhase;

        gameState.gameManager.passPhase();

        setGameState((prevState) => ({
            ...prevState,
            currentPlayerIndex: gameState.gameManager!.turn,
            currentPhase: gameState.gameManager!.getPhaseName(),
            currentRound: gameState.gameManager!.round,
        }));

        if (previousPhase === "FORTIFICAR") {
            gameState.gameManager.consumeLastAwardedCard?.();
        }

        broadcastGameState();
    };

    const placeReinforcement = (territory: string) => {
        const gm = gameState.gameManager;
        const rawPlayer = gm?.getPlayerPlaying();

        if (!gm || !rawPlayer) return;

        if (rawPlayer.hasTerritory(territory) && rawPlayer.armies > 0) {
            const exclusiveCount = rawPlayer.armiesExclusiveToTerritory.get(territory) || 0;
            if (exclusiveCount > 0) {
                rawPlayer.removeArmiesExclusive(territory, 1);
            }

            rawPlayer.removeArmies(1);
            gm.gameMap.addArmy(territory, 1);
            broadcastGameState();
        }
    };

    const undoReinforcement = (territory: string, type: 'exclusive' | 'continent' | 'free') => {
        const gm = gameState.gameManager;
        const rawPlayer = gm?.getPlayerPlaying();
        if (!gm || !rawPlayer) return;

        try {
            gm.gameMap.removeArmy(territory, 1);

            if (type === 'exclusive') {
                rawPlayer.addArmiesExclusive(territory, 1);
            } else {
                rawPlayer.addArmies(1);
            }
            broadcastGameState();
        } catch (e) {
            console.error("Undo Reinforcement failed:", e);
        }
    };

    useEffect(() => {
        const handleAttackRequest = (data: { source: string; target: string; troops: number }) => {
            if (!gameState.gameManager) return;
            const gm = gameState.gameManager;

            try {
                const { source, target, troops } = data as any;
                const currentPlayer = getCurrentPlayer();
                if (!currentPlayer) return;

                const result = gm.resolveAttack(source, target, troops);

                if (!result.success) {
                    console.warn("Attack failed validation in backend");
                    return;
                }

                const aDice = (result as any).attackRolls || [];
                const dDice = (result as any).defenseRolls || [];
                const defender = gm.getTerritoryOwner(target);

                EventBus.emit('attack-result', {
                    source,
                    target,
                    troopsUsed: troops,
                    attackerDice: aDice,
                    defenderDice: dDice,
                    attackerLoss: result.attackLosses,
                    defenderLoss: result.defenseLosses,
                    conquered: result.conquered,
                    attackerColor: currentPlayer.color,
                    defenderColor: defender?.color || 'neutro',
                });

                if (result.conquered) {
                    // FIX: Calculate maxCanMove based on attacking troops, not total armies.
                    // This enforces the rule that only participating troops can move.
                    const armiesLeftAtSource = gm.getTerritoryArmies(source);
                    // The number of optional troops you can move is the number you attacked with,
                    // minus any losses, minus the one that MUST stay behind.
                    // However, a simpler interpretation is troops you attacked with, minus 1 (the auto-move).
                    const optionalMoves = troops - 1;

                    // Ensure you can't move more than what's physically left.
                    const physicalLimit = armiesLeftAtSource - 1;
                    const maxCanMove = Math.min(optionalMoves, physicalLimit);

                    EventBus.emit('post-conquest', {
                        source,
                        target,
                        troopsRequested: troops,
                        attackerLoss: result.attackLosses,
                        defenderLoss: result.defenseLosses,
                        survivors: troops - result.attackLosses,
                        maxCanMove: Math.max(0, maxCanMove)
                    });

                    // --- MERGED VICTORY LOGIC ---
                    try {
                        const objectiveGameState: any = {
                            players: gm.players,
                            getTerritoriesByContinent: () => gm.gameMap?.getTerritoriesByContinent?.(),
                        };

                        for (const p of gm.players) {
                            if (!p.isActive) continue;

                            const hasWon = p.checkWin(objectiveGameState);
                            if (hasWon) {
                                EventBus.emit('game-won', {
                                    winnerId: p.id,
                                    winnerColor: p.color,
                                    winnerObjective: p.objective.title || p.objective.description || null,
                                });
                                break;
                            }
                        }
                    } catch (e) {
                        console.error('Error while processing post-conquest objective checks', e);
                    }
                }

            } catch (err) {
                console.error('Error processing attack-request', err);
            } finally {
                broadcastGameState();
            }
        };

        EventBus.on('attack-request', handleAttackRequest as any);

        const handleMoveConfirm = (data: { source: string; target: string; moved: number }) => {
            const { source, target, moved } = data as any;
            applyPostConquestMove(source, target, moved);
        };

        EventBus.on('move-confirm', handleMoveConfirm as any);

        const handleCardExchange = (data: { cards: PlayerCards[] }) => {
            try {
                const { cardManager } = gameState;
                const currentPlayer = gameState.gameManager?.getPlayerPlaying();
                if (!cardManager || !currentPlayer || !data.cards) return;

                cardManager.executeCardExchange(data.cards, currentPlayer);
                broadcastGameState();

            } catch (err) {
                console.error("Erro ao processar card-exchange-request", err);
            }
        };

        EventBus.on("card-exchange-request", handleCardExchange as any);


        return () => {
            EventBus.removeListener('attack-request');
            EventBus.removeListener('move-confirm');
            EventBus.removeListener("card-exchange-request", handleCardExchange);

        };
    }, [gameState.gameManager, gameState.players, getCurrentPlayer, broadcastGameState]);

    const applyPostConquestMove = (source: string, target: string, moved: number) => {
        if (!gameState.gameManager) return;

        if (moved > 0) {
            gameState.gameManager.moveTroops(source, target, moved);
        }

        broadcastGameState();
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

    const calculateReinforcementTroops = (player?: Player) => {
        const targetPlayer = player || getCurrentPlayer();
        if (!targetPlayer || !gameState.gameManager) {
            return { totalTroops: 0, territoryBonus: 0, continentBonus: 0, cardBonus: 0, continentBonuses: {} };
        }
        return (gameState.gameManager as any).calculateReinforcementTroops(targetPlayer);
    };

    const moveArmies = (source: string, target: string, moved: number) => {
        if (!gameState.gameManager) return;
        gameState.gameManager.moveTroops(source, target, moved);
        broadcastGameState();
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
        moveArmies,
        applyPostConquestMove,
        calculateReinforcementTroops,
        placeReinforcement,
        undoReinforcement,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export default GameContext;