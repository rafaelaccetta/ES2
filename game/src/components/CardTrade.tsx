import React, { useState, useMemo, useEffect } from "react";
import { useGameContext } from "../context/GameContext";
import { EventBus } from "../game/EventBus";
import "./CardExchange.css";
import { PlayerCards } from "../../game-logic/PlayerCards.js";

interface CardExchangeProps {
    isVisible: boolean;
    onClose: () => void;
    isDimmed?: boolean;
}

const isValidSet = (cards: PlayerCards[]): boolean => {
    if (cards.length !== 3) return false;

    const shapes = cards.map((card) => card.geometricShape);

    const wildcardCount = shapes.filter((s) => s === "Wildcard").length;
    if (wildcardCount > 0) return true; // Qualquer conjunto com wildcard é válido

    const uniqueShapes = new Set(shapes);
    
        // 3 símbolos iguais
    if (uniqueShapes.size === 1) return true;
    // 3 símbolos diferentes (1 de cada)

    if (uniqueShapes.size === 3) return true;

    return false;
};

const CardExchange: React.FC<CardExchangeProps> = ({
    isVisible,
    onClose,
    isDimmed = false,
}) => {
    const { getCurrentPlayer, cardManager } = useGameContext() as any;
    const [selectedCards, setSelectedCards] = useState<PlayerCards[]>([]);
    const currentPlayer = getCurrentPlayer();
    const playerCards = (currentPlayer?.cards as PlayerCards[]) || [];

    const getPlayerColor = (color: string) => {
        const colorMap: Record<string, string> = {
            azul: "#2563eb",
            vermelho: "#dc2626",
            verde: "#16a34a",
            branco: "#b7c0cd",
        };
        return colorMap[color] || "#fbbf24";
    };

    const playerColor = currentPlayer ? getPlayerColor(currentPlayer.color) : "#fbbf24";

    useEffect(() => {
        if (isVisible) {
            setSelectedCards([]);
        }
    }, [isVisible]);

    const handleSelectCard = (card: PlayerCards) => {
        setSelectedCards((prev) => {
            const isSelected = prev.find((c) => c.name === card.name);
            if (isSelected) {
                return prev.filter((c) => c.name !== card.name);
            } else {
                if (prev.length < 3) {
                    return [...prev, card];
                }
                return prev;
            }
        });
    };

    const canExchange = useMemo(() => isValidSet(selectedCards), [selectedCards]);
    const nextExchangeBonus = useMemo(() => {
        try {
            return cardManager?.getNextExchangeBonus?.() ?? undefined;
        } catch {
            return undefined;
        }
    }, [cardManager, selectedCards.length]);
    const mustExchange = playerCards.length >= 5;

    const handleConfirmExchange = () => {
        if (!canExchange) return;

        console.log("Emitindo card-exchange-request com:", selectedCards);
        EventBus.emit("card-exchange-request", { cards: selectedCards });
        onClose();
    };

    const getShapeIcon = (shape: string) => {
        switch (shape) {
            case "Square":
            case "square":
                return "■";
            case "Circle":
            case "circle":
                return "●";
            case "Triangle":
            case "triangle":
                return "▲";
            case "Wildcard":
                return "★";
            default:
                return "?";
        }
    };

    if (!isVisible) return null;

    return (
        <div
            className={`troop-allocation-overlay ${isDimmed ? "dimmed" : ""}`}
            onClick={!mustExchange ? onClose : undefined}
        >
            <div
                className="troop-allocation-modal card-exchange-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="troop-allocation-header">
                    <h2>Trocar Cartas</h2>
                    {!mustExchange && (
                        <button
                            className="close-btn"
                            onClick={onClose}
                            aria-label="Fechar"
                        >
                            &times;
                        </button>
                    )}
                </div>
                <div className="troop-allocation-content">
                    <div className="card-exchange-info">
                        {mustExchange ? (
                            <p className="exchange-hint must-exchange">
                                Você deve trocar cartas (possui {playerCards.length}
                                /5).
                            </p>
                        ) : (
                            <p className="exchange-hint">
                                Selecione 3 cartas com formas iguais ou 3 cartas com formas
                                diferentes.
                            </p>
                        )}
                        {canExchange && nextExchangeBonus !== undefined && (
                            <p className="exchange-hint" style={{marginTop: 4}}>
                                Você irá ganhar <b>+{nextExchangeBonus}</b> tropas na alocação
                            </p>
                        )}
                        <p className="exchange-hint">
                            Cartas selecionadas: {selectedCards.length} / 3
                        </p>
                    </div>

                    <div className="cards-list">
                        {playerCards.length > 0 ? (
                            playerCards.map((card, index) => {
                                const isSelected = selectedCards.find(
                                    (c) => c.name === card.name
                                );
                                return (
                                    <button
                                        key={index}
                                        className={`card-btn ${
                                            isSelected ? "selected" : ""
                                        }`}
                                        onClick={() => handleSelectCard(card)}
                                        disabled={
                                            !isSelected &&
                                            selectedCards.length >= 3
                                        }
                                        style={{
                                            borderColor: isSelected ? playerColor : '#a59b7b',
                                            boxShadow: isSelected ? `0 0 15px ${playerColor}80` : undefined
                                        }}
                                    >
                                        <span className="card-shape" style={{ color: playerColor }}>
                                            {getShapeIcon(card.geometricShape)}
                                        </span>
                                        <span className="card-name">
                                            {card.name}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            <p>Você não possui cartas.</p>
                        )}
                    </div>

                    <div className="allocation-actions">
                        {!mustExchange && (
                            <button className="cancel-btn" onClick={onClose}>
                                Cancelar
                            </button>
                        )}
                        <button
                            className="confirm-btn"
                            onClick={handleConfirmExchange}
                            disabled={!canExchange}
                        >
                            Trocar Cartas
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardExchange;