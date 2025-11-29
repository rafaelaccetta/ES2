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
    const { getCurrentPlayer, currentRound, players, calculateReinforcementTroops, gameManager } = useGameContext() as any;
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [lastRoundPlayer, setLastRoundPlayer] = useState<string>("");
    const [initialTroops, setInitialTroops] = useState(0);
    const [continentPools, setContinentPools] = useState<Record<string, number>>({});
    const [allocationPhase, setAllocationPhase] = useState<'continent' | 'free'>('continent');
    const [currentContinentFocus, setCurrentContinentFocus] = useState<string | null>(null);
    const [initialContinentBonus, setInitialContinentBonus] = useState(0); // Total de tropas de bônus de continente
    const [continentTroopsSpent, setContinentTroopsSpent] = useState(0); // Quantas tropas de continente já foram gastas
    const lastClickTimestampRef = useRef<number>(0);
    const allocatedCountRef = useRef<number>(0);

    const currentPlayer = getCurrentPlayer();

    const calculatedTroops = useMemo(() => {
        if (!currentPlayer) return 0;
        return (currentPlayer as any).pendingReinforcements || 0;
    }, [(currentPlayer as any)?.pendingReinforcements]);

    const reinforcementBreakdown = useMemo(() => {
        if (!currentPlayer) return null as any;
        const calc = calculateReinforcementTroops(currentPlayer) as any;
        const base = (calc?.territoryBonus || 0) + (calc?.continentBonus || 0);
        const pending = (currentPlayer as any).pendingReinforcements || 0;
        const cardBonus = Math.max(0, pending - base);
        const continents = Object.keys(calc?.continentBonuses || {});
        return { base, cardBonus, territoryBonus: calc?.territoryBonus || 0, continentBonus: calc?.continentBonus || 0, continents };
    }, [currentPlayer, (currentPlayer as any)?.pendingReinforcements]);

    // Calcula tropas restantes baseado na fase
    const getRemainingTroops = useMemo(() => {
        if (!currentPlayer) return 0;
        
        if (allocationPhase === 'continent' && currentContinentFocus) {
            // Durante fase de continente, mostrar apenas as tropas daquele continente
            return continentPools[currentContinentFocus] || 0;
        } else {
            // Durante fase livre, mostrar tropas livres (total - bônus de continente)
            const pending = (currentPlayer as any).pendingReinforcements || 0;
            const remaining = pending - (initialContinentBonus - continentTroopsSpent);
            return Math.max(0, remaining);
        }
    }, [currentPlayer, allocationPhase, currentContinentFocus, continentPools, (currentPlayer as any)?.pendingReinforcements, initialContinentBonus, continentTroopsSpent]);

    useEffect(() => {
        if (isVisible && currentPlayer) {
            const currentRoundPlayer = `${currentRound}-${currentPlayer.id}`;

            if (lastRoundPlayer !== currentRoundPlayer) {
                console.log(
                    "Nova rodada/jogador detectada:",
                    currentRoundPlayer
                );
                setInitialTroops(calculatedTroops);
                setAllocations({});
                allocatedCountRef.current = 0;
                setLastRoundPlayer(currentRoundPlayer);
                setContinentTroopsSpent(0);
                
                // Inicializa pools por continente a partir do cálculo do reforço
                const calc = calculateReinforcementTroops(currentPlayer) as any;
                const pools: Record<string, number> = {};
                Object.entries(calc?.continentBonuses || {}).forEach(([continentName, bonus]) => {
                    pools[continentName] = Number(bonus) || 0;
                });
                setContinentPools(pools);
                
                // Determinar fase inicial: se há bônus de continente, começar em 'continent'
                const totalContinentBonus = Object.values(pools).reduce((s: number, v: number) => s + v, 0);
                setInitialContinentBonus(totalContinentBonus);
                
                if (totalContinentBonus > 0) {
                    setAllocationPhase('continent');
                    // Pegar o primeiro continente com saldo
                    const firstContinent = Object.keys(pools).find(c => pools[c] > 0);
                    setCurrentContinentFocus(firstContinent || null);
                } else {
                    setAllocationPhase('free');
                    setCurrentContinentFocus(null);
                }
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
                (t: string) => normalizeId(t) === territoryId
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
            // Obter o continente do território selecionado
            let territoryContinent: string | null = null;
            try {
                const tbc = (gameManager?.gameMap?.getTerritoriesByContinent?.() || {}) as Record<string, string[]>;
                for (const [continentName, list] of Object.entries(tbc)) {
                    if (list.includes(matchingTerritory)) {
                        territoryContinent = continentName;
                        break;
                    }
                }
            } catch {}

            // Lógica de bloqueio por fase:
            // Fase 'continent': só permite alocar no continente em foco
            if (allocationPhase === 'continent') {
                if (!currentContinentFocus || territoryContinent !== currentContinentFocus) {
                    console.log("Alocação bloqueada: deve alocar no continente", currentContinentFocus);
                    return;
                }
                // Verificar se ainda há tropas desse continente para alocar
                const continentRemaining = continentPools[currentContinentFocus] || 0;
                if (continentRemaining <= 0) {
                    console.log("Alocação bloqueada: sem tropas restantes do continente", currentContinentFocus);
                    return;
                }
            } else {
                // Fase 'free': verificar se há tropas livres
                const pending = (cp as any).pendingReinforcements || 0;
                const freeRemaining = pending - (initialContinentBonus - continentTroopsSpent);
                if (freeRemaining <= 0) {
                    console.log("Alocação bloqueada: sem tropas livres restantes");
                    return;
                }
            }

            console.log(
                "Verificando alocação:",
                "phase:", allocationPhase,
                "initialTroops:",
                initialTroops,
                "remaining:",
                remaining
            );

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

            // Decrementar pool do continente em foco (se estamos em fase continent)
            if (allocationPhase === 'continent' && currentContinentFocus) {
                setContinentTroopsSpent(prev => prev + 1);
                
                setContinentPools((prev) => {
                    const updated = {
                        ...prev,
                        [currentContinentFocus!]: Math.max(0, (prev[currentContinentFocus!] || 0) - 1),
                    };
                    return updated;
                });
            }
            console.log(
                "After addArmies - territoriesArmies:",
                cp.territoriesArmies[matchingTerritory]
            );

            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: players.map((player: any) => ({
                    id: player.id,
                    color: player.color,
                    territories: player.territories,
                    territoriesArmies: player.territoriesArmies,
                    armies: player.armies,
                    pendingReinforcements: (player as any).pendingReinforcements,
                })),
            });

            setAllocations((prev) => ({
                ...prev,
                [matchingTerritory]: (prev[matchingTerritory] || 0) + 1,
            }));
        },
        [currentPlayer, initialTroops, players, normalizeId, continentPools, gameManager, allocationPhase, currentContinentFocus, initialContinentBonus, continentTroopsSpent]
    );

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

            allocatedCountRef.current = Math.max(
                0,
                allocatedCountRef.current - 1
            );
            console.log("Contador atualizado:", allocatedCountRef.current);

            const currentArmies = currentPlayer.territoriesArmies[territory] || 0;
            if (currentArmies > 0) {
                currentPlayer.territoriesArmies[territory] = currentArmies - 1;
                if (currentPlayer.armies > 0) {
                    currentPlayer.armies -= 1;
                }
                (currentPlayer as any).pendingReinforcements = ((currentPlayer as any).pendingReinforcements || 0) + 1;
            }

            // Se estamos na fase de continente, devolver a tropa ao pool
            if (allocationPhase === 'continent' && currentContinentFocus) {
                setContinentTroopsSpent(prev => Math.max(0, prev - 1));
                setContinentPools((prev) => ({
                    ...prev,
                    [currentContinentFocus!]: (prev[currentContinentFocus!] || 0) + 1,
                }));
            }

            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: players.map((player: any) => ({
                    id: player.id,
                    color: player.color,
                    territories: player.territories,
                    territoriesArmies: player.territoriesArmies,
                    armies: player.armies,
                    pendingReinforcements: (player as any).pendingReinforcements,
                })),
            });

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
        [currentPlayer, allocations, players, allocationPhase, currentContinentFocus]
    );

    const handleConfirm = useCallback(() => {
        console.log("TroopAllocation: confirming allocation for phase", allocationPhase);
        if (allocationPhase === 'continent') {
            const remaining = continentPools[currentContinentFocus || ''] || 0;
            if (remaining > 0) {
                console.warn("Ainda há tropas do continente", currentContinentFocus, "para alocar:", remaining);
                return;
            }
            // ✅ EFETIVA as alocações do continente no backend emitindo evento
            console.log("✅ Tropas de continente confirmadas. Efetivando no backend.");
            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: players.map((player: any) => ({
                    id: player.id,
                    color: player.color,
                    territories: player.territories,
                    territoriesArmies: player.territoriesArmies,
                    armies: player.armies,
                    pendingReinforcements: (player as any).pendingReinforcements,
                })),
            });

            // Limpa visualização das tropas já confirmadas
            setAllocations({}); 
            
            // Buscar próximo continente com tropas
            const nextContinent = Object.keys(continentPools).find(c => (continentPools[c] || 0) > 0);
            if (nextContinent) {
                console.log("➡️ Próximo continente:", nextContinent);
                setCurrentContinentFocus(nextContinent);
            } else {
                console.log("✅ Todos continentes confirmados. Liberando fase livre.");
                setAllocationPhase('free');
                setCurrentContinentFocus(null);
            }
        } else {
            if (getRemainingTroops === 0) {
                onClose();
            }
        }
    }, [allocationPhase, continentPools, currentContinentFocus, getRemainingTroops, onClose, players]);

    if (!isVisible) return null;
    if (!currentPlayer) return null;

    const hasAllocations = Object.keys(allocations).length > 0;

    return (
        <div className={`troop-allocation-bar ${isDimmed ? "dimmed" : ""}`}>
            <div className="troop-allocation-bar-content">
                {allocationPhase === 'continent' && currentContinentFocus ? (
                    <>
                        <span style={{ fontSize: 14, fontWeight: 'bold' }}>
                            Distribua <b>{continentPools[currentContinentFocus] || 0}</b> tropas {currentContinentFocus.startsWith('A') || currentContinentFocus.startsWith('E') || currentContinentFocus.startsWith('O') ? 'na' : 'no'} <b>{currentContinentFocus}</b>
                        </span>
                        {(continentPools[currentContinentFocus] || 0) === 0 && (
                            <button
                                className="confirm-allocation-btn"
                                onClick={handleConfirm}
                                style={{ marginLeft: 12 }}
                            >
                                Confirmar e Continuar
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <span>
                            Tropas restantes: <b>{getRemainingTroops}</b>
                        </span>
                        {reinforcementBreakdown && (
                            <div className="allocation-breakdown" style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                                {reinforcementBreakdown.territoryBonus} pelos territórios
                                {reinforcementBreakdown.cardBonus > 0 && (
                                    <> + {reinforcementBreakdown.cardBonus} pela troca de cartas</>
                                )}
                            </div>
                        )}
                        {getRemainingTroops === 0 && (
                            <button
                                className="confirm-allocation-btn"
                                onClick={handleConfirm}
                            >
                                Concluir
                            </button>
                        )}
                    </>
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

