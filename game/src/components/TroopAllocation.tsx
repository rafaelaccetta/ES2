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
    const {
        getCurrentPlayer,
        currentRound,
        calculateReinforcementTroops,
        gameManager,
        placeReinforcement,
        undoReinforcement // NEW: Import undo helper
    } = useGameContext() as any;

    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [lastRoundPlayer, setLastRoundPlayer] = useState<string>("");
    const [initialTroops, setInitialTroops] = useState(0);

    const [continentPools, setContinentPools] = useState<Record<string, number>>({});
    const [exclusivePools, setExclusivePools] = useState<Record<string, number>>({});

    const [allocationPhase, setAllocationPhase] = useState<'exclusive' | 'continent' | 'free'>('continent');
    const [currentContinentFocus, setCurrentContinentFocus] = useState<string | null>(null);
    const [currentExclusiveFocus, setCurrentExclusiveFocus] = useState<string | null>(null);

    const [continentTroopsSpent, setContinentTroopsSpent] = useState(0);
    const [exclusiveTroopsSpent, setExclusiveTroopsSpent] = useState(0);

    const lastClickTimestampRef = useRef<number>(0);
    const allocatedCountRef = useRef<number>(0);

    const currentPlayer = getCurrentPlayer();

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

        const pending = currentPlayer.armies || 0;
        const cardBonus = Math.max(0, pending - base);

        const continents = Object.keys(calc?.continentBonuses || {});
        return { base, cardBonus, territoryBonus, continentBonus, continents };
    }, [currentPlayer, currentPlayer?.armies, initialTroops]);

    const getRemainingTroops = useMemo(() => {
        if (!currentPlayer) return 0;

        if (allocationPhase === 'exclusive' && currentExclusiveFocus) {
            return exclusivePools[currentExclusiveFocus] || 0;
        }
        else if (allocationPhase === 'continent' && currentContinentFocus) {
            return continentPools[currentContinentFocus] || 0;
        } else {
            const pending = currentPlayer.armies || 0;
            const totalExclusiveRemaining = Object.values(exclusivePools).reduce((a,b)=>a+b, 0);
            const totalContinentRemaining = Object.values(continentPools).reduce((a,b)=>a+b, 0);

            const free = pending - totalExclusiveRemaining - totalContinentRemaining;
            return Math.max(0, free);
        }
    }, [currentPlayer, allocationPhase, currentContinentFocus, currentExclusiveFocus, continentPools, exclusivePools, currentPlayer?.armies]);

    useEffect(() => {
        if (isVisible && currentPlayer) {
            const currentRoundPlayer = `${currentRound}-${currentPlayer.id}`;

            if (lastRoundPlayer !== currentRoundPlayer || allocationPhase === 'exclusive' && Object.keys(exclusivePools).length === 0) {
                console.log("Reinicializando alocação para:", currentRoundPlayer);
                setInitialTroops(calculatedTroops);
                setAllocations({});
                allocatedCountRef.current = 0;
                setLastRoundPlayer(currentRoundPlayer);
                setContinentTroopsSpent(0);
                setExclusiveTroopsSpent(0);

                const exPools = { ...(currentPlayer.exclusiveArmies || {}) };
                setExclusivePools(exPools);
                const totalEx = Object.values(exPools).reduce((a:number,b:number)=>a+b, 0);

                const calc = calculateReinforcementTroops(currentPlayer) as any;
                const cPools: Record<string, number> = {};
                Object.entries(calc?.continentBonuses || {}).forEach(([continentName, bonus]) => {
                    cPools[continentName] = Number(bonus) || 0;
                });
                setContinentPools(cPools);
                const totalCont = Object.values(cPools).reduce((s: number, v: number) => s + v, 0);

                if (totalEx > 0) {
                    setAllocationPhase('exclusive');
                    const firstEx = Object.keys(exPools)[0];
                    setCurrentExclusiveFocus(firstEx);
                } else if (totalCont > 0) {
                    setAllocationPhase('continent');
                    const firstContinent = Object.keys(cPools).find(c => cPools[c] > 0);
                    setCurrentContinentFocus(firstContinent || null);
                } else {
                    setAllocationPhase('free');
                    setCurrentContinentFocus(null);
                    setCurrentExclusiveFocus(null);
                }
            }
        }
    }, [
        isVisible,
        currentPlayer?.id,
        currentRound,
        calculatedTroops,
        JSON.stringify(currentPlayer?.exclusiveArmies)
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
            if (now - lastTime < 200) return;
            lastClickTimestampRef.current = now;

            if (!currentPlayer) return;
            const cp = currentPlayer;

            const matchingTerritory = cp.territories.find(
                (t: string) => normalizeId(t) === territoryId
            );

            if (!matchingTerritory) return;

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

            // --- PHASE VALIDATION ---
            if (allocationPhase === 'exclusive') {
                if (matchingTerritory !== currentExclusiveFocus) return;
                if ((exclusivePools[currentExclusiveFocus] || 0) <= 0) return;
            }
            else if (allocationPhase === 'continent') {
                if (!currentContinentFocus || territoryContinent !== currentContinentFocus) return;
                if ((continentPools[currentContinentFocus] || 0) <= 0) return;
            }
            else {
                if (getRemainingTroops <= 0) return;
            }

            allocatedCountRef.current += 1;

            if (placeReinforcement) {
                placeReinforcement(matchingTerritory);
            }

            if (allocationPhase === 'exclusive' && currentExclusiveFocus) {
                setExclusiveTroopsSpent(prev => prev + 1);
                setExclusivePools(prev => ({
                    ...prev,
                    [currentExclusiveFocus!]: Math.max(0, (prev[currentExclusiveFocus!] || 0) - 1)
                }));
            }
            else if (allocationPhase === 'continent' && currentContinentFocus) {
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
        [currentPlayer, normalizeId, continentPools, exclusivePools, gameManager, allocationPhase, currentContinentFocus, currentExclusiveFocus, getRemainingTroops, placeReinforcement]
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

            // FIX: Delegate to Context
            if (undoReinforcement) {
                undoReinforcement(territory, allocationPhase);
            }

            // Update local UI state
            allocatedCountRef.current = Math.max(0, allocatedCountRef.current - 1);

            if (allocationPhase === 'exclusive' && territory === currentExclusiveFocus) {
                setExclusiveTroopsSpent(p => Math.max(0, p - 1));
                setExclusivePools(prev => ({
                    ...prev,
                    [territory]: (prev[territory] || 0) + 1
                }));
            }
            else if (allocationPhase === 'continent' && currentContinentFocus) {
                setContinentTroopsSpent(p => Math.max(0, p - 1));
                setContinentPools(prev => ({
                    ...prev,
                    [currentContinentFocus]: (prev[currentContinentFocus] || 0) + 1
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
        [currentPlayer, allocations, allocationPhase, currentContinentFocus, currentExclusiveFocus, gameManager, undoReinforcement]
    );

    const handleConfirm = useCallback(() => {
        if (allocationPhase === 'exclusive') {
            const remaining = exclusivePools[currentExclusiveFocus || ''] || 0;
            if (remaining > 0) return;

            setAllocations({});

            const nextEx = Object.keys(exclusivePools).find(k => k !== currentExclusiveFocus && exclusivePools[k] > 0);
            if (nextEx) {
                setCurrentExclusiveFocus(nextEx);
            } else {
                const nextCont = Object.keys(continentPools).find(c => (continentPools[c] || 0) > 0);
                if (nextCont) {
                    setAllocationPhase('continent');
                    setCurrentContinentFocus(nextCont);
                } else {
                    setAllocationPhase('free');
                }
            }
        }
        else if (allocationPhase === 'continent') {
            const remaining = continentPools[currentContinentFocus || ''] || 0;
            if (remaining > 0) return;

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
    }, [allocationPhase, continentPools, exclusivePools, currentContinentFocus, currentExclusiveFocus, getRemainingTroops, onClose]);

    if (!isVisible || !currentPlayer) return null;

    const hasAllocations = Object.keys(allocations).length > 0;

    return (
        <div className={`troop-allocation-bar ${isDimmed ? "dimmed" : ""}`}>
            <div className="troop-allocation-bar-content">
                {allocationPhase === 'exclusive' && currentExclusiveFocus ? (
                    <>
                        <span style={{ fontSize: 14, fontWeight: 'bold', color: '#ffd700' }}>
                            Bônus de Troca! Distribua <b>{exclusivePools[currentExclusiveFocus] || 0}</b> tropas obrigatoriamente em <b>{currentExclusiveFocus}</b>
                        </span>
                        {(exclusivePools[currentExclusiveFocus] || 0) === 0 && (
                            <button
                                className="confirm-allocation-btn"
                                onClick={handleConfirm}
                                style={{ marginLeft: 12 }}
                            >
                                Confirmar Bônus
                            </button>
                        )}
                    </>
                ) : allocationPhase === 'continent' && currentContinentFocus ? (
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