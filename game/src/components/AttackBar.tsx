import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useGameContext } from "../context/GameContext";
import { EventBus } from "../game/EventBus";
import "./AttackBar.css";

interface AttackBarProps {
    isVisible: boolean;
    onClose: () => void;
    isDimmed?: boolean;
}

interface PostConquestPayload {
    source: string;
    target: string;
    troopsRequested: number;
    attackerLoss: number;
    defenderLoss: number;
    survivors: number;
    armiesBefore: number;
    sourceAfterLosses: number;
    maxCanMove: number;
}

const AttackBar: React.FC<AttackBarProps> = ({
    isVisible,
    onClose,
    isDimmed = false,
}) => {
    const { getCurrentPlayer, gameManager, applyPostConquestMove } =
        useGameContext();
    const currentPlayer = getCurrentPlayer();

    // Estado para controlar as fases de seleção
    type AttackPhase = 'SELECT_SOURCE' | 'SELECT_TARGET' | 'SELECT_TROOPS';
    const [attackPhase, setAttackPhase] = useState<AttackPhase>('SELECT_SOURCE');

    // Estado para ataque
    const [selectedSource, setSelectedSource] = useState<string>("");
    const [selectedTarget, setSelectedTarget] = useState<string>("");
    const [attackQuantity, setAttackQuantity] = useState<string>("1");

    // Estado para pós-conquista
    const [showPostConquest, setShowPostConquest] = useState(false);
    const [postConquestData, setPostConquestData] =
        useState<PostConquestPayload | null>(null);
    const [moveCount, setMoveCount] = useState("1");

    // Listener para territory-selected (clicar no mapa)
    const handleTerritorySelected = useCallback(
        (territoryId: string) => {
            if (!currentPlayer || !gameManager) return;

            // Verificar se é território do jogador
            const normalizedId = territoryId;
            const isOwned = currentPlayer.territories.some(
                (t) =>
                    t
                        .normalize("NFD")
                        .replace(/\p{Diacritic}+/gu, "")
                        .toLowerCase()
                        .replace(/\s+/g, "")
                        .replace(/[^a-z0-9]/g, "") === normalizedId
            );

            // Fase 1: Selecionando território de origem
            if (attackPhase === 'SELECT_SOURCE' && isOwned) {
                const matchingTerritory = currentPlayer.territories.find(
                    (t) =>
                        t
                            .normalize("NFD")
                            .replace(/\p{Diacritic}+/gu, "")
                            .toLowerCase()
                            .replace(/\s+/g, "")
                            .replace(/[^a-z0-9]/g, "") === normalizedId
                );
                if (matchingTerritory) {
                    const armies = currentPlayer.territoriesArmies?.[matchingTerritory] ?? 0;
                    if (armies <= 1) {
                        console.log("Território sem tropas suficientes para atacar");
                        return;
                    }
                    setSelectedSource(matchingTerritory);
                    setSelectedTarget("");
                    setAttackQuantity("1");
                    setAttackPhase('SELECT_TARGET');
                }
            }
            // Fase 2: Selecionando território alvo
            else if (attackPhase === 'SELECT_TARGET' && selectedSource && !isOwned) {
                // Verificar se é vizinho válido
                try {
                    const gmAny = gameManager as any;
                    const neighbors =
                        gmAny.gameMap?.territories?.getNeighbors(
                            selectedSource
                        ) || [];
                    const isNeighbor = neighbors.some((n: any) => {
                        const normalizedNeighbor = n.node
                            .normalize("NFD")
                            .replace(/\p{Diacritic}+/gu, "")
                            .toLowerCase()
                            .replace(/\s+/g, "")
                            .replace(/[^a-z0-9]/g, "");
                        return normalizedNeighbor === normalizedId;
                    });

                    if (isNeighbor) {
                        // Encontrar o nome original do território
                        for (const player of gameManager.players) {
                            const matchingTerritory = player.territories.find(
                                (t) =>
                                    t
                                        .normalize("NFD")
                                        .replace(/\p{Diacritic}+/gu, "")
                                        .toLowerCase()
                                        .replace(/\s+/g, "")
                                        .replace(/[^a-z0-9]/g, "") ===
                                    normalizedId
                            );
                            if (
                                matchingTerritory &&
                                player.id !== currentPlayer.id
                            ) {
                                setSelectedTarget(matchingTerritory);
                                setAttackPhase('SELECT_TROOPS');
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Erro ao verificar vizinhos", e);
                }
            }
        },
        [currentPlayer, gameManager, selectedSource, attackPhase]
    );

    useEffect(() => {
        if (!isVisible) return;

        EventBus.on("territory-selected", handleTerritorySelected);

        return () => {
            EventBus.removeListener(
                "territory-selected",
                handleTerritorySelected
            );
        };
    }, [isVisible, handleTerritorySelected]);

    // Listener para pós-conquista
    useEffect(() => {
        const handlePostConquest = (data: any) => {
            const p = data as PostConquestPayload;
            setPostConquestData(p);
            const defaultMove = Math.min(1, Math.max(1, p.maxCanMove));
            setMoveCount(String(defaultMove));
            setShowPostConquest(true);
        };

        EventBus.on("post-conquest", handlePostConquest);
        return () => {
            EventBus.removeListener("post-conquest", handlePostConquest);
        };
    }, []);

    // Reset ao fechar
    useEffect(() => {
        if (!isVisible) {
            setSelectedSource("");
            setSelectedTarget("");
            setAttackQuantity("1");
            setShowPostConquest(false);
            setPostConquestData(null);
            setAttackPhase('SELECT_SOURCE');
        }
    }, [isVisible]);

    const maxAttackable = useMemo(() => {
        if (!selectedSource || !currentPlayer) return 0;
        const armies = currentPlayer.territoriesArmies?.[selectedSource] ?? 0;
        const possible = Math.max(0, armies - 1);
        return Math.min(3, possible);
    }, [selectedSource, currentPlayer]);

    useEffect(() => {
        const currentQty = parseInt(attackQuantity) || 1;
        if (maxAttackable === 0) {
            setAttackQuantity("1");
        } else if (currentQty > maxAttackable) {
            setAttackQuantity(String(maxAttackable));
        }
    }, [maxAttackable, attackQuantity]);

    const getTerritoryTroops = (territory: string): number => {
        if (!gameManager) return 0;

        for (const player of gameManager.players) {
            if (player.territories.includes(territory)) {
                return player.territoriesArmies?.[territory] ?? 0;
            }
        }
        return 0;
    };

    const handleAttack = () => {
        if (!selectedSource || !selectedTarget) return;
        const qty = parseInt(attackQuantity) || 0;
        if (qty <= 0 || qty > maxAttackable) return;
        EventBus.emit("attack-request", {
            source: selectedSource,
            target: selectedTarget,
            troops: qty,
        });
        // Não fecha a barra, volta para a fase de seleção de origem
        setSelectedSource("");
        setSelectedTarget("");
        setAttackQuantity("1");
        setAttackPhase('SELECT_SOURCE');
    };

    const handleRemoveSource = () => {
        setSelectedSource("");
        setSelectedTarget("");
        setAttackQuantity("1");
        setAttackPhase('SELECT_SOURCE');
    };

    const handleRemoveTarget = () => {
        setSelectedTarget("");
        setAttackPhase('SELECT_TARGET');
    };

    // Handlers pós-conquista
    const handleConfirmMove = () => {
        if (!postConquestData) return;
        const moved = Math.max(
            0,
            Math.min(parseInt(moveCount) || 0, postConquestData.maxCanMove)
        );
        applyPostConquestMove(
            postConquestData.source,
            postConquestData.target,
            moved
        );
        setShowPostConquest(false);
        setPostConquestData(null);
        setSelectedSource("");
        setSelectedTarget("");
    };

    useEffect(() => {
        if (!postConquestData) return;

        const currentMove = parseInt(moveCount) || 1;
        const maxPossible = Math.min(
            postConquestData.troopsRequested,
            postConquestData.maxCanMove
        );

        if (currentMove > maxPossible && maxPossible > 0) {
            setMoveCount(String(maxPossible));
        } else if (maxPossible === 0) {
            setMoveCount("1");
        }
    }, [postConquestData, moveCount]);

    if (!isVisible) return null;
    if (!currentPlayer) return null;

    // Modo pós-conquista
    if (showPostConquest && postConquestData) {
        return (
            <div
                className={`attack-bar post-conquest ${
                    isDimmed ? "dimmed" : ""
                }`}
            >
                <div className="attack-bar-content">
                    <span className="conquest-message">
                        🎉 <strong>{postConquestData.target}</strong>{" "}
                        conquistado! Mover tropas de{" "}
                        <strong>{postConquestData.source}</strong>?
                    </span>
                    <div className="troop-move-controls">
                        <div className="troop-buttons-inline">
                            <button
                                className={`troop-btn-small ${
                                    moveCount === "1" ? "selected" : ""
                                }`}
                                onClick={() => setMoveCount("1")}
                                disabled={postConquestData.maxCanMove < 1}
                            >
                                1
                            </button>
                            <button
                                className={`troop-btn-small ${
                                    moveCount === "2" ? "selected" : ""
                                }`}
                                onClick={() => setMoveCount("2")}
                                disabled={postConquestData.maxCanMove < 2}
                            >
                                2
                            </button>
                            <button
                                className={`troop-btn-small ${
                                    moveCount === "3" ? "selected" : ""
                                }`}
                                onClick={() => setMoveCount("3")}
                                disabled={postConquestData.maxCanMove < 3}
                            >
                                3
                            </button>
                        </div>
                        <button
                            className="confirm-move-btn"
                            onClick={handleConfirmMove}
                        >
                            Mover {moveCount} tropa
                            {parseInt(moveCount) > 1 ? "s" : ""}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Modo normal de ataque
    const hasSelection = selectedSource || selectedTarget;
    const canAttack =
        selectedSource &&
        selectedTarget &&
        parseInt(attackQuantity) > 0 &&
        parseInt(attackQuantity) <= maxAttackable;

    return (
        <div className={`attack-bar ${isDimmed ? "dimmed" : ""}`}>
            <div className="attack-bar-content">
                <span className="attack-instruction">
                    {attackPhase === 'SELECT_SOURCE' && "📍 Selecione um território de origem para atacar"}
                    {attackPhase === 'SELECT_TARGET' && selectedSource && `🎯 Selecione um território inimigo vizinho de ${selectedSource} para atacar`}
                    {attackPhase === 'SELECT_TROOPS' && selectedSource && selectedTarget && `⚔️ Escolha quantas tropas usar para atacar ${selectedTarget}`}
                </span>
                {canAttack && (
                    <button className="attack-btn" onClick={handleAttack}>
                        Atacar com {attackQuantity} tropa
                        {parseInt(attackQuantity) > 1 ? "s" : ""}
                    </button>
                )}
                <button className="close-attack-btn" onClick={onClose}>
                    Fechar Ataque
                </button>
            </div>

            {hasSelection && (
                <div className="attack-summary">
                    <div className="attack-selections">
                        {selectedSource && (
                            <div className="selection-chip">
                                <span className="selection-chip-label">
                                    Origem:
                                </span>
                                <span className="selection-chip-text">
                                    {selectedSource} (
                                    {currentPlayer.territoriesArmies?.[
                                        selectedSource
                                    ] || 0}{" "}
                                    tropas)
                                </span>
                                <button
                                    className="selection-chip-remove"
                                    onClick={handleRemoveSource}
                                    title="Remover seleção"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {selectedTarget && (
                            <div className="selection-chip target">
                                <span className="selection-chip-label">
                                    Alvo:
                                </span>
                                <span className="selection-chip-text">
                                    {selectedTarget} (
                                    {getTerritoryTroops(selectedTarget)} tropas)
                                </span>
                                <button
                                    className="selection-chip-remove"
                                    onClick={handleRemoveTarget}
                                    title="Remover seleção"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {selectedSource && selectedTarget && attackPhase === 'SELECT_TROOPS' && (
                            <div className="troop-selection-inline">
                                <span className="troop-selection-label">
                                    Atacar com:
                                </span>
                                <div className="troop-buttons-inline">
                                    <button
                                        className={`troop-btn-small ${
                                            attackQuantity === "1"
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() => setAttackQuantity("1")}
                                        disabled={maxAttackable < 1}
                                    >
                                        1
                                    </button>
                                    <button
                                        className={`troop-btn-small ${
                                            attackQuantity === "2"
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() => setAttackQuantity("2")}
                                        disabled={maxAttackable < 2}
                                    >
                                        2
                                    </button>
                                    <button
                                        className={`troop-btn-small ${
                                            attackQuantity === "3"
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() => setAttackQuantity("3")}
                                        disabled={maxAttackable < 3}
                                    >
                                        3
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

export default AttackBar;

