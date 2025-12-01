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

        // FIX: Changed coordinates from (150, 630) to (980, 50) for top-right placement
        this.add
            .image(1150, 50, "botaoX")
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                // Emite evento para esconder o GameUI e voltar ao menu
                EventBus.emit("back-to-menu");
                this.scene.start("MainMenu");
            })
            .setDepth(1);

        EventBus.on('game-won', (payload: any) => {
            try {
                EventBus.emit('hide-ui');
                this.scene.start('GameOver', payload);
            } catch (e) {
                console.error('Error handling game-won in Jogo scene', e);
            }
        });

        const root = ReactDOM.createRoot(mapContainer);

        const AppOverlay: React.FC = () => {
            const [playerCount, setPlayerCount] = React.useState<number>(0);
            const [playersData, setPlayersData] = React.useState<any[]>([]);

            React.useEffect(() => {
                const handlePlayersUpdate = (data: {
                    playerCount: number;
                    players?: any[];
                    lastMove?: {
                        source?: string;
                        target?: string;
                        toMove?: number;
                    };
                }) => {
                    console.log("Jogo: players-updated received", data);

                    try {
                        console.log("Jogo: players-updated (json)");
                        console.log(JSON.stringify(data, null, 2));
                    } catch (e) {
                        // ignore
                    }

                    if (data.lastMove && data.lastMove.target) {
                        const targetName = data.lastMove.target;
                        console.log("Jogo: lastMove info:", data.lastMove);
                        const playersArr = data.players || [];
                        const ownerIndex = playersArr.findIndex(
                            (p: any) =>
                                Array.isArray(p.territories) &&
                                p.territories.includes(targetName)
                        );
                        if (ownerIndex !== -1) {
                            const owner = playersArr[ownerIndex];
                            const armiesForTarget =
                                owner.territoriesArmies &&
                                owner.territoriesArmies[targetName];
                            console.log(
                                `Jogo: owner found at index ${ownerIndex} (player${
                                    ownerIndex + 1
                                }) for territory '${targetName}'. armies:`,
                                armiesForTarget
                            );
                        } else {
                            console.log(
                                "Jogo: no owner found for target territory (string match). Will also try normalized ids."
                            );
                            try {
                                const normalize = (name: string) =>
                                    name
                                        .normalize("NFD")
                                        .replace(/\p{Diacritic}+/gu, "")
                                        .toLowerCase()
                                        .replace(/\s+/g, "")
                                        .replace(/[^a-z0-9]/g, "");
                                const normTarget = normalize(targetName);
                                console.log(
                                    "Jogo: normalized target:",
                                    normTarget
                                );
                                playersArr.forEach((p: any, idx: number) => {
                                    const armies = p.territoriesArmies || {};
                                    const matchingKey = Object.keys(
                                        armies
                                    ).find((k) => normalize(k) === normTarget);
                                    if (matchingKey) {
                                        console.log(
                                            `Jogo: matched owner at index ${idx} via normalized key '${matchingKey}' -> armies:`,
                                            armies[matchingKey]
                                        );
                                    }
                                });
                            } catch (e) {
                                console.warn(
                                    "Jogo: normalization check failed",
                                    e
                                );
                            }
                        }
                    }

                    setPlayerCount(data.playerCount);
                    if (data.players) {
                        setPlayersData(data.players);
                    }
                };

                EventBus.on("players-updated", handlePlayersUpdate as any);
                EventBus.emit("request-game-state");

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

            const normalizeId = React.useCallback((name: string) => {
                return name
                    .normalize("NFD")
                    .replace(/\p{Diacritic}+/gu, "")
                    .toLowerCase()
                    .replace(/\s+/g, "")
                    .replace(/[^a-z0-9]/g, "");
            }, []);

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

            const [selectedTerritories, setSelectedTerritories] =
                React.useState<string[]>([]);
            const [hidden, setHidden] = React.useState<boolean>(false);

            React.useEffect(() => {
                const handleHighlight = (data: any) => {
                    const { territories } = data;
                    setSelectedTerritories(territories || []);
                };

                EventBus.on("highlight-territories", handleHighlight);

                return () => {
                    EventBus.removeListener(
                        "highlight-territories",
                        handleHighlight
                    );
                };
            }, []);

            React.useEffect(() => {
                const onHide = () => setHidden(true);
                const onShow = () => setHidden(false);
                EventBus.on('hide-ui', onHide);
                EventBus.on('show-ui', onShow);
                return () => {
                    EventBus.removeListener('hide-ui', onHide);
                    EventBus.removeListener('show-ui', onShow);
                };
            }, []);

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

            const handleTerritoryClick = React.useCallback(
                (territoryId: string) => {
                    console.log("Jogo: territory clicked:", territoryId);
                    EventBus.emit("territory-selected", territoryId);
                },
                []
            );

            if (hidden) return React.createElement(React.Fragment, null);

            return React.createElement(
                React.Fragment,
                null,
                React.createElement(MapSVG, {
                    owners,
                    highlightOwner: activePlayer,
                    allowEditOwner: false,
                    selectedTerritories,
                    ownerColors: colors,
                    troopCounts,
                    onTerritorySelected: handleTerritoryClick,
                })
            );
        };

        root.render(React.createElement(AppOverlay));

        this.events.once("shutdown", () => {
            root.unmount();
            mapContainer!.remove();
        });
    }
}