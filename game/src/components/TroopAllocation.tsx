import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from "react";
import { useGameContext } from "../context/GameContext";
import { EventBus } from "../game/EventBus";
import "./TroopAllocation.css";

interface TroopAllocationProps {
    isVisible: boolean;
    onClose: () => void;
    isDimmed?: boolean;
}

const TroopAllocation: React.FC<TroopAllocationProps> = ({
    isVisible,
    onClose,
    isDimmed = false,
}) => {
    const { getCurrentPlayer, currentRound, players } = useGameContext();
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [lastRoundPlayer, setLastRoundPlayer] = useState<string>("");
    const [initialTroops, setInitialTroops] = useState(0);
    const lastClickTimestampRef = useRef<number>(0);
    const allocatedCountRef = useRef<number>(0);

    const currentPlayer = getCurrentPlayer();

    const calculatedTroops = useMemo(() => {
        if (!currentPlayer) return 0;
        return (currentPlayer as any).pendingReinforcements || 0;
    }, [(currentPlayer as any)?.pendingReinforcements]);

    useEffect(() => {
        if (isVisible && currentPlayer) {
            const currentRoundPlayer = `${currentRound}-${currentPlayer.id}`;

            if (lastRoundPlayer !== currentRoundPlayer) {
                console.log(
                    "🎯 Nova rodada/jogador detectada:",
                    currentRoundPlayer
                );
                setInitialTroops(calculatedTroops);
                setAllocations({});
                allocatedCountRef.current = 0;
                setLastRoundPlayer(currentRoundPlayer);
                console.log(
                    "Tropas calculadas para jogador",
                    currentPlayer.id,
                    "rodada",
                    currentRound,
                    ":",
                    calculatedTroops,
                    "tropas"
                );
            }
        }
    }, [
        isVisible,
        currentPlayer?.id,
        currentRound,
        calculatedTroops,
        lastRoundPlayer,
    ]);

    // Agora calcula restantes dinamicamente a partir de pendingReinforcements do jogador
    const getRemainingTroops = useMemo(() => {
        if (!currentPlayer) return 0;
        const pending = (currentPlayer as any).pendingReinforcements || 0;
        return pending; // backend já decrementa ao gastar
    }, [currentPlayer, (currentPlayer as any)?.pendingReinforcements]);

    const normalizeId = useCallback((name: string) => {
        return name
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9]/g, "");
    }, []);

    // Callback memorizado para alocar 1 tropa ao clicar no território
    const handleTerritorySelected = useCallback(
        (territoryId: string) => {
            const now = Date.now();
            const lastTime = lastClickTimestampRef.current;

            console.log(
                "🔥 TroopAllocation: territory-selected event received:",
                territoryId,
                "timestamp:",
                now,
                "last:",
                lastTime,
                "diff:",
                now - lastTime
            );

            // Debounce para ignorar os cliques que acontecem em menos de 200ms
            if (now - lastTime < 200) {
                console.log("Clique duplicado ignorado (debounce)");
                return;
            }

            // Atualizar o timestamp
            lastClickTimestampRef.current = now;

            // Garantir que currentPlayer não é nulo e fixar uma referência local não-nula
            if (!currentPlayer) {
                console.log("TroopAllocation: no current player");
                return;
            }
            const cp = currentPlayer;

            // Encontrar o território correspondente nos territórios do jogador
            const matchingTerritory = cp.territories.find(
                (t) => normalizeId(t) === territoryId
            );

            console.log("TroopAllocation: checking allocation", {
                territoryId,
                matchingTerritory,
                playerTerritories: cp.territories,
            });

            if (!matchingTerritory) {
                console.log("TroopAllocation: territory not owned by player");
                return;
            }

            // Verificar usando o ref para garantir que temos o valor mais atualizado
            const remaining = (cp as any).pendingReinforcements || 0;

            console.log(
                "Verificando alocação:",
                "initialTroops:",
                initialTroops,
                "allocated:",
                allocatedCountRef.current,
                "remaining:",
                remaining
            );

            if (remaining <= 0) {
                console.log(
                    "TroopAllocation: no troops remaining, blocking allocation"
                );
                return;
            }

            console.log(
                "TroopAllocation: allocating troop to",
                matchingTerritory
            );

            // Incrementar contador apenas para métricas internas (não mais usado para bloquear)
            allocatedCountRef.current += 1;

            // Atualizar o jogador imediatamente
            console.log(
                "Before addArmies - territoriesArmies:",
                cp.territoriesArmies[matchingTerritory]
            );
            // Usa gasto de reforço pendente do backend
            const spent = (cp as any).spendPendingReinforcement?.(matchingTerritory, 1);
            if (!spent) {
                // fallback legacy
                (cp as any).addArmies(matchingTerritory, 1);
            }
            console.log(
                "After addArmies - territoriesArmies:",
                cp.territoriesArmies[matchingTerritory]
            );

            // Emitir evento para atualizar o mapa inteiro
            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: players.map((player) => ({
                    id: player.id,
                    color: player.color,
                    territories: player.territories,
                    territoriesArmies: player.territoriesArmies,
                    armies: player.armies,
                    pendingReinforcements: (player as any).pendingReinforcements,
                })),
            });

            // Por último, atualizar o state local de alocações
            setAllocations((prev) => ({
                ...prev,
                [matchingTerritory]: (prev[matchingTerritory] || 0) + 1,
            }));
        },
        [currentPlayer, initialTroops, players, normalizeId]
    );

    // Registrar o listener do EventBus
    useEffect(() => {
        if (!isVisible) {
            return;
        }

        EventBus.on("territory-selected", handleTerritorySelected);

        return () => {
            EventBus.removeListener(
                "territory-selected",
                handleTerritorySelected
            );
        };
    }, [isVisible, handleTerritorySelected]);

    // Função para remover uma alocação específica
    const handleRemoveAllocation = useCallback(
        (territory: string) => {
            if (!currentPlayer) return;

            const allocated = allocations[territory];
            if (!allocated || allocated <= 0) return;

            console.log(` Removendo 1 tropa de ${territory}`);

            // Decrementar o contador
            allocatedCountRef.current = Math.max(
                0,
                allocatedCountRef.current - 1
            );
            console.log("Contador atualizado:", allocatedCountRef.current);

            // Remover 1 tropa do jogador
            const currentArmies = currentPlayer.territoriesArmies[territory] || 0;
            if (currentArmies > 0) {
                currentPlayer.territoriesArmies[territory] = currentArmies - 1;
                if (currentPlayer.armies > 0) {
                    currentPlayer.armies -= 1;
                }
                // devolver reforço ao pool pendente se desejar (simplificação: adiciona 1 de volta)
                (currentPlayer as any).pendingReinforcements = ((currentPlayer as any).pendingReinforcements || 0) + 1;
            }

            // Emitir evento para atualizar o mapa
            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: players.map((player) => ({
                    id: player.id,
                    color: player.color,
                    territories: player.territories,
                    territoriesArmies: player.territoriesArmies,
                    armies: player.armies,
                    pendingReinforcements: (player as any).pendingReinforcements,
                })),
            });

            // Atualizar o state local
            setAllocations((prev) => {
                const newValue = prev[territory] - 1;
                if (newValue <= 0) {
                    const { [territory]: _, ...rest } = prev;
                    return rest;
                }
                return {
                    ...prev,
                    [territory]: newValue,
                };
            });
        },
        [currentPlayer, allocations, players]
    );

    const handleConfirm = useCallback(() => {
        console.log("TroopAllocation: confirming allocation");
        onClose();
    }, [onClose]);

    if (!isVisible) return null;
    if (!currentPlayer) return null;

    const hasAllocations = Object.keys(allocations).length > 0;
    const allTroopsAllocated = getRemainingTroops === 0 && initialTroops > 0;

    return (
        <div className={`troop-allocation-bar ${isDimmed ? "dimmed" : ""}`}>
            <div className="troop-allocation-bar-content">
                <span>
                    Tropas para alocar: <b>{initialTroops}</b> | Restantes:{" "}
                    <b>{getRemainingTroops}</b>
                </span>
                {allTroopsAllocated && (
                    <button
                        className="confirm-allocation-btn"
                        onClick={handleConfirm}
                    >
                        Confirmar Alocação
                    </button>
                )}
            </div>

            {hasAllocations && (
                <div className="allocations-summary">
                    <div className="allocations-header">Tropas alocadas:</div>
                    <div className="allocations-list-inline">
                        {Object.entries(allocations).map(
                            ([territory, count]) => (
                                <div
                                    key={territory}
                                    className="allocation-chip"
                                >
                                    <span className="allocation-chip-text">
                                        {territory}: <b>+{count}</b>
                                    </span>
                                    <button
                                        className="allocation-chip-remove"
                                        onClick={() =>
                                            handleRemoveAllocation(territory)
                                        }
                                        title="Remover 1 tropa"
                                    >
                                        ×
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TroopAllocation;

