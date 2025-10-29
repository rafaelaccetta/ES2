import React from 'react';
import './AttackResult.css';

interface BattleResult {
  source: string;
  target: string;
  troopsUsed: number;
  attackerDice: number[];
  defenderDice: number[];
  attackerLoss: number;
  defenderLoss: number;
  conquered: boolean;
  attackerColor?: string;
  defenderColor?: string;
}

interface AttackResultProps {
  isVisible: boolean;
  result: BattleResult | null;
  onClose: () => void;
  onSendTroops?: () => void;
}

const AttackResult: React.FC<AttackResultProps> = ({ isVisible, result, onClose, onSendTroops }) => {
  if (!isVisible || !result) {
    return null;
  }

  const getPlayerColor = (color: string) => {
    const colorMap: Record<string, string> = {
      azul: '#2563eb',      
      vermelho: '#dc2626',  
      verde: '#16a34a',     
      branco: '#b7c0cd'     
    };
    return colorMap[color] || '#d2d9e3ff';
  };

  const renderDice = (dice: number[], isAttacker: boolean) => {
    const playerColor = isAttacker ? result.attackerColor : result.defenderColor;
    const colorStyle = playerColor ? { backgroundColor: getPlayerColor(playerColor) } : {};
    
    return (
      <div className={`dice-container ${isAttacker ? 'attacker-dice' : 'defender-dice'}`}>
        {dice.map((value, index) => (
          <div 
            key={index} 
            className="dice"
            style={colorStyle}
          >
            {value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="attack-result-overlay">
      <div className="attack-result-menu">
        <div className="attack-result-header">
          <h3>{result.conquered ? 'TERRITÓRIO CONQUISTADO!' : 'ATAQUE DEFENDIDO!'}</h3>
        </div>
        
        <div className="attack-result-content">
          <div className="battle-info">
            <h4>{result.source} ⚔️ {result.target}</h4>
            <p>Tropas usadas no ataque: {result.troopsUsed}</p>
          </div>

          <div className="dice-section">
            <div className="dice-group">
              <h5>Atacante</h5>
              {renderDice(result.attackerDice, true)}
              <p className="loss-text">Perdas: {result.attackerLoss}</p>
            </div>

            <div className="dice-group">
              <h5>Defensor</h5>
              {renderDice(result.defenderDice, false)}
              <p className="loss-text">Perdas: {result.defenderLoss}</p>
            </div>
          </div>

          <div className={`result-message ${result.conquered ? 'victory' : 'defeat'}`}>
            {result.conquered ? (
              <div>
                <h4>VITÓRIA!</h4>
                <p>{result.source} conquistou {result.target}</p>
              </div>
            ) : (
              <div>
                <h4>DERROTA</h4>
                <p>{result.target} resistiu ao ataque</p>
              </div>
            )}
          </div>
        </div>

        <div className="attack-result-footer">
          {result.conquered && onSendTroops ? (
            <button className="send-troops-btn primary" onClick={onSendTroops}>
              Enviar Tropas
            </button>
          ) : (
            <button className="close-result-btn" onClick={onClose}>
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttackResult;