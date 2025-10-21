import { Scene } from "phaser";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import MapSVG from "../../MapSVG";
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

        this.add
            .image(150, 630, "botaoX")
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                this.scene.start("MainMenu");
            })
            .setDepth(1);

        const root = ReactDOM.createRoot(mapContainer);

        const AppOverlay: React.FC = () => {
            const [playerCount] = React.useState<number>(4); // Quantidade de jogadores pode ser 4..6 e vem do back, depois apagar
            const playerIds = React.useMemo(
                () =>
                    Array.from(
                        { length: playerCount },
                        (_, i) => `player${i + 1}`
                    ),
                [playerCount]
            );
            const colors: Record<string, string> = {
                player1: "#e53935",
                player2: "#1e88e5",
                player3: "#43a047",
                player4: "#8e24aa",
                player5: "#fbc02d",
                player6: "#fb8c00",
            };

            const [activePlayer, setActivePlayer] =
                React.useState<string>("player1");
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
                        onSelect: () => setActivePlayer(pid),
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

