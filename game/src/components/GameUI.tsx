import React, { useState, useEffect, useRef } from "react";
import { useGameContext } from "../context/GameContext";
import ObjectiveDisplay from "./ObjectiveDisplay";
import TurnTransition from "./TurnTransition";
import TroopAllocation from "./TroopAllocation";
import AttackBar from "./AttackBar";
import "./GameUI.css";
import "./CardAward.css";
import CardExchange from "./CardTrade";
import { EventBus } from "../game/EventBus";

const GameUI: React.FC = () => {
    const {
        gameStarted,
        currentPhase,
        getCurrentPlayer,
        nextPhase,
        getCurrentObjective,
        shouldShowAutomaticObjective,
        markObjectiveAsShown,
        showObjectiveConfirmation,
        setShowObjectiveConfirmation,
        firstRoundObjectiveShown,
        calculateReinforcementTroops,
        currentRound,
        currentPlayerIndex,
        startGame,
        players,
    } = useGameContext();

    const getAvailableTroopsToAllocate = () => {
        const currentPlayer = getCurrentPlayer();
        if (!currentPlayer) return 0;
        
        const pending = (currentPlayer as any).pendingReinforcements;
        
        if (pending === undefined && currentPlayer.territories.length > 0 && currentPhase === "REFORÇAR") {
            const reinforcements = calculateReinforcementTroops(currentPlayer);
            if (reinforcements && reinforcements.totalTroops > 0) {
                (currentPlayer as any).pendingReinforcements = reinforcements.totalTroops;
                console.log(`✅ Inicializou reforços: ${reinforcements.totalTroops}`);
                return reinforcements.totalTroops;
            }
        }
        
        return pending || 0;
    };

    // ESTADOS DA UI
    const [showObjective, setShowObjective] = useState(false);
    const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
    const [showTransition, setShowTransition] = useState(false);
    const [showTroopAllocation, setShowTroopAllocation] = useState(false);
    const [showAttackBar, setShowAttackBar] = useState(false);
    const [showCardExchange, setShowCardExchange] = useState(false);
    const [showCardAward, setShowCardAward] = useState(false);
    const [awardedCard, setAwardedCard] = useState<{name:string;shape:string;playerColor?:string}|null>(null);
        useEffect(() => {
            const handler = (data: any) => {
                setAwardedCard({ 
                    name: data.name, 
                    shape: data.shape,
                    playerColor: data.playerColor || '#fbbf24'
                });
                setShowCardAward(true);
            };
            EventBus.on("card-awarded", handler);
            return () => {
                EventBus.removeListener("card-awarded", handler);
            };
        }, []);

        const closeCardAward = () => {
            setShowCardAward(false);
            setAwardedCard(null);
        };
    const lastPlayerRef = useRef<number | null>(null);

    useEffect(() => {
        const currentPlayer = getCurrentPlayer();
        if (currentPlayer && gameStarted && currentPhase === "REFORÇAR") {
            const isNewPlayer = lastPlayerRef.current !== currentPlayer.id;

            if (isNewPlayer) {
                const hasSeenObjective = firstRoundObjectiveShown.has(
                    currentPlayer.id
                );

                console.log(
                    `Mudança de jogador para ${currentPlayer.id} (${currentPlayer.color}):`,
                    {
                        previousPlayer: lastPlayerRef.current,
                        hasSeenObjective,
                        willShowTransition: !hasSeenObjective,
                    }
                );

                if (!hasSeenObjective) {
                    console.log(
                        `Iniciando transição para jogador ${currentPlayer.id}`
                    );
                    setShowTransition(true);
                    setShowObjective(false);
                }
            }

            lastPlayerRef.current = currentPlayer.id;
        }
    }, [
        getCurrentPlayer()?.id,
        currentPhase,
        gameStarted,
        firstRoundObjectiveShown,
    ]);


    const handleStartGame = (playerCount: number) => {
        startGame(playerCount);
        setShowStartMenu(false);
        setShowTransition(false);
    };

    const handleShowObjective = () => {
        if (shouldShowAutomaticObjective()) {
            setShowObjective(true);
            markObjectiveAsShown();
        } else {
            setShowObjectiveConfirmation(true);
        }
    };

    const handleCloseObjective = () => {
        setShowObjective(false);
    };

    const handleTurnTransitionComplete = () => {
        setShowTransition(false);
        setShowObjective(true);
        markObjectiveAsShown();
    };

    const handleConfirmShowObjective = () => {
        setShowObjectiveConfirmation(false);
        setShowObjective(true);
    };

    const handleCancelShowObjective = () => {
        setShowObjectiveConfirmation(false);
    };

    const handleShowTroopAllocation = () => {
        setShowTroopAllocation(true);
    };


    
    const handleShowAttackBar = () => {
        setShowAttackBar(true);
    };

    const handleCloseAttackBar = () => {
        setShowAttackBar(false);
    };

    const handleCloseTroopAllocation = () => {
        console.log("handleCloseTroopAllocation called");
        setShowTroopAllocation(false);
    };

    const mustExchangeCards =
        currentPhase === "REFORÇAR" &&
        (getCurrentPlayer()?.cards.length || 0) >= 5;

    useEffect(() => {
        if (mustExchangeCards) {
            setShowCardExchange(true);
        }
    }, [mustExchangeCards]);

    useEffect(() => {
        setShowTroopAllocation(false);
    }, [currentPlayerIndex, currentRound, currentPhase]);

    const getPlayerColor = (color: string) => {
        const colorMap: Record<string, string> = {
            azul: "#2563eb",
            vermelho: "#dc2626",
            verde: "#16a34a",
            branco: "#b7c0cd",
        };
        return colorMap[color] || "#d2d9e3ff";
    };

    const currentPlayer = getCurrentPlayer();

    if (showStartMenu) {
        return (
            <div className="start-menu">
                <div className="start-menu-content">
                    <h1>WAR</h1>
                    <p>Selecione o número de jogadores para começar</p>
                    <div className="player-selection">
                        {[1, 2, 3, 4].map((count) => (
                            <button
                                key={count}
                                className="player-count-btn"
                                onClick={() => handleStartGame(count)}
                            >
                                {count} {count === 1 ? "Jogador" : "Jogadores"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!gameStarted || !currentPlayer) {
        return null;
    }

    return (
        <>
            <div className="game-ui">
                <div className="game-status">
                    <div
                        className="current-player"
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            fontSize: "15px",
                        }}
                    >
                        <span>
                            Jogador{" "}
                            {currentPlayer.color.charAt(0).toUpperCase() +
                                currentPlayer.color.slice(1)}
                        </span>
                    </div>

                    <div className="game-info">
                        <span>Rodada: {currentRound + 1}</span>
                        <span
                            className={`phase-indicator ${
                                currentPhase === "REFORÇAR"
                                    ? "reinforcement-phase"
                                    : ""
                            }`}
                        >
                            Fase: {currentPhase}
                            {currentPhase === "REFORÇAR"}
                        </span>
                    </div>
                </div>

                <div className="game-controls">
                    {currentPhase === "REFORÇAR" && (
                        <button
                            className={`troop-allocation-btn ${
                                getAvailableTroopsToAllocate() === 0 || mustExchangeCards
                                    ? "disabled"
                                    : ""
                            }`}
                            onClick={
                                getAvailableTroopsToAllocate() > 0 && !mustExchangeCards
                                    ? handleShowTroopAllocation
                                    : undefined
                            }
                            disabled={getAvailableTroopsToAllocate() === 0 || mustExchangeCards}
                            title={
                                mustExchangeCards
                                    ? "Você deve trocar cartas antes de alocar tropas"
                                    : getAvailableTroopsToAllocate() > 0
                                    ? "Alocar tropas de reforço nos seus territórios"
                                    : "Tropas já foram alocadas nesta fase"
                            }
                        >
                            {getAvailableTroopsToAllocate() > 0
                                ? "Alocar Tropas"
                                : "Tropas Alocadas"}
                        </button>
                    )}

                    {currentPhase === "REFORÇAR" && currentRound > 0 && (
                        <button
                            className={`card-exchange-btn ${
                                mustExchangeCards ? "must-exchange" : ""
                            }`}
                            onClick={() => setShowCardExchange(true)}
                            disabled={false}
                            title={
                                mustExchangeCards
                                    ? "Troca obrigatória (5+ cartas)"
                                    : "Trocar cartas por exércitos"
                            }
                        >
                            Trocar Cartas ({currentPlayer.cards.length})
                        </button>
                    )}

                    {currentPhase === "ATACAR" && currentRound > 0 && !showAttackBar && (
                        <button
                            className="attack-toggle-btn"
                            onClick={handleShowAttackBar}
                            title="Iniciar fase de ataque"
                        >
                            Iniciar Ataque
                        </button>
                    )}
                    <button
                        className="objective-btn"
                        onClick={handleShowObjective}
                        title="Ver meu objetivo (confidencial)"
                    >
                        Meu Objetivo
                    </button>

                    <button
                        className={`next-phase-btn ${
                            (currentPhase === "REFORÇAR" &&
                                getAvailableTroopsToAllocate() > 0) || mustExchangeCards ||
                            (currentPhase === "ATACAR" && showAttackBar)
                                ? "disabled"
                                : ""
                        }`}
                        onClick={
                            (currentPhase === "REFORÇAR" &&
                                getAvailableTroopsToAllocate() > 0) ||
                            (currentPhase === "ATACAR" && currentRound > 0 && showAttackBar)
                                ? undefined
                                : nextPhase
                        }
                        disabled={
                            (currentPhase === "REFORÇAR" &&
                                getAvailableTroopsToAllocate() > 0) || mustExchangeCards ||
                            (currentPhase === "ATACAR" && showAttackBar)
                        }
                        title={
                            mustExchangeCards
                            ? "Você deve trocar cartas antes de alocar tropas"
                            : currentPhase === "REFORÇAR" &&
                            getAvailableTroopsToAllocate() > 0
                                ? "Você deve alocar todas as tropas antes de avançar"
                                : currentPhase === "ATACAR" && currentRound > 0 && showAttackBar
                                ? "Feche a barra de ataque antes de avançar"
                                : currentRound === 0 && currentPhase === "REFORÇAR"
                                ? "Próximo jogador (primeira rodada - só alocação)"
                                : "Avançar para próxima fase"
                        }
                    >
                        Próxima Fase
                    </button>
                </div>

                <div className="players-info">
                    <h4>Jogadores:</h4>
                    <div className="players-list">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className={`player-item ${
                                    player.id === currentPlayer.id
                                        ? "active"
                                        : ""
                                }`}
                            >
                                <div
                                    className="player-dot"
                                    style={{
                                        backgroundColor: getPlayerColor(
                                            player.color
                                        ),
                                    }}
                                />
                                {player.color}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showTransition && (
                <TurnTransition
                    onObjectiveShown={handleTurnTransitionComplete}
                />
            )}

            <ObjectiveDisplay
                showObjective={showObjective && !showTransition}
                showConfirmation={showObjectiveConfirmation}
                onClose={handleCloseObjective}
                onConfirm={handleConfirmShowObjective}
                onCancel={handleCancelShowObjective}
            />

            <TroopAllocation
                isVisible={showTroopAllocation}
                onClose={handleCloseTroopAllocation}
                isDimmed={showObjective || showObjectiveConfirmation || showCardExchange}
            />

            <AttackBar
                isVisible={showAttackBar}
                onClose={handleCloseAttackBar}
                isDimmed={showObjective || showObjectiveConfirmation || showCardExchange}
            />
            
            <CardExchange
                isVisible={showCardExchange}
                onClose={() => setShowCardExchange(false)}
                isDimmed={
                    showObjective ||
                    showObjectiveConfirmation ||
                    showTroopAllocation
                }
            />

            {showCardAward && awardedCard && (
                <div className="card-award-overlay" onClick={closeCardAward}>
                    <div className="card-award-modal" onClick={e=>e.stopPropagation()}>
                        <div className="card-award-header">
                            <h2>Você ganhou uma carta!</h2>
                        </div>
                        <div className="card-award-body">
                            <div
                                className="card-award-card"
                                style={{ borderColor: awardedCard.playerColor || '#fbbf24' }}
                            >
                                <span className="card-shape" style={{color: awardedCard.playerColor || '#fbbf24'}}>
                                    {awardedCard.shape === 'Square' && '■'}
                                    {awardedCard.shape === 'Circle' && '●'}
                                    {awardedCard.shape === 'Triangle' && '▲'}
                                    {awardedCard.shape === 'Wildcard' && '★'}
                                    {['Square','Circle','Triangle','Wildcard'].includes(awardedCard.shape) ? '' : '★'}
                                </span>
                            </div>
                            <p className="card-award-name"><strong>{awardedCard.name}</strong></p>
                            <p className="card-award-hint">Troque 3 cartas válidas para ganhar reforços.</p>
                            <button className="confirm-btn" onClick={closeCardAward}>Ok</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GameUI;

