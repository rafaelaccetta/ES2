
import { Scene } from 'phaser';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import MapSVG from '../../MapSVG';

export class Jogo extends Scene {
    constructor() {
        super('Jogo');
    }

    create() {

        this.cameras.main.setBackgroundColor('#ffffff');
        
        // Cria um container HTML para o mapa exatamente do tamanho do Phaser
        let mapContainer = document.getElementById('map-container');
        if (!mapContainer) {
            mapContainer = document.createElement('div');
            mapContainer.id = 'map-container';
            mapContainer.style.position = 'absolute';
            mapContainer.style.top = '50%';
            mapContainer.style.left = '50%';
            mapContainer.style.transform = 'translate(-50%, -50%)';
            mapContainer.style.width = '1100px';
            mapContainer.style.height = '500px';
            mapContainer.style.display = 'flex';
            mapContainer.style.justifyContent = 'center';
            mapContainer.style.alignItems = 'center';
            mapContainer.style.zIndex = '10';
            document.body.appendChild(mapContainer);
        }

    const root = ReactDOM.createRoot(mapContainer);
    root.render(React.createElement(MapSVG));


        this.events.once('shutdown', () => {
            root.unmount();
            mapContainer!.remove();
        });

        this.input.once('pointerdown', () => {
            this.scene.start('Menu');
        });
    }
}
