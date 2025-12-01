import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useGameContext } from "../context/GameContext";
import { EventBus } from "../game/EventBus";
import "./AttackBar.css";

interface FortifyBarProps {
    isVisible: boolean;
    onClose: () => void;
    isDimmed?: boolean;
}

const FortifyBar: React.FC<FortifyBarProps> = ({
                                                   isVisible,
                                                   onClose,
                                                   isDimmed = false,
                                               }) => {
    // FIX: Destructure fortificationBudget
    const { getCurrentPlayer, gameManager, moveArmies, fortificationBudget } = useGameContext();
    const currentPlayer = getCurrentPlayer();

    type FortifyPhase = "SELECT_SOURCE" | "SELECT_TARGET" | "SELECT_TROOPS";
    const [fortifyPhase, setFortifyPhase] = useState<FortifyPhase>("SELECT_SOURCE");
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [selectedTarget, setSelectedTarget] = useState<string>("");
    const [moveQuantity, setMoveQuantity] = useState<string>("1");

    const getTroops = useCallback((territory: string) => {
        if (!gameManager) return 0;
        return gameManager.getTerritoryArmies(territory);
    }, [gameManager]);

    const handleTerritorySelected = useCallback(
        (territoryId: string) => {
            if (!currentPlayer || !gameManager) return;
            const normalizedId = territoryId;
            const isOwned = currentPlayer.territories.some(
                (t) =>
                    t.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") === normalizedId
            );

            // Fase 1: Selecionando território de origem
            if (fortifyPhase === "SELECT_SOURCE" && isOwned) {
                const matchingTerritory = currentPlayer.territories.find(
                    (t) =>
                        t.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") === normalizedId
                );
                if (matchingTerritory) {
                    const armies = getTroops(matchingTerritory);
                    // Also check budget
                    const budget = fortificationBudget?.[matchingTerritory] ?? armies;

                    if (armies <= 1) {
                        console.log("Território sem tropas suficientes para movimentar");
                        return;
                    }
                    if (budget <= 0) {
                        console.log("Território sem orçamento de movimento nesta rodada.");
                        return;
                    }

                    setSelectedSource(matchingTerritory);
                    setSelectedTarget("");
                    setMoveQuantity("1");
                    setFortifyPhase("SELECT_TARGET");
                }
            }
            // Fase 2: Selecionando território alvo
            else if (
                fortifyPhase === "SELECT_TARGET" &&
                selectedSource &&
                isOwned &&
                normalizedId !== selectedSource
            ) {
                try {
                    const gmAny = gameManager as any;
                    const neighbors = gmAny.getNeighbors ? gmAny.getNeighbors(selectedSource) : (gmAny.gameMap?.territories?.getNeighbors(selectedSource) || []);

                    const isNeighbor = neighbors.some((n: any) => {
                        const name = typeof n === 'string' ? n : n.node;
                        const normalizedNeighbor = name
                            .normalize("NFD")
                            .replace(/\p{Diacritic}+/gu, "")
                            .toLowerCase()
                            .replace(/\s+/g, "")
                            .replace(/[^a-z0-9]/g, "");
                        return normalizedNeighbor === normalizedId;
                    });

                    if (isNeighbor) {
                        setSelectedTarget(matchingTerritoryName(currentPlayer.territories, normalizedId));
                        setFortifyPhase("SELECT_TROOPS");
                    }
                } catch (e) {
                    console.warn("Erro ao verificar vizinhos", e);
                }
            }
        },
        [currentPlayer, gameManager, selectedSource, fortifyPhase, getTroops, fortificationBudget]
    );

    const matchingTerritoryName = (territories: string[], normalizedId: string) => {
        return (
            territories.find(
                (t) =>
                    t
                        .normalize("NFD")
                        .replace(/\p{Diacritic}+/gu, "")
                        .toLowerCase()
                        .replace(/\s+/g, "")
                        .replace(/[^a-z0-9]/g, "") === normalizedId
            ) || ""
        );
    };

    useEffect(() => {
        if (!isVisible) return;
        EventBus.on("territory-selected", handleTerritorySelected);
        return () => {
            EventBus.removeListener("territory-selected", handleTerritorySelected);
        };
    }, [isVisible, handleTerritorySelected]);

    useEffect(() => {
        if (!isVisible) {
            setSelectedSource("");
            setSelectedTarget("");
            setMoveQuantity("1");
            setFortifyPhase("SELECT_SOURCE");
            EventBus.emit("highlight-territories", {
                territories: [],
                mode: "none",
            });
        }
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible || !currentPlayer || !gameManager) {
            EventBus.emit("highlight-territories", {
                territories: [],
                mode: "none",
            });
            return;
        }
        const normalize = (s: string) =>
            s
                .normalize("NFD")
                .replace(/\p{Diacritic}+/gu, "")
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

        if (fortifyPhase === "SELECT_SOURCE") {
            const playerTerritories = currentPlayer.territories
                .filter((t) => {
                    const armies = getTroops(t);
                    const budget = fortificationBudget?.[t] ?? armies;
                    return armies > 1 && budget > 0;
                })
                .map(normalize);
            EventBus.emit("highlight-territories", {
                territories: playerTerritories,
                mode: "fortify-source",
            });
        }
        else if (fortifyPhase === "SELECT_TARGET" && selectedSource) {
            const neighbors = gameManager.getNeighbors(selectedSource);

            const ownNeighbors = neighbors
                .filter((n: string) => {
                    return currentPlayer.territories.some(
                        (t) => normalize(t) === normalize(n)
                    );
                })
                .map((n: string) => normalize(n));

            const highlightList = [normalize(selectedSource), ...ownNeighbors];
            EventBus.emit("highlight-territories", {
                territories: highlightList,
                mode: "fortify-target",
            });
        }
        else if (
            fortifyPhase === "SELECT_TROOPS" &&
            selectedSource &&
            selectedTarget
        ) {
            const highlightList = [
                normalize(selectedSource),
                normalize(selectedTarget),
            ];
            EventBus.emit("highlight-territories", {
                territories: highlightList,
                mode: "fortify-move",
            });
        }
    }, [isVisible, fortifyPhase, selectedSource, selectedTarget, currentPlayer, gameManager, getTroops, fortificationBudget]);

    const maxMovable = useMemo(() => {
        if (!selectedSource || !currentPlayer) return 0;
        const armies = getTroops(selectedSource);
        const physicalMax = Math.max(0, armies - 1);

        // NEW: Check budget
        const budgetMax = fortificationBudget?.[selectedSource] ?? physicalMax;

        return Math.min(physicalMax, budgetMax);
    }, [selectedSource, currentPlayer, getTroops, fortificationBudget]);

    useEffect(() => {
        const currentQty = parseInt(moveQuantity) || 1;
        if (maxMovable === 0) {
            setMoveQuantity("1");
        } else if (currentQty > maxMovable) {
            setMoveQuantity(String(maxMovable));
        }
    }, [maxMovable, moveQuantity]);

    const handleFortify = () => {
        if (!selectedSource || !selectedTarget) return;
        const qty = parseInt(moveQuantity) || 0;
        if (qty <= 0 || qty > maxMovable) return;
        moveArmies(selectedSource, selectedTarget, qty);
        setSelectedSource("");
        setSelectedTarget("");
        setMoveQuantity("1");
        setFortifyPhase("SELECT_SOURCE");
        onClose();
    };

    const handleRemoveSource = () => {
        setSelectedSource("");
        setSelectedTarget("");
        setMoveQuantity("1");
        setFortifyPhase("SELECT_SOURCE");
    };

    const handleRemoveTarget = () => {
        setSelectedTarget("");
        setFortifyPhase("SELECT_TARGET");
    };

    if (!isVisible) return null;
    if (!currentPlayer) return null;

    const hasSelection = selectedSource || selectedTarget;
    const canFortify =
        selectedSource &&
        selectedTarget &&
        parseInt(moveQuantity) > 0 &&
        parseInt(moveQuantity) <= maxMovable;

    return (
        <div className={`attack-bar ${isDimmed ? "dimmed" : ""}`}>
            <div className="attack-bar-content">
                <span className="attack-instruction">
                    {fortifyPhase === "SELECT_SOURCE" && (
                        <>
                            Selecione um <strong>território de origem</strong> para movimentar tropas
                        </>
                    )}
                    {fortifyPhase === "SELECT_TARGET" && selectedSource && (
                        <>
                            Selecione um <strong>território vizinho seu</strong> de <strong>{selectedSource}</strong> para receber tropas
                        </>
                    )}
                    {fortifyPhase === "SELECT_TROOPS" && selectedSource && selectedTarget && (
                        <>
                            Escolha <strong>quantas tropas</strong> mover para <strong>{selectedTarget}</strong>
                        </>
                    )}
                </span>
                <div className="attack-bar-buttons">
                    {canFortify && (
                        <button className="attack-btn" onClick={handleFortify}>
                            Mover {moveQuantity} tropa{parseInt(moveQuantity) > 1 ? "s" : ""}
                        </button>
                    )}
                    <button className="close-attack-btn" onClick={onClose}>
                        Fechar Movimentação
                    </button>
                </div>
            </div>
            {hasSelection && (
                <div className="attack-summary">
                    <div className="attack-selections">
                        {selectedSource && (
                            <div className="selection-chip">
                                <span className="selection-chip-label">Origem:</span>
                                <span className="selection-chip-text">
                                    {selectedSource} ({getTroops(selectedSource)} tropas)
                                </span>
                                <button className="selection-chip-remove" onClick={handleRemoveSource} title="Remover seleção">
                                    ×
                                </button>
                            </div>
                        )}
                        {selectedTarget && (
                            <div className="selection-chip target">
                                <span className="selection-chip-label">Destino:</span>
                                <span className="selection-chip-text">
                                    {selectedTarget} ({getTroops(selectedTarget)} tropas)
                                </span>
                                <button className="selection-chip-remove" onClick={handleRemoveTarget} title="Remover seleção">
                                    ×
                                </button>
                            </div>
                        )}
                        {selectedSource && selectedTarget && fortifyPhase === "SELECT_TROOPS" && (
                            <div className="troop-selection-inline">
                                <span className="troop-selection-label">Mover:</span>
                                <div className="troop-buttons-inline">
                                    <span className="troop-btn-small">{moveQuantity}</span>
                                    <button
                                        className="troop-btn-small"
                                        onClick={() => setMoveQuantity(String(Math.max(1, parseInt(moveQuantity) - 1)))}
                                        disabled={parseInt(moveQuantity) <= 1}
                                    >
                                        -
                                    </button>
                                    <button
                                        className="troop-btn-small"
                                        onClick={() => setMoveQuantity(String(Math.min(maxMovable, parseInt(moveQuantity) + 1)))}
                                        disabled={parseInt(moveQuantity) >= maxMovable}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FortifyBar;