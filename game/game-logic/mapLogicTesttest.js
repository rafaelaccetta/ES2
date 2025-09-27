import { GameMap } from './gamemap.js';

const  gameMap = new GameMap();                     
const  players = ["azul","vermelho","verde","branco"]
gameMap.distributeTerritories(players);