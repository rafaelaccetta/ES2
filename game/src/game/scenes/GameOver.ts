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

        try {
            if (this.textures.exists('background')) {
                const bg = this.add.image(width / 2, height / 2, 'background').setDepth(7);
                bg.setDisplaySize(width, height);
                bg.setAlpha(0.45);
            } else {
                this.add.rectangle(width / 2, height / 2, width, height, 0x071026, 0.9).setDepth(8);
                this.add.circle(width - 140, 120, 260, 0x112233, 0.07).setDepth(9);
                this.add.circle(120, height - 140, 200, 0x1a2b3b, 0.06).setDepth(9);
            }
        } catch (e) {
            this.add.rectangle(width / 2, height / 2, width, height, 0x071026, 0.9).setDepth(8);
        }

        const panelW = Math.min(980, width - 120);
        const panelH = Math.min(620, height - 160);
        const panelX = width / 2;
        const panelY = height / 2;

        const panelKey = 'gameover-panel';
        const panelPad = 24;
        const panelRadius = 18;
        const texW = Math.round(panelW + panelPad);
        const texH = Math.round(panelH + panelPad);
        if (!this.textures.exists(panelKey)) {
            const gg = this.add.graphics();
            gg.fillStyle(0x000000, 0.22);
            try {
                (gg as any).fillRoundedRect(8, 8, panelW, panelH, panelRadius);
            } catch (e) {
                gg.fillRect(8, 8, panelW, panelH);
            }

            gg.fillStyle(0xf8fafc, 0.92);
            try {
                (gg as any).fillRoundedRect(0, 0, panelW, panelH, panelRadius);
                gg.lineStyle(2, 0x111827, 0.12);
                try { (gg as any).strokeRoundedRect(0, 0, panelW, panelH, panelRadius); } catch (e) { gg.strokeRect(0, 0, panelW, panelH); }
            } catch (e) {
                gg.fillRect(0, 0, panelW, panelH);
                gg.lineStyle(2, 0x111827, 0.12);
                gg.strokeRect(0, 0, panelW, panelH);
            }

            gg.generateTexture(panelKey, texW, texH);
            gg.destroy();
        }

        const panel = this.add.image(panelX, panelY, panelKey).setDepth(11);
        panel.setDisplaySize(texW, texH);

        const data: any = (this.scene.settings && (this.scene.settings as any).data) || {};
        const winnerColor = data.winnerColor || 'unknown';
        const winnerId = data.winnerId != null ? data.winnerId : null;
        const objectiveText = data.winnerObjective || '';

        const title = this.add
            .text(panelX, panelY - panelH / 2 + 40, 'GAME OVER', {
                fontFamily: 'Arial Black',
                fontSize: 56,
                color: '#0b1220',
            })
            .setOrigin(0.5)
            .setDepth(12);
        title.setShadow(2, 6, '#000000', 10);

        this.add
            .text(panelX, panelY - panelH / 2 + 110, 'Victory achieved — well played!', {
                fontFamily: 'Arial',
                fontSize: 16,
                color: '#475569',
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
            .circle(panelX - 180, panelY - 10, 52, badgeColorNum)
            .setDepth(12)
            .setStrokeStyle(3, 0x0b1220, 0.9);

        const winnerLabel = winnerColor
            ? `Winner: ${String(winnerColor).toUpperCase()}`
            : `Winner: ${winnerId}`;

        this.add
            .text(panelX - 90, panelY - 0, winnerLabel, {
                fontFamily: 'Arial',
                fontSize: 30,
                color: '#0b1220',
                lineSpacing: 6,
            })
            .setOrigin(0, 0.5)
            .setDepth(12)
            .setShadow(1, 2, '#ffffff', 0);

        let subtitleForTween: Phaser.GameObjects.Text | null = null;
        if (objectiveText) {
            subtitleForTween = this.add
                .text(panelX, panelY + 80, `Objective: ${objectiveText}`, {
                    fontFamily: 'Arial',
                    fontSize: 18,
                    color: '#334155',
                    wordWrap: { width: panelW - 200 },
                    lineSpacing: 6,
                })
                .setOrigin(0.5)
                .setDepth(12) as Phaser.GameObjects.Text;
        }

        const btnY = panelY + panelH / 2 - 50;

        const makeButton = (x: number, label: string, fillHex: string) => {
            const key = 'btn-' + fillHex.replace('#', '');
            if (!this.textures.exists(key)) {
                const g = this.add.graphics();
                const w = 220, h = 56, r = 12;
                g.fillStyle(parseInt(fillHex.replace('#', ''), 16), 1);
                try {
                    (g as any).fillRoundedRect(0, 0, w, h, r);
                    g.lineStyle(2, 0x000000, 0.15);
                    try { (g as any).strokeRoundedRect(0, 0, w, h, r); } catch (e) { g.strokeRect(0, 0, w, h); }
                } catch (e) {
                    g.fillRect(0, 0, w, h);
                    g.lineStyle(2, 0x000000, 0.15);
                    g.strokeRect(0, 0, w, h);
                }
                g.generateTexture(key, w, h);
                g.destroy();
            }

            const img = this.add.image(x, btnY, key).setInteractive({ useHandCursor: true }).setDepth(12);
            img.setDisplaySize(220, 56);
            const txt = this.add
                .text(x, btnY, label, {
                    fontFamily: 'Arial Black',
                    fontSize: 20,
                    color: '#ffffff',
                })
                .setOrigin(0.5)
                .setDepth(13);
            img.on('pointerover', () => { img.setScale(1.03); txt.setScale(1.02); });
            img.on('pointerout', () => { img.setScale(1); txt.setScale(1); });
            img.on('pointerdown', () => { img.setScale(0.98); });
            img.on('pointerup', () => { img.setScale(1); });
            return { rect: img, txt } as any;
        };

        const back = makeButton(panelX, 'Back to Menu', '#4b5563');
        back.rect.on('pointerdown', () => {
            EventBus.emit('back-to-menu');
            try { this.scene.start('MainMenu'); } catch (e) {}
        });

        try {
            this.add.circle(panelX - 180, panelY - 10, 72, badgeColorNum, 0.08).setDepth(11);
            this.add.circle(panelX - 180, panelY - 10, 96, badgeColorNum, 0.04).setDepth(10);
        } catch (e) { /* ignore */ }

        this.cameras.main.fadeIn(450, 10, 15, 24);
        const targets: any[] = [panel, title];
        if (subtitleForTween) targets.push(subtitleForTween);
        this.tweens.add({ targets, ease: 'Back', duration: 600, alpha: { from: 0, to: 1 }, scale: { from: 0.98, to: 1 }, delay: 80 });

        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
