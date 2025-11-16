import React, { useState, useEffect, useRef } from "react";
import { useGameContext } from "../context/GameContext";
import ObjectiveDisplay from "./ObjectiveDisplay";
import TurnTransition from "./TurnTransition";
import TroopAllocation from "./TroopAllocation";
import AttackBar from "./AttackBar";
import "./GameUI.css";

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

    // Função para calcular tropas disponíveis para alocar
    const getAvailableTroopsToAllocate = () => {
        const currentPlayer = getCurrentPlayer();
        console.log(
            "getAvailableTroopsToAllocate - Player:",
            currentPlayer?.id,
            "troopsAllocatedThisPhase:",
            troopsAllocatedThisPhase
        );
        if (!currentPlayer || troopsAllocatedThisPhase) return 0;

        // Calcular tropas base (mesmo cálculo do TroopAllocation)
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

        const totalTroops = Math.min(
            territoryBonus + roundBonus + continentBonus + cardBonus,
            20
        );
        return totalTroops;
    };

    const [showObjective, setShowObjective] = useState(false);
    const [showStartMenu, setShowStartMenu] = useState(!gameStarted);
    const [showTransition, setShowTransition] = useState(false);
    const [showTroopAllocation, setShowTroopAllocation] = useState(false);
    const [showAttackBar, setShowAttackBar] = useState(false);
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

    // Reset do estado apenas quando muda de jogador ou fase (não abre automaticamente)
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
                                getAvailableTroopsToAllocate() === 0
                                    ? "disabled"
                                    : ""
                            }`}
                            onClick={
                                getAvailableTroopsToAllocate() > 0
                                    ? handleShowTroopAllocation
                                    : undefined
                            }
                            disabled={getAvailableTroopsToAllocate() === 0}
                            title={
                                getAvailableTroopsToAllocate() > 0
                                    ? "Alocar tropas de reforço nos seus territórios"
                                    : "Tropas já foram alocadas nesta fase"
                            }
                        >
                            {getAvailableTroopsToAllocate() > 0
                                ? "Alocar Tropas"
                                : "Tropas Alocadas"}
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
                                getAvailableTroopsToAllocate() > 0) ||
                            (currentPhase === "ATACAR" && currentRound > 0 && showAttackBar)
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
                                getAvailableTroopsToAllocate() > 0) ||
                            (currentPhase === "ATACAR" && currentRound > 0 && showAttackBar)
                        }
                        title={
                            currentPhase === "REFORÇAR" &&
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
                isDimmed={showObjective || showObjectiveConfirmation}
            />

            <AttackBar
                isVisible={showAttackBar}
                onClose={handleCloseAttackBar}
                isDimmed={showObjective || showObjectiveConfirmation}
            />
        </>
    );
};

export default GameUI;

