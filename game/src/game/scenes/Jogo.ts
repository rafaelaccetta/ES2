import { Scene } from "phaser";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import MapSVG from "../../MapSVG";
import { EventBus } from "../EventBus";

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
                // Emite evento para esconder o GameUI e voltar ao menu
                EventBus.emit("back-to-menu");
                this.scene.start("MainMenu");
            })
            .setDepth(1);

        const root = ReactDOM.createRoot(mapContainer);

        const AppOverlay: React.FC = () => {
            // Usar estado para controlar o número de jogadores e seus territórios
            const [playerCount, setPlayerCount] = React.useState<number>(0);
            const [playersData, setPlayersData] = React.useState<any[]>([]);

            React.useEffect(() => {
                // Escutar evento do EventBus para saber quantos jogadores há e seus territórios
                const handlePlayersUpdate = (data: {
                    playerCount: number;
                    players?: any[];
                }) => {
                    setPlayerCount(data.playerCount);
                    if (data.players) {
                        setPlayersData(data.players);
                    }
                };

                EventBus.on("players-updated", handlePlayersUpdate);

                return () => {
                    EventBus.removeListener("players-updated");
                };
            }, []);

            const defaultPlayerColors = [
                "#2563eb",
                "#dc2626",
                "#16a34a",
                "#b7c0cd",
            ];
            // converte nomes de cores vindos do GameManager (azul, vermelho, etc.) para hex
            const colorByName: Record<string, string> = React.useMemo(
                () => ({
                    azul: "#2563eb",
                    vermelho: "#dc2626",
                    verde: "#16a34a",
                    branco: "#b7c0cd",
                }),
                []
            );
            const colors: Record<string, string> = React.useMemo(() => {
                const colorMap: Record<string, string> = {};
                for (let i = 0; i < playerCount; i++) {
                    const fromData = playersData[i]?.color as
                        | string
                        | undefined;
                    colorMap[`player${i + 1}`] =
                        (fromData && colorByName[fromData]) ??
                        defaultPlayerColors[i];
                }
                return colorMap;
            }, [playerCount, playersData, colorByName]);

            const activePlayer: string = "";

            // normaliza nomes dos territórios (acentos, espaços) para bater com IDs do SVG
            const normalizeId = React.useCallback((name: string) => {
                return name
                    .normalize("NFD")
                    .replace(/\p{Diacritic}+/gu, "")
                    .toLowerCase()
                    .replace(/\s+/g, "")
                    .replace(/[^a-z0-9]/g, "");
            }, []);

            // Criar mapa de owners baseado nos territórios distribuídos (normalizados para IDs do SVG)
            const owners = React.useMemo(() => {
                const ownersMap: Record<string, string> = {};
                playersData.forEach((player, index) => {
                    if (player && player.territories) {
                        player.territories.forEach((territory: string) => {
                            const id = normalizeId(territory);
                            ownersMap[id] = `player${index + 1}`;
                        });
                    }
                });
                return ownersMap;
            }, [playersData, normalizeId]);

            // Territórios selecionados baseados no jogador ativo
            const selectedTerritories = React.useMemo(() => {
                if (!activePlayer || !playersData.length) return [];

                const playerIndex =
                    parseInt(activePlayer.replace("player", "")) - 1;
                const player = playersData[playerIndex];

                return player?.territories || [];
            }, [activePlayer, playersData]);

            // Removido: mapeamento de territórios por jogador para os badges laterais

            // Mapa de tropas por território
            const troopCounts = React.useMemo(() => {
                const counts: Record<string, number> = {};
                playersData.forEach((player) => {
                    const armies: Record<string, number> | undefined =
                        player?.territoriesArmies;
                    if (!armies) return;
                    Object.entries(armies).forEach(([territoryName, qty]) => {
                        const id = normalizeId(territoryName);
                        counts[id] = (qty as number) ?? 0;
                    });
                });
                return counts;
            }, [playersData, normalizeId]);

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(MapSVG, {
                    owners,
                    highlightOwner: activePlayer,
                    allowEditOwner: false, // Desabilitar edição já que territórios são pré-distribuídos
                    selectedTerritories,
                    ownerColors: colors,
                    troopCounts,
                })
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

