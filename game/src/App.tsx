import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { GameProvider, useGameContext } from './context/GameContext';
import GameUI from './components/GameUI';
import { EventBus } from './game/EventBus';

const AppContent = () => {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showGameUI, setShowGameUI] = useState(false);
    const { resetGame } = useGameContext();

    useEffect(() => {
        const handleStartGame = () => {
            setShowGameUI(true);
        };

        const handleBackToMenu = () => {
            setShowGameUI(false);
            // Resetar completamente o jogo quando voltar ao menu
            resetGame();
            // Voltar para o MainMenu, tela inicial
            if (phaserRef.current?.scene) {
                phaserRef.current.scene.scene.start('MainMenu');
            }
        };

        EventBus.on('start-game-ui', handleStartGame);
        EventBus.on('back-to-menu', handleBackToMenu);

        return () => {
            EventBus.removeListener('start-game-ui');
            EventBus.removeListener('back-to-menu');
        };
    }, [resetGame]);

    const currentScene = (scene: Phaser.Scene) => {
        console.log('Cena atual:', scene.scene.key);
    }

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            {showGameUI && <GameUI />}
        </div>
    );
};

function App() {
    return (
        <GameProvider>
            <AppContent />
        </GameProvider>
    );
}

export default App
