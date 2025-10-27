

function rollND6(n) {
    const rolls = [];
    for (let i = 0; i < n; i++) {
        rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    rolls.sort((a, b) => b - a);
    return rolls;
}

export function resolveAttack(troopsCommitted, defenderArmies) {
    
    const attackerDice = troopsCommitted >= 3 ? 3 : Math.max(0, troopsCommitted);
    
    const defenderDice = Math.min(3, Math.max(0, defenderArmies));

    const aDice = attackerDice > 0 ? rollND6(attackerDice) : [];
    const dDice = defenderDice > 0 ? rollND6(defenderDice) : [];

    let attackerLoss = 0;
    let defenderLoss = 0;

    const comparisons = Math.min(aDice.length, dDice.length);
    for (let i = 0; i < comparisons; i++) {
        if (aDice[i] > dDice[i]) {
            defenderLoss++;
        } else {
            attackerLoss++;
        }
    }

    return {
        aDice,
        dDice,
        attackerLoss,
        defenderLoss,
    };
}

export default resolveAttack;
