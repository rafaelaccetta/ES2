import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class Jogo extends Scene {
    constructor() {
        super('Jogo');
    }

    create() {

    this.cameras.main.setBackgroundColor('#1ac5f9');
    this.add.text(100, 100, 'Aqui vão as regras do jogo!', { fontSize: '32px', color: '#000000' });
        this.add.text(100, 200, 'Clique para voltar ao menu', { fontSize: '20px', color: '#000000' });
        this.input.once('pointerdown', () => {
            localStorage.setItem('currentScene', 'Menu');
            this.scene.start('Menu');
        });

    }
}
