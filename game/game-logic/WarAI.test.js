import { WarAI } from './WarAI.js';
import { GameManager } from './GameManager.js';
import { Player } from './Player.js';

console.log('=== Teste da WarAI ===\n');

// Criar jogadores
const player1 = new Player(0, 'azul');
const player2 = new Player(1, 'vermelho');
const player3 = new Player(2, 'verde'); // Este será o bot

// Criar GameManager
const gameManager = new GameManager([player1, player2, player3]);

// Criar IA para o player 3
const aiObjective = {
    type: 'CONQUER_CONTINENTS',
    targets: ['AS', 'AF'] // Ásia e África
};

const warAI = new WarAI(2, aiObjective);

console.log('WarAI criada para jogador', warAI.myId);
console.log('Objetivo:', warAI.objective);
console.log('\n--- Territórios distribuídos ---');
gameManager.players.forEach(p => {
    console.log(`Jogador ${p.id} (${p.color}): ${p.territories.length} territórios`);
    console.log(`  Primeiros 3: ${p.territories.slice(0, 3).join(', ')}`);
});

// Teste 1: Decisão de colocação
console.log('\n--- Teste 1: Decidir colocação de tropas ---');
const placementChoice = warAI.decidePlacement(gameManager);
console.log('IA escolheu colocar tropa em:', placementChoice);

if (placementChoice) {
    const player = gameManager.players.find(p => p.id === warAI.myId);
    if (player && player.territories.includes(placementChoice)) {
        console.log('✓ Escolha válida! O território pertence ao jogador da IA.');
    } else {
        console.log('✗ ERRO: Território não pertence ao jogador da IA!');
    }
}

// Teste 2: Decisão de ataque
console.log('\n--- Teste 2: Decidir ataque ---');
const attackChoice = warAI.decideAttack(gameManager);
if (attackChoice) {
    console.log('IA decidiu atacar:');
    console.log('  De:', attackChoice.from);
    console.log('  Para:', attackChoice.to);
    
    const player = gameManager.players.find(p => p.id === warAI.myId);
    const hasSource = player?.territories.includes(attackChoice.from);
    const hasTarget = player?.territories.includes(attackChoice.to);
    
    if (hasSource && !hasTarget) {
        console.log('✓ Ataque válido! Origem é da IA, alvo não é.');
    } else {
        console.log('✗ ERRO: Ataque inválido!');
    }
} else {
    console.log('IA decidiu não atacar (provavelmente por falta de tropas ou vantagem)');
}

// Teste 3: Decisão de fortificação
console.log('\n--- Teste 3: Decidir fortificação ---');
const fortificationChoice = warAI.decideFortification(gameManager);
if (fortificationChoice) {
    console.log('IA decidiu mover tropas:');
    console.log('  De:', fortificationChoice.from);
    console.log('  Para:', fortificationChoice.to);
    console.log('  Quantidade:', fortificationChoice.numTroops);
} else {
    console.log('IA decidiu não fortificar (territórios estão equilibrados)');
}

console.log('\n=== Teste concluído ===');
