import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene{

    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'background');

        const botaoInicio = this.add.image(315, 540, 'botaoInicio')
            .setInteractive({ useHandCursor: true });

        botaoInicio.on('pointerdown', () => {
            this.scene.start('Menu');
        });

    // Removido salvamento da cena atual

        EventBus.emit('current-scene-ready', this);
    }
}
    
    