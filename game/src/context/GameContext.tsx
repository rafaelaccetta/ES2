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
    placeReinforcement: (territory: string) => void; // New helper
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

    // --- HELPER: Build snapshot for UI consumption ---
    // The UI expects a specific structure (like territoriesArmies) that currently
    // lives inside GameMap, not the Player object. This bridges the gap.
    const broadcastGameState = useCallback(() => {
        if (!gameState.gameManager) return;

        const playersPayload = gameState.gameManager.players.map((p) => {
            // Reconstruct the {Territory: Count} object for the frontend
            const territoriesArmies: Record<string, number> = {};
            p.territories.forEach((t) => {
                territoriesArmies[t] = gameState.gameManager!.getTerritoryArmies(t);
            });

            return {
                id: p.id,
                color: p.color,
                territories: p.territories,
                territoriesArmies: territoriesArmies,
                // Map the backend 'armies' (Reserve) to the UI's 'pendingReinforcements'
                armies: p.armies,
                pendingReinforcements: p.armies,
                cards: p.cards,
            };
        });

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

    const startGame = (playerCount: number) => {
        const playerColors = ["azul", "vermelho", "verde", "branco"];
        const gamePlayers = Array.from(
            { length: 4 },
            (_, index) => new Player(index, playerColors[index], null, (index >= playerCount))
        );

        console.log('🎮 Iniciando jogo com jogadores:', gamePlayers.map(p => ({ id: p.id, color: p.color })));

        const cardManager = new CardManager();
        const gameManager = new GameManager(gamePlayers, cardManager);

        let objectiveInstances = (gameState.objectives || [])
            .map((o) => createObjectiveFromJson(o))
            .filter((o) => o !== null);

        // Shuffle Objectives
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

        // Need to wait for state update to settle or just emit immediately with local variables?
        // Emitting immediately using the instances we just created is safer.
        const playersPayload = gamePlayers.map((p) => {
            const territoriesArmies: Record<string, number> = {};
            p.territories.forEach((t) => {
                territoriesArmies[t] = gameManager.getTerritoryArmies(t);
            });
            return {
                id: p.id,
                color: p.color,
                territories: p.territories,
                territoriesArmies: territoriesArmies,
                armies: p.armies,
                pendingReinforcements: p.armies,
            };
        });

        EventBus.emit("players-updated", {
            playerCount,
            players: playersPayload
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

        // Check reserve pool (mapped from p.armies)
        if (gameState.currentPhase === 'REFORÇAR' && currentPlayer && currentPlayer.armies > 0) {
            console.warn('Não pode avançar: ainda existem reforços para alocar.');
            return;
        }

        if (currentPlayer && gameState.currentPhase === "REFORÇAR" && currentPlayer.cards.length >= 5) {
            console.warn("Não pode avançar, troca de cartas é obrigatória.");
            return;
        }

        const previousPhase = gameState.currentPhase;
        const previousPlayer = getCurrentPlayer();

        // Execute Backend Logic
        gameState.gameManager.passPhase();

        setGameState((prevState) => ({
            ...prevState,
            currentPlayerIndex: gameState.gameManager!.turn,
            currentPhase: gameState.gameManager!.getPhaseName(),
            currentRound: gameState.gameManager!.round,
        }));

        // Handle Card Awarding (Logic moved to backend, checking result here)
        if (previousPhase === "FORTIFICAR") {
            const awarded = gameState.gameManager.consumeLastAwardedCard?.();
            if (awarded) {
                const colorMap: Record<string, string> = {
                    azul: "#2563eb",
                    vermelho: "#dc2626",
                    verde: "#16a34a",
                    branco: "#b7c0cd",
                };
                const playerColorHex = previousPlayer ? (colorMap[previousPlayer.color] || '#fbbf24') : '#fbbf24';
                EventBus.emit("card-awarded", {
                    name: awarded.name,
                    shape: awarded.geometricShape,
                    playerColor: playerColorHex,
                });
            }
        }

        broadcastGameState();
    };

    // --- REINFORCEMENT PLACEMENT (Frontend Helper) ---
    // The backend's executeAIPlacement handles this for AI, but for humans
    // we need to bridge the UI click to the GameManager.
    const placeReinforcement = (territory: string) => {
        const gm = gameState.gameManager;
        const player = getCurrentPlayer();
        if (!gm || !player) return;

        if (player.hasTerritory(territory) && player.armies > 0) {
            // Decrease reserve
            player.removeArmies(1);
            // Increase board
            gm.gameMap.addArmy(territory, 1);

            broadcastGameState();
        }
    };


    useEffect(() => {
        const handleAttackRequest = (data: { source: string; target: string; troops: number }) => {
            try {
                if (!gameState.gameManager) return;

                const { source, target, troops } = data as any;
                const currentPlayer = getCurrentPlayer();
                if (!currentPlayer) return;

                // --- DELEGATE TO BACKEND ---
                const result = gameState.gameManager.resolveAttack(source, target);

                // If the backend call was invalid (e.g. bad validation), it returns success:false
                if (!result.success) {
                    console.warn("Attack failed validation in backend");
                    return;
                }

                // Note: The backend currently calculates dice internally but might not return them 
                // in the structure expected by the UI. 
                // We construct a mock dice result if the backend doesn't provide it, 
                // or use the backend's data if available.
                // Assuming GameManager has been updated or we accept visual desync for dice.
                const aDice = (result as any).attackRolls || [];
                const dDice = (result as any).defenseRolls || [];

                EventBus.emit('attack-result', {
                    source,
                    target,
                    troopsUsed: troops,
                    attackerDice: aDice, // Might be empty if backend doesn't return them
                    defenderDice: dDice,
                    attackerLoss: result.attackLosses,
                    defenderLoss: result.defenseLosses,
                    conquered: result.conquered,
                    attackerColor: currentPlayer.color,
                    defenderColor: gameState.gameManager.getTerritoryOwner(target)?.color || 'neutro',
                });

                if (result.conquered) {
                    EventBus.emit('post-conquest', {
                        source,
                        target,
                        troopsRequested: troops,
                        attackerLoss: result.attackLosses,
                        defenderLoss: result.defenseLosses,
                        // Logic for survivors/move is tricky without backend guidance, 
                        // but map is already updated by resolveAttack
                        survivors: troops - result.attackLosses,
                        maxCanMove: gameState.gameManager.getTerritoryArmies(source) - 1,
                    });
                }

                broadcastGameState();

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

        const handleCardExchange = (data: { cards: PlayerCards[] }) => {
            try {
                const { cardManager } = gameState;
                const currentPlayer = getCurrentPlayer();
                if (!cardManager || !currentPlayer || !data.cards) return;

                cardManager.executeCardExchange(data.cards, currentPlayer);

                // Update UI
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

        // Delegate to backend
        gameState.gameManager.moveTroops(source, target, moved);
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

        // Delegate to backend
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
        placeReinforcement, // Exported for TroopAllocation to use
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export default GameContext;