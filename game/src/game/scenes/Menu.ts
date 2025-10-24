import { Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class Menu extends Scene {
    constructor() {
        super('Menu');
    }

    create() {

    this.cameras.main.setBackgroundColor('#000000');

    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'menu');

    this.add.image(585, 315, 'botaoJogar')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            // Emite evento para mostrar o GameUI
            EventBus.emit('start-game-ui');
            this.scene.start('Jogo');
        });

    this.add.image(585, 384, 'botaoRegras')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.start('Regras');
        });

    this.add.image(583, 453, 'botaoSair')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.start('MainMenu');
        });


    EventBus.emit('current-scene-ready', this);


    }
}
