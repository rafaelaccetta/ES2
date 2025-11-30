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
    // FIX: Destructure placeReinforcement from context
    const {
        getCurrentPlayer,
        currentRound,
        players,
        calculateReinforcementTroops,
        gameManager,
        placeReinforcement
    } = useGameContext() as any;

    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [lastRoundPlayer, setLastRoundPlayer] = useState<string>("");
    const [initialTroops, setInitialTroops] = useState(0);
    const [continentPools, setContinentPools] = useState<Record<string, number>>({});
    const [allocationPhase, setAllocationPhase] = useState<'continent' | 'free'>('continent');
    const [currentContinentFocus, setCurrentContinentFocus] = useState<string | null>(null);
    const [initialContinentBonus, setInitialContinentBonus] = useState(0);
    const [continentTroopsSpent, setContinentTroopsSpent] = useState(0);
    const lastClickTimestampRef = useRef<number>(0);
    const allocatedCountRef = useRef<number>(0);

    const currentPlayer = getCurrentPlayer();

    // FIX: Read from .armies (Reserve Pool) instead of pendingReinforcements
    const calculatedTroops = useMemo(() => {
        if (!currentPlayer) return 0;
        return currentPlayer.armies || 0;
    }, [currentPlayer?.armies]);

    const reinforcementBreakdown = useMemo(() => {
        if (!currentPlayer) return null as any;
        const calc = calculateReinforcementTroops(currentPlayer) as any;

        const territoryBonus = calc?.territoryBonus || 0;
        const continentBonus = calc?.continentBonus || 0;
        const base = territoryBonus + continentBonus;

        let cardBonus = 0;
        if (allocationPhase === 'free') {
            cardBonus = Math.max(0, initialTroops - base);
        } else {
            const pending = currentPlayer.armies || 0;
            cardBonus = Math.max(0, pending - base);
        }

        const continents = Object.keys(calc?.continentBonuses || {});
        return { base, cardBonus, territoryBonus, continentBonus, continents };
    }, [currentPlayer, currentPlayer?.armies, allocationPhase, initialTroops]);

    const getRemainingTroops = useMemo(() => {
        if (!currentPlayer) return 0;

        if (allocationPhase === 'continent' && currentContinentFocus) {
            return continentPools[currentContinentFocus] || 0;
        } else {
            const pending = currentPlayer.armies || 0;
            const remaining = pending - (initialContinentBonus - continentTroopsSpent);
            return Math.max(0, remaining);
        }
    }, [currentPlayer, allocationPhase, currentContinentFocus, continentPools, currentPlayer?.armies, initialContinentBonus, continentTroopsSpent]);

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

                const calc = calculateReinforcementTroops(currentPlayer) as any;
                const pools: Record<string, number> = {};
                Object.entries(calc?.continentBonuses || {}).forEach(([continentName, bonus]) => {
                    pools[continentName] = Number(bonus) || 0;
                });
                setContinentPools(pools);

                const totalContinentBonus = Object.values(pools).reduce((s: number, v: number) => s + v, 0);
                setInitialContinentBonus(totalContinentBonus);

                if (totalContinentBonus > 0) {
                    setAllocationPhase('continent');
                    const firstContinent = Object.keys(pools).find(c => pools[c] > 0);
                    setCurrentContinentFocus(firstContinent || null);
                } else {
                    setAllocationPhase('free');
                    setCurrentContinentFocus(null);
                }
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

    const handleTerritorySelected = useCallback(
        (territoryId: string) => {
            const now = Date.now();
            const lastTime = lastClickTimestampRef.current;

            if (now - lastTime < 200) return; // Debounce

            lastClickTimestampRef.current = now;

            if (!currentPlayer) return;
            const cp = currentPlayer;

            const matchingTerritory = cp.territories.find(
                (t: string) => normalizeId(t) === territoryId
            );

            if (!matchingTerritory) {
                console.log("TroopAllocation: territory not owned by player");
                return;
            }

            // Determine continent of selection
            let territoryContinent: string | null = null;
            try {
                // Safe access to map data
                const tbc = gameManager?.gameMap?.getTerritoriesByContinent?.() || {};
                for (const [continentName, list] of Object.entries(tbc) as any) {
                    if ((list as string[]).includes(matchingTerritory)) {
                        territoryContinent = continentName;
                        break;
                    }
                }
            } catch {}

            // Phase Logic Checks
            if (allocationPhase === 'continent') {
                if (!currentContinentFocus || territoryContinent !== currentContinentFocus) {
                    console.log("Alocação bloqueada: deve alocar no continente", currentContinentFocus);
                    return;
                }
                const continentRemaining = continentPools[currentContinentFocus] || 0;
                if (continentRemaining <= 0) return;
            } else {
                const pending = cp.armies || 0;
                const freeRemaining = pending - (initialContinentBonus - continentTroopsSpent);
                if (freeRemaining <= 0) return;
            }

            allocatedCountRef.current += 1;

            // FIX: Use context helper instead of calling method on player
            // This commits the change to Backend (Map + Reserve) immediately
            if (placeReinforcement) {
                placeReinforcement(matchingTerritory);
            } else {
                console.error("placeReinforcement helper not available in context");
            }

            // Update Local UI State
            if (allocationPhase === 'continent' && currentContinentFocus) {
                setContinentTroopsSpent(prev => prev + 1);
                setContinentPools((prev) => ({
                    ...prev,
                    [currentContinentFocus!]: Math.max(0, (prev[currentContinentFocus!] || 0) - 1),
                }));
            }

            setAllocations((prev) => ({
                ...prev,
                [matchingTerritory]: (prev[matchingTerritory] || 0) + 1,
            }));
        },
        [currentPlayer, initialTroops, players, normalizeId, continentPools, gameManager, allocationPhase, currentContinentFocus, initialContinentBonus, continentTroopsSpent, placeReinforcement]
    );

    useEffect(() => {
        if (!isVisible) return;
        EventBus.on("territory-selected", handleTerritorySelected);
        return () => {
            EventBus.removeListener("territory-selected", handleTerritorySelected);
        };
    }, [isVisible, handleTerritorySelected]);

    const handleRemoveAllocation = useCallback(
        (territory: string) => {
            if (!currentPlayer || !gameManager) return;

            const allocated = allocations[territory];
            if (!allocated || allocated <= 0) return;

            allocatedCountRef.current = Math.max(0, allocatedCountRef.current - 1);

            // FIX: Manual Undo Logic since we don't have an undo helper in context
            // 1. Remove from Map
            try {
                gameManager.gameMap.removeArmy(territory, 1);
            } catch (e) {
                console.error("Undo failed on map", e);
                return;
            }

            // 2. Add back to Reserve
            currentPlayer.addArmies(1);

            // 3. Force UI Update (Reconstruct payload manually like GameContext does)
            // This is necessary because we bypassed the Context helper
            const playersPayload = players.map((p: any) => {
                const territoriesArmies: Record<string, number> = {};
                p.territories.forEach((t: string) => {
                    territoriesArmies[t] = gameManager.getTerritoryArmies(t);
                });
                return {
                    id: p.id,
                    color: p.color,
                    territories: p.territories,
                    territoriesArmies: territoriesArmies,
                    armies: p.armies,
                    pendingReinforcements: p.armies,
                    cards: p.cards
                };
            });

            EventBus.emit("players-updated", {
                playerCount: players.length,
                players: playersPayload
            });

            // Update Local State
            if (allocationPhase === 'continent' && currentContinentFocus) {
                setContinentTroopsSpent(prev => Math.max(0, prev - 1));
                setContinentPools((prev) => ({
                    ...prev,
                    [currentContinentFocus!]: (prev[currentContinentFocus!] || 0) + 1,
                }));
            }

            setAllocations((prev) => {
                const newValue = prev[territory] - 1;
                if (newValue <= 0) {
                    const { [territory]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [territory]: newValue };
            });
        },
        [currentPlayer, allocations, players, allocationPhase, currentContinentFocus, gameManager]
    );

    const handleConfirm = useCallback(() => {
        if (allocationPhase === 'continent') {
            const remaining = continentPools[currentContinentFocus || ''] || 0;
            if (remaining > 0) {
                console.warn("Ainda há tropas do continente para alocar");
                return;
            }

            setAllocations({});

            const nextContinent = Object.keys(continentPools).find(c => (continentPools[c] || 0) > 0);
            if (nextContinent) {
                setCurrentContinentFocus(nextContinent);
            } else {
                setAllocationPhase('free');
                setCurrentContinentFocus(null);
            }
        } else {
            if (getRemainingTroops === 0) {
                onClose();
            }
        }
    }, [allocationPhase, continentPools, currentContinentFocus, getRemainingTroops, onClose]);

    if (!isVisible || !currentPlayer) return null;

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