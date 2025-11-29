import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { GameManager } from "../../game-logic/GameManager.js";
import { Player } from "../../game-logic/Player.js";
import { createObjectiveFromJson } from "../../game-logic/Objective.js";
import resolveAttack from "../../game-logic/Combat.js";
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
    calculateReinforcementTroops: (player?: Player) => any;
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

        const cardManager = new CardManager();
        const gameManager = new GameManager(gamePlayers, cardManager);
        // Inicializa reforços para primeiro jogador
        gameManager.getPlayerPlaying().pendingReinforcements = gameManager.calculateReinforcements(gameManager.getPlayerPlaying());

        let objectiveInstances = (gameState.objectives || [])
            .map((o) => createObjectiveFromJson(o))
            .filter((o) => o !== null);

        const shuffle = (arr: any[]) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        };

        shuffle(objectiveInstances);

        if (objectiveInstances.length < gamePlayers.length) {
            console.warn("Not enough objectives for players; objectives will be reused.");
            const needed = gamePlayers.length - objectiveInstances.length;
            for (let i = 0; i < needed; i++) {
                objectiveInstances.push(objectiveInstances[i % objectiveInstances.length]);
            }
        }

        objectiveInstances = objectiveInstances.slice(0, gamePlayers.length);

        gameManager.distributeObjectives(objectiveInstances);

        gamePlayers.forEach(player => {
            const card1 = cardManager.drawCardForPlayer(player);
            const card2 = cardManager.drawCardForPlayer(player);
            const card3 = cardManager.drawCardForPlayer(player);
            const card4 = cardManager.drawCardForPlayer(player);
            if (card1) player.addCard(card1);
            if (card2) player.addCard(card2);
            if (card3) player.addCard(card3);
            if (card4) player.addCard(card4);
        });
        console.log("Cartas iniciais distribuídas (exemplo).");

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
        // Bloqueio reforços pendentes
        if (gameState.currentPhase === 'REFORÇAR' && currentPlayer && currentPlayer.pendingReinforcements > 0) {
            console.warn('Não pode avançar: ainda existem reforços para alocar.');
            return;
        }
        // Bloqueio adicional: se está na fase REFORÇAR e o jogador ainda tem tropas calculadas para alocar
        // (heurística simples: verificar número mínimo garantido pela fórmula) impedir avanço.
        if (gameState.currentPhase === 'REFORÇAR') {
            const territoryBonus = currentPlayer ? Math.max(3, Math.floor(currentPlayer.territories.length / 2)) : 0;
            const roundBonus = currentPlayer ? currentPlayer.id % 3 : 0;
            let continentBonus = 0;
            if (currentPlayer && currentPlayer.territories.length > 10) continentBonus = 2;
            const theoretical = territoryBonus + roundBonus + continentBonus + (currentPlayer && currentPlayer.id === 0 ? 4 : 0);
            // Se teórico > 0 e player não tem nenhum território recém incrementado (simplificação) bloquear se armies não cresceram
            // Usamos um marcador simples: exigir abertura manual da TroopAllocation antes (flag em armies > 0 já distribuídas inicialmente).
            // Caso precise refinamento futuro, separar pool de reforços.
            if (theoretical > 0) {
                // Verifica se jogador tem pelo menos um incremento feito nesta fase (territoriesArmies soma > baseline). Sem baseline guardado usamos heurística: se ainda existe potencial de alocação porque não abriu modal.
                // Para evitar bloquear jogador depois de alocar, front marcará modal fechado e tropasAllocatedThisPhase.
                // Se nenhum território recebeu adição nesta fase e theoretical > 0, bloquear.
            }
        }
        if (
            currentPlayer &&
            gameState.currentPhase === "REFORÇAR" &&
            currentPlayer.cards.length >= 5
        ) {
            console.warn("Não pode avançar, troca de cartas é obrigatória.");
            return;
        }

        // Toda lógica de concessão de carta pós-conquista foi movida para GameManager.passPhase
        const previousPhase = gameState.currentPhase;
        gameState.gameManager.passPhase();

        setGameState((prevState) => ({
            ...prevState,
            currentPlayerIndex: gameState.gameManager!.turn,
            currentPhase: gameState.gameManager!.getPhaseName(),
            currentRound: gameState.gameManager!.round,
        }));

        // Se veio de ATACAR, verificar carta concedida
        if (previousPhase === "ATACAR") {
            const awarded = gameState.gameManager.consumeLastAwardedCard?.();
            if (awarded) {
                EventBus.emit("card-awarded", {
                    name: awarded.name,
                    shape: awarded.geometricShape,
                });
            }
        }

        EventBus.emit("players-updated", {
            playerCount: gameState.players.length,
            players: gameState.players.map((player) => ({
                id: player.id,
                color: player.color,
                territories: player.territories,
                territoriesArmies: player.territoriesArmies,
                armies: player.armies,
                cards: player.cards,
                pendingReinforcements: player.pendingReinforcements,
            })),
        });
    };

    useEffect(() => {
        const handleAttackRequest = (data: { source: string; target: string; troops: number }) => {
            try {
                if (!gameState.gameManager) {
                    console.warn('No game manager available to process attack');
                    return;
                }

                const { source, target, troops } = data as any;
                const currentPlayer = getCurrentPlayer();
                if (!currentPlayer) {
                    console.warn('No current player for attack');
                    return;
                }

                if (!currentPlayer.territories.includes(source)) {
                    console.warn('Attack source does not belong to current player:', source);
                    return;
                }

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
                    
                    // Marcar que o jogador conquistou território nesta rodada
                    if (gameState.gameManager) {
                        gameState.gameManager.markTerritoryConquered();
                    }
                    
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

                EventBus.emit('attack-result', {
                    source,
                    target,
                    troopsUsed: troops,
                    attackerDice: aDice,
                    defenderDice: dDice,
                    attackerLoss,
                    defenderLoss,
                    conquered,
                    attackerColor: currentPlayer.color,
                    defenderColor: defender?.color || 'neutro',
                });
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
                if (!cardManager || !currentPlayer || !data.cards) {
                    console.warn("Troca de cartas falhou: contexto inválido.");
                    return;
                }

                console.log(
                    `GameContext: Processando troca para ${currentPlayer.id} com`,
                    data.cards
                );

                cardManager.executeCardExchange(data.cards, currentPlayer);

                // 2. Remove as cartas da mão do jogador (mutação da instância)
                const exchangedCardNames = new Set(data.cards.map((c) => c.name));
                currentPlayer.cards = currentPlayer.cards.filter(
                    (card: any) => !exchangedCardNames.has(card.name)
                );

                // 3. Se alguma das cartas tinha território do jogador, já foi aplicado bônus exclusivo na CardManager.
                // Aqui apenas log para facilitar depuração.
                data.cards.forEach(card => {
                    if (currentPlayer.hasTerritory(card.name)) {
                        console.log(`Bônus de +2 tropas aplicado diretamente em ${card.name}`);
                    }
                });

                console.log("Exércitos adicionados:", currentPlayer.armies);
                console.log("Cartas restantes:", currentPlayer.cards.length);

                setGameState((prev) => ({
                    ...prev,
                    players: [...prev.players], 
                }));

                EventBus.emit("players-updated", {
                    playerCount: gameState.players.length,
                    players: gameState.players.map((p) => ({
                        id: p.id,
                        color: p.color,
                        territories: p.territories,
                        territoriesArmies: p.territoriesArmies,
                        armies: p.armies,
                    })),
                });
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

    const calculateReinforcementTroops = (player?: Player) => {
        const targetPlayer = player || getCurrentPlayer();
        if (!targetPlayer || !gameState.gameManager) {
            return { totalTroops: 0, territoryBonus: 0, continentBonus: 0, cardBonus: 0, continentBonuses: {} };
        }

        return (gameState.gameManager as any).calculateReinforcementTroops(targetPlayer);
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
        calculateReinforcementTroops,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
};

export default GameContext;
