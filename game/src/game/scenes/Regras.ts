
import { Scene } from 'phaser';

export class Regras extends Scene {
    private pageIndex = 0;
    private pages = [
        {
            bg: 'regras1'
        },
        {
            bg: 'regras2'
        },
        {
            bg: 'regras3'
        },
        {
            bg: 'regras4'
        }
    ];

    private setaNext?: Phaser.GameObjects.Image;
    private botaoMenu?: Phaser.GameObjects.Image;
    private bgImage?: Phaser.GameObjects.Image;

    constructor() {
        super('Regras');
    }

    create() {
        this.pageIndex = 0; // Sempre começa da primeira página ao entrar na cena
        this.showPage(0);
    }

    private showPage(index: number) {
        const page = this.pages[index];

        // Remove imagem anterior
        if (this.bgImage) this.bgImage.destroy();
        if (this.setaNext) this.setaNext.destroy();
        if (this.botaoMenu) this.botaoMenu.destroy();

        // Adiciona imagem de fundo centralizada e cobrindo a tela
        this.bgImage = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, page.bg)
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
            .setDepth(0);


        if (index < this.pages.length - 1) {
            // Botão Next como sprite
            this.setaNext = this.add.image(1078.5, 625, 'setaNext')
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.pageIndex++;
                    this.showPage(this.pageIndex);
                }).setDepth(1);
        } else {
            // Botão Voltar ao Menu como sprite
            this.botaoMenu = this.add.image(600, 630, 'botaoMenu')
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.scene.start('Menu');
                }).setDepth(1);
        }
    }
}
