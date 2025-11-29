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
        getCurrentPlayer,
        currentPhase,
        currentRound,
        currentPlayerIndex,
        nextPhase,
        startGame,
        players,
        shouldShowAutomaticObjective,
        markObjectiveAsShown,
        showObjectiveConfirmation,
        setShowObjectiveConfirmation,
        firstRoundObjectiveShown,
    } = useGameContext();

    // Estado para rastrear se tropas já foram alocadas nesta fase
    const [troopsAllocatedThisPhase, setTroopsAllocatedThisPhase] =
        useState(false);

    // Usa diretamente pendingReinforcements do backend
    const getAvailableTroopsToAllocate = () => {
        const currentPlayer = getCurrentPlayer();
        if (!currentPlayer || troopsAllocatedThisPhase) return 0;
        return (currentPlayer as any).pendingReinforcements || 0;
    };

    const [showObjective, setShowObjective] = useState(false);
    const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
    const [showTransition, setShowTransition] = useState(false);
    const [showTroopAllocation, setShowTroopAllocation] = useState(false);
    const [showAttackBar, setShowAttackBar] = useState(false);
    const [showCardExchange, setShowCardExchange] = useState(false);
    const [showCardAward, setShowCardAward] = useState(false);
    const [awardedCard, setAwardedCard] = useState<{name:string;shape:string;playerColor?:string}|null>(null);
        // Escuta evento de carta conquistada
        useEffect(() => {
            const handler = (data: any) => {
                const currentPlayer = getCurrentPlayer();
                const colorMap: Record<string, string> = {
                    azul: "#2563eb",
                    vermelho: "#dc2626",
                    verde: "#16a34a",
                    branco: "#b7c0cd",
                };
                const playerColor = currentPlayer ? (colorMap[currentPlayer.color] || '#fbbf24') : '#fbbf24';
                setAwardedCard({ 
                    name: data.name, 
                    shape: data.shape,
                    playerColor: playerColor
                });
                setShowCardAward(true);
            };
            EventBus.on("card-awarded", handler);
            return () => {
                EventBus.removeListener("card-awarded", handler);
            };
        }, [getCurrentPlayer]);

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

    // Removida autoabertura: usuário decide quando abrir

    const handleStartGame = (playerCount: number) => {
        startGame(playerCount);
        setShowStartMenu(false);
        setShowTransition(false);
    };

    const handleShowObjective = () => {
        // Se estamos na primeira rodada e o jogador ainda não viu o objetivo, mostra direto
        if (shouldShowAutomaticObjective()) {
            setShowObjective(true);
            markObjectiveAsShown();
        } else {
            // Caso contrário, mostra o modal de confirmação
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
        // Marcar como alocado quando fecha
        setTroopsAllocatedThisPhase(true);
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
        const currentPlayer = getCurrentPlayer();
        console.log(
            "Reset troopsAllocatedThisPhase - Jogador:",
            currentPlayer?.id,
            "PlayerIndex:",
            currentPlayerIndex,
            "Fase:",
            currentPhase,
            "Rodada:",
            currentRound
        );

        // Fechar a barra primeiro (sem marcar como alocado)
        setShowTroopAllocation(false);

        // Depois resetar o estado - isso garante que o reset acontece por último
        setTimeout(() => {
            setTroopsAllocatedThisPhase(false);
            console.log("troopsAllocatedThisPhase resetado para false");
        }, 0);
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

                    {currentPhase === "REFORÇAR" && (
                        <button
                            className={`card-exchange-btn ${
                                mustExchangeCards ? "must-exchange" : ""
                            }`}
                            onClick={() => setShowCardExchange(true)}
                            disabled={currentPlayer.cards.length < 3}
                            title={
                                mustExchangeCards
                                    ? "Troca obrigatória (5+ cartas)"
                                    : currentPlayer.cards.length < 3
                                    ? "Precisa de 3+ cartas"
                                    : "Trocar cartas por exércitos"
                            }
                        >
                            Trocar Cartas ({currentPlayer.cards.length})
                        </button>
                    )}  

                    {currentPhase === "ATACAR" && !showAttackBar && (
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
                        onClick={nextPhase}
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
                                : currentPhase === "ATACAR" && showAttackBar
                                ? "Feche a barra de ataque antes de avançar"
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
                            <div className="card-award-card">
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

