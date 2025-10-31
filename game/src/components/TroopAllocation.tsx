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
}

const TroopAllocation: React.FC<TroopAllocationProps> = ({
    isVisible,
    onClose,
}) => {
    const { getCurrentPlayer, currentRound, players } = useGameContext();
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [lastRoundPlayer, setLastRoundPlayer] = useState<string>("");
    const [initialTroops, setInitialTroops] = useState(0);
    const lastClickTimestampRef = useRef<number>(0);

    const currentPlayer = getCurrentPlayer();

    const calculatedTroops = useMemo(() => {
        if (!currentPlayer) return 0;

        let territoryBonus = Math.max(
            3,
            Math.floor(currentPlayer.territories.length / 2)
        );

        const roundBonus = currentPlayer.id % 3;

        let continentBonus = 0;
        if (currentPlayer.territories.length > 10) {
            continentBonus = 2;
        }

        let cardBonus = 0;
        if (currentPlayer.id === 0) {
            cardBonus = 4;
        }

        const total = territoryBonus + roundBonus + continentBonus + cardBonus;

        console.log(
            "Tropas calculadas para jogador",
            currentPlayer.id,
            ":",
            total
        );

        // TODO: Integrar com o back-end real
        return Math.min(total, 20); // Máximo de 20 tropas para teste
    }, [currentPlayer?.id, currentPlayer?.territories.length]);

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

    const getRemainingTroops = useMemo(() => {
        const allocated = Object.values(allocations).reduce(
            (sum, val) => sum + val,
            0
        );
        return Math.max(0, initialTroops - allocated);
    }, [initialTroops, allocations]);

    // Fechar automaticamente quando todas as tropas forem alocadas
    useEffect(() => {
        if (getRemainingTroops === 0 && initialTroops > 0) {
            console.log("TroopAllocation: all troops allocated, closing...");
            // Pequeno delay para o usuário ver que chegou a zero
            setTimeout(() => {
                onClose();
            }, 500);
        }
    }, [getRemainingTroops, initialTroops, onClose]);

    const normalizeId = useCallback((name: string) => {
        return name
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9]/g, "");
    }, []);

    // Callback memoizado para alocar 1 tropa ao clicar no território
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

            // Debounce: ignorar cliques que acontecem em menos de 200ms
            if (now - lastTime < 200) {
                console.log("⚠️ Clique duplicado ignorado (debounce)");
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

            // Primeiro verificar se podemos alocar
            const currentAllocated = Object.values(allocations).reduce(
                (sum, val) => sum + val,
                0
            );
            const remaining = Math.max(0, initialTroops - currentAllocated);

            if (remaining <= 0) {
                console.log("TroopAllocation: no troops remaining");
                return;
            }

            console.log(
                "TroopAllocation: allocating troop to",
                matchingTerritory
            );

            // Atualizar o jogador imediatamente (ANTES de atualizar o state)
            console.log(
                "🪖 Before addArmies - territoriesArmies:",
                cp.territoriesArmies[matchingTerritory]
            );
            (cp as any).addArmies(matchingTerritory, 1);
            console.log(
                "🪖 After addArmies - territoriesArmies:",
                cp.territoriesArmies[matchingTerritory]
            );

            // Emitir evento para atualizar o mapa com TODOS os jogadores
            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: players.map((player) => ({
                    id: player.id,
                    color: player.color,
                    territories: player.territories,
                    territoriesArmies: player.territoriesArmies,
                    armies: player.armies,
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

    if (!isVisible) return null;
    if (!currentPlayer) return null;

    return (
        <div className="troop-allocation-bar">
            <div className="troop-allocation-bar-content">
                <span>
                    Tropas para alocar: <b>{initialTroops}</b> | Restantes:{" "}
                    <b>{getRemainingTroops}</b>
                </span>
            </div>
            <div className="troop-allocation-bar-hint">
                Clique em seus territórios para alocar tropas (+1 por clique)
            </div>
        </div>
    );
};

export default TroopAllocation;

