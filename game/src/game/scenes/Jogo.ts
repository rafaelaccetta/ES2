import { Scene } from "phaser";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import MapSVG from "../../MapSVG";
import { EventBus } from '../EventBus';
import PlayerBadge from "../../PlayerBadge";

export class Jogo extends Scene {
    constructor() {
        super("Jogo");
    }

    create() {
        this.cameras.main.setBackgroundColor("#ffffff");

        let mapContainer = document.getElementById("map-container");
        if (!mapContainer) {
            mapContainer = document.createElement("div");
            mapContainer.id = "map-container";
            mapContainer.style.position = "absolute";
            mapContainer.style.top = "50%";
            mapContainer.style.left = "50%";
            mapContainer.style.transform = "translate(-50%, -50%)";
            mapContainer.style.width = "1100px";
            mapContainer.style.height = "500px";
            mapContainer.style.display = "flex";
            mapContainer.style.justifyContent = "center";
            mapContainer.style.alignItems = "center";
            mapContainer.style.zIndex = "10";
            document.body.appendChild(mapContainer);
        }

        this.add.image(150, 630, 'botaoX')
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    // Emite evento para esconder o GameUI e voltar ao menu
                    EventBus.emit('back-to-menu');
                    this.scene.start('MainMenu');
                }).setDepth(1);

        const root = ReactDOM.createRoot(mapContainer);

        const AppOverlay: React.FC = () => {
            // Usar estado para controlar o número de jogadores
            const [playerCount, setPlayerCount] = React.useState<number>(0);
            
            React.useEffect(() => {
                // Escutar evento do EventBus para saber quantos jogadores há
                const handlePlayersUpdate = (data: { playerCount: number }) => {
                    setPlayerCount(data.playerCount);
                };
                
                EventBus.on('players-updated', handlePlayersUpdate);
                
                return () => {
                    EventBus.removeListener('players-updated');
                };
            }, []);
            
            const playerIds = React.useMemo(
                () =>
                    Array.from(
                        { length: playerCount },
                        (_, i) => `player${i + 1}`
                    ),
                [playerCount]
            );
            const playerColors = ["#2563eb", "#dc2626", "#16a34a", "#d2d9e3ff"];
            const colors: Record<string, string> = React.useMemo(() => {
                const colorMap: Record<string, string> = {};
                for (let i = 0; i < playerCount; i++) {
                    colorMap[`player${i + 1}`] = playerColors[i];
                }
                return colorMap;
            }, [playerCount]);

            const [activePlayer, setActivePlayer] =
                React.useState<string>("");
            const [owners, setOwners] = React.useState<Record<string, string>>(
                {}
            );
            // Exemplo vindo do backend (remover depois) para pegar a lista retornada pelo backend
            const [selectedTerritories] = React.useState<string[]>([
                "argentina",
                "venezuela",
                "peru",
                "inglaterra",
            ]);

            const territoriesByPlayer = React.useMemo(() => {
                const map: Record<string, string[]> = {};
                for (const pid of playerIds) map[pid] = [];
                for (const [id, owner] of Object.entries(owners)) {
                    if (!map[owner]) map[owner] = [];
                    map[owner].push(id);
                }
                return map;
            }, [owners, playerIds]);

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(MapSVG, {
                    owners,
                    highlightOwner: activePlayer,
                    allowEditOwner: true,
                    selectedTerritories,
                    onOwnersChange: (next) => setOwners(next),
                }),
                // Renderiza badges na direita para mostrar territórios por jogador (remover depois)
                ...playerIds.map((pid, index) =>
                    React.createElement(PlayerBadge, {
                        key: pid,
                        playerNumber: index + 1,
                        color: colors[pid],
                        territories: territoriesByPlayer[pid] ?? [],
                        position: { top: 24 + index * 68, right: 24 },
                        active: activePlayer === pid,
                        onSelect: () => setActivePlayer(activePlayer === pid ? "" : pid),
                    })
                )
            );
        };

        root.render(React.createElement(AppOverlay));

        this.events.once("shutdown", () => {
            root.unmount();
            mapContainer!.remove();
        });

        this.input.once("pointerdown", () => {
            this.scene.start("Menu");
        });
    }
}

