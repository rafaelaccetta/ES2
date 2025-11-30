// Link fonte de paises e cartas: https://pt.scribd.com/document/530667103/Cartas-War
import territoriesJson  from "../public/data/territories.json" with {type: "json"};
import continentsJson  from "../public/data/continents.json" with {type: "json"};
import { Graph } from "./Util.js";

export class GameMap {
    constructor() {
        this.territories = new Graph();
        this.continents = {};
        this.armies = {};

        this.loadMapData();
        this.initializeArmies();
        this.territoriesBycontinents = null;
    }

    loadMapData() {
        const territoriesData = territoriesJson
        var territoryNames = Object.keys(territoriesData);
        const insertedEdges = new Set();
        for (const name of territoryNames){
            this.territories.addVertex(name)
            for (const bordering_country of territoriesData[name].borders) {
                const edgeKey = [name, bordering_country].sort().join('-');
                if (!insertedEdges.has(edgeKey)) {
                    this.territories.addEdge(name, bordering_country);
                    insertedEdges.add(edgeKey);
                }
            }
        }
        this.continents = continentsJson
    }

    initializeArmies() {
        for (const territory in territoriesJson) {
            this.armies[territory] = 1;
        }
    }

    getArmies(territory) {
        return this.armies[territory] || 0;
    }

    setArmies(territory, count) {
        this.armies[territory] = count;
    }

    addArmy(territory, amount = 1) {
        this.armies[territory] = (this.armies[territory] || 0) + amount;
    }

    removeArmy(territory, amount = 1) {
        if (amount <= 0) {
            throw new Error("Amount to remove must be a positive number.");
        }
        const currentArmies = this.armies[territory];
        const resultingArmies = currentArmies - amount;

        if (resultingArmies < 0) {
            console.error(`Error: Attempted to remove ${amount} from ${territory} (has ${currentArmies})`);
            this.armies[territory] = 0;
            return;
        }
        this.armies[territory] = resultingArmies;
    }

    getTerritoriesByContinent() {
        if (this.territoriesBycontinents) {
            return this.territoriesBycontinents;
        }

        const continents = {};
        for (const territoryName in territoriesJson) {
            const continentName = territoriesJson[territoryName].continent;
            if (!continents[continentName]) {
                continents[continentName] = [];
            }
            continents[continentName].push(territoryName);
        }
        this.territoriesBycontinents = continents;
        return this.territoriesBycontinents;
    }

    distributeTerritories(players) {
        var territoriesKeys = Object.keys(territoriesJson);
        territoriesKeys = territoriesKeys.sort(() => Math.random() - 0.5);

        var territoriesPerPlayer = Math.floor(territoriesKeys.length / players.length);
        var currentIndex = 0;

        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < territoriesPerPlayer; j++) {
                players[i].addTerritory(territoriesKeys[currentIndex]);
                currentIndex++;
            }
        }

        while (currentIndex < territoriesKeys.length) {
            var playerIndex = currentIndex % players.length;
            players[playerIndex].addTerritory(territoriesKeys[currentIndex]);
            currentIndex++;
        }
    }

    getContinentBonusForPlayer(player) {
        // Logic handled in GameManager
    }

    // Proxy method to allow mocking in tests without exposing 'this.territories' property
    getNeighbors(territory) {
        if (this.territories) {
            return this.territories.getNeighbors(territory);
        }
        return [];
    }

    areAdjacent(territory1, territory2) {
        const neighbors = this.getNeighbors(territory1);
        return neighbors.some(neighbor => neighbor.node === territory2);
    }
}