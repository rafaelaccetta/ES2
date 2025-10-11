import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        // this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image("botaoInicio", "botao_inicio.png")
        this.load.image("botaoJogar", "botao_jogar.png")
        this.load.image("botaoRegras", "botao_regras.png")
        this.load.image("botaoSair", "botao_sair.png")
        this.load.image("botaoMenu","botao_menu.png")
        
        this.load.image("menu", "menu.png");

        this.load.image("regras1", "regras1.png")
        this.load.image("regras2", "regras2.png")
        this.load.image("regras3", "regras3.png")
        this.load.image("regras4", "regras4.png")

        this.load.image("setaNext","seta_next.png")
        this.load.image("botaoX", "botaoX.png")


    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, você pode definir animações globais aqui.

        // Sempre inicia pelo MainMenu ao carregar
        this.scene.start('MainMenu');
    }
}
