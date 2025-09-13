import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class Regras extends Scene {
    constructor() {
        super('Regras');
    }

    create() {
        this.cameras.main.setBackgroundColor('#ed0ab0');
        this.add.text(100, 100, 'Aqui vão as regras do jogo!', { fontSize: '32px', color: '#fff' });
        this.add.text(100, 200, 'Clique para voltar ao menu', { fontSize: '20px', color: '#fff' });
        this.input.once('pointerdown', () => {
            localStorage.setItem('currentScene', 'Menu');
            this.scene.start('Menu');
        });
    }
}
