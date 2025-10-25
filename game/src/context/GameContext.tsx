import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { GameManager } from "../../game-logic/GameManager.js";
import { Player } from "../../game-logic/Player.js";
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
            firstRoundObjectiveShown: new Set(), // Reset para novo jogo
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
        }));

        // Notificar a cena Jogo com os estados atualizados
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
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export default GameContext;
