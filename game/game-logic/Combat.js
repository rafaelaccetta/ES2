/**
 * Combat resolution helper for WAR (Risk-like) rules.
 * Exports a single function `resolveAttack` which accepts the number of attacking
 * troops committed and the number of defending armies on the target territory.
 *
 * Rules implemented:
 * - Attacker may roll up to 3 dice, limited by troops committed (max dice = min(3, troopsCommitted)).
 * - Defender may roll up to 2 dice, limited by defending armies on territory (max dice = min(2, defenderArmies)).
 * - Dice are 6-sided, rolled and sorted descending. Compare highest vs highest, next vs next.
 * - For each comparison, higher die wins; defender wins ties.
 * - Returns the dice arrays and counts of losses for attacker and defender.
 */

function rollND6(n) {
    const rolls = [];
    for (let i = 0; i < n; i++) {
        rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    // sort descending (highest first)
    rolls.sort((a, b) => b - a);
    return rolls;
}

export function resolveAttack(troopsCommitted, defenderArmies) {
    const attackerDice = Math.min(3, Math.max(0, troopsCommitted));
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
            // defender wins ties
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

// Default export for convenience
export default resolveAttack;
