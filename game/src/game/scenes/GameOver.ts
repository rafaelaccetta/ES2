import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText : Phaser.GameObjects.Text;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        try { EventBus.emit('hide-ui'); } catch (e) {}

        this.camera = this.cameras.main;
        const { width, height } = this.cameras.main;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(10);

        const panelW = Math.min(900, width - 120);
        const panelH = Math.min(520, height - 160);
        const panelX = width / 2;
        const panelY = height / 2;

        this.add
            .rectangle(panelX, panelY, panelW, panelH, 0xffffff, 1)
            .setStrokeStyle(4, 0x222222)
            .setDepth(11);

        const data: any = (this.scene.settings && (this.scene.settings as any).data) || {};
        const winnerColor = data.winnerColor || 'unknown';
        const winnerId = data.winnerId != null ? data.winnerId : null;
        const objectiveText = data.winnerObjective || '';

        this.add
            .text(panelX, panelY - panelH / 2 + 60, 'GAME OVER', {
                fontFamily: 'Arial Black',
                fontSize: 56,
                color: '#222222',
            })
            .setOrigin(0.5)
            .setDepth(12);

        const colorMap: Record<string, string> = {
            azul: '#2563eb',
            vermelho: '#dc2626',
            verde: '#16a34a',
            branco: '#b7c0cd',
            unknown: '#888888',
        };

        const badgeColorHex = colorMap[winnerColor] || colorMap.unknown;
        const badgeColorNum = parseInt(badgeColorHex.replace('#', ''), 16);

        this.add
            .circle(panelX - 160, panelY - 10, 48, badgeColorNum)
            .setDepth(12)
            .setStrokeStyle(3, 0x000000);

        const winnerLabel = winnerColor
            ? `Winner: ${String(winnerColor).toUpperCase()}`
            : `Winner: ${winnerId}`;

        this.add
            .text(panelX - 40, panelY - 10, winnerLabel, {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#222222',
            })
            .setOrigin(0, 0.5)
            .setDepth(12);

        if (objectiveText) {
            this.add
                .text(panelX, panelY + 30, `Objective: ${objectiveText}`, {
                    fontFamily: 'Arial',
                    fontSize: 18,
                    color: '#333333',
                    wordWrap: { width: panelW - 80 },
                })
                .setOrigin(0.5)
                .setDepth(12);
        }

        const btnY = panelY + panelH / 2 - 70;

        const makeButton = (x: number, label: string, fillHex: string) => {
            const fill = parseInt(fillHex.replace('#', ''), 16);
            const rect = this.add
                .rectangle(x, btnY, 220, 56, fill)
                .setDepth(12)
                .setStrokeStyle(2, 0x000000)
                .setInteractive({ useHandCursor: true });
            const txt = this.add
                .text(x, btnY, label, {
                    fontFamily: 'Arial Black',
                    fontSize: 20,
                    color: '#ffffff',
                })
                .setOrigin(0.5)
                .setDepth(13);
            rect.on('pointerover', () => rect.setScale(1.02));
            rect.on('pointerout', () => rect.setScale(1));
            return { rect, txt };
        };

        const back = makeButton(panelX - 140, 'Back to Menu', '#4b5563');
        back.rect.on('pointerdown', () => {
            EventBus.emit('back-to-menu');
            try { this.scene.start('MainMenu'); } catch (e) {}
        });

        const playAgain = makeButton(panelX + 140, 'Play Again', '#10b981');
        playAgain.rect.on('pointerdown', () => {
            EventBus.emit('start-game-ui');
            try { this.scene.start('MainMenu'); } catch (e) {}
        });

        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
