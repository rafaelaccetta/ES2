import React, { useEffect, useMemo, useState } from 'react';
import './AttackMenu.css';
import { useGameContext } from '../context/GameContext';
import { EventBus } from '../game/EventBus';

interface AttackMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

const AttackMenu: React.FC<AttackMenuProps> = ({ isVisible, onClose }) => {
  const { getCurrentPlayer, gameManager } = useGameContext();
  const currentPlayer = getCurrentPlayer();

  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [attackQuantity, setAttackQuantity] = useState<string>('1');
  const [validatedAttack, setValidatedAttack] = useState<{source: string, target: string, troops: number} | null>(null);
  const [battleResults, setBattleResults] = useState<Array<{
    source: string,
    target: string,
    troopsUsed: number,
    attackerDice: number[],
    defenderDice: number[],
    attackerLoss: number,
    defenderLoss: number,
    conquered: boolean
  }>>([]);

  useEffect(() => {
    if (!isVisible) {
      setSelectedSource('');
      setSelectedTarget('');
      setAttackQuantity('1');
      setValidatedAttack(null);
      setBattleResults([]);
    }
  }, [isVisible]);

  const playerTerritories = useMemo(() => {
    return currentPlayer?.territories || [];
  }, [currentPlayer]);

  const neighborsForSource = useMemo(() => {
    if (!selectedSource || !gameManager) return [];
    try {
      const neighbors = gameManager.gameMap.territories.getNeighbors(selectedSource) || [];
      const enemyNeighbors = neighbors
        .map((n: any) => n.node)
        .filter((name: string) => {
          const owner = (() => {
            const p = gameManager.players.find((pl: any) => pl.territories.includes(name));
            return p ? p.id : null;
          })();
          if (owner === null) return true; 
          return owner !== currentPlayer?.id;
        });
      return enemyNeighbors;
    } catch (e) {
      console.warn('Erro ao obter vizinhos do mapa', e);
      return [];
    }
  }, [selectedSource, gameManager, currentPlayer]);

  const maxAttackable = useMemo(() => {
    if (!selectedSource || !currentPlayer) return 0;
    const armies = currentPlayer.territoriesArmies?.[selectedSource] ?? 0;
    return Math.max(0, armies - 1);
  }, [selectedSource, currentPlayer]);

  const handleValidate = () => {
    if (!selectedSource || !selectedTarget) {
      alert('Selecione origem e destino do ataque');
      return;
    }
    
    const qty = parseInt(attackQuantity) || 0;
    if (qty <= 0 || qty > maxAttackable) {
      alert(`Quantidade inválida. Máximo: ${maxAttackable}`);
      return;
    }
    
    console.log('✅ Ataque validado:', { source: selectedSource, target: selectedTarget, troops: qty });
    setValidatedAttack({ source: selectedSource, target: selectedTarget, troops: qty });
  };

  const handleExecuteAttack = () => {
    if (!validatedAttack) {
      console.log('❌ Não há ataque validado!');
      return;
    }
    console.log('🚀 Executando ataque:', validatedAttack);
    console.log('📡 AttackMenu: Emitindo attack-request para EventBus');
    setBattleResults([]);
    EventBus.emit('attack-request', validatedAttack);
    console.log('📡 AttackMenu: Evento attack-request emitido');
    onClose();

  };



  if (!isVisible) return null;

  if (!currentPlayer) {
    return (
      <div className="attack-overlay">
        <div className="attack-modal">
          <div className="attack-header">
            <h2>Atacar</h2>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          <div className="attack-content">
            <p>Jogador atual não encontrado.</p>
            <button className="cancel-btn" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="troop-allocation-overlay">
      <div className="troop-allocation-modal">
        <div className="troop-allocation-header">
          <h2>Atacar</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="troop-allocation-content">
          <div className="troop-info">
            <div className="allocation-interface">
              <div className="territory-selection">
                <h3>Seus Territórios ({playerTerritories.length})</h3>
                <div className="territories-list">
                  {playerTerritories.length === 0 ? (
                    <div className="no-territories">Nenhum território encontrado para este jogador.</div>
                  ) : (
                    <div>
                      {playerTerritories.map((territory: string) => (
                        <button
                          key={territory}
                          className={`territory-btn ${selectedSource === territory ? 'selected' : ''} ${validatedAttack ? 'disabled' : ''}`}
                          onClick={() => {
                            if (!validatedAttack) {
                              setSelectedSource(territory);
                              setSelectedTarget('');
                              setAttackQuantity('1');
                            }
                          }}
                          disabled={!!validatedAttack}
                        >
                          {territory} ({currentPlayer.territoriesArmies?.[territory] || 0})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="allocation-controls">
                <h4>Vizinhos possíveis</h4>
                <div className="neighbors-list">
                  {selectedSource ? (
                    neighborsForSource.length === 0 ? (
                      <div className="no-neighbors">Nenhum vizinho atacável</div>
                    ) : (
                      neighborsForSource.map((n: string) => {
                        const defenderTroops = (() => {
                          const defender = gameManager?.players?.find((pl: any) => pl.territories.includes(n));
                          return defender?.territoriesArmies?.[n] || 0;
                        })();
                        
                        return (
                          <button
                            key={n}
                            className={`territory-btn ${selectedTarget === n ? 'selected' : ''} ${validatedAttack ? 'disabled' : ''}`}
                            onClick={() => {
                              if (!validatedAttack) {
                                setSelectedTarget(n);
                              }
                            }}
                            disabled={!!validatedAttack}
                          >
                            {n} ({defenderTroops})
                          </button>
                        );
                      })
                    )
                  ) : (
                    <div className="no-neighbors">Selecione um território de origem</div>
                  )}
                </div>

                <div className="selected-territory-panel">
                  <h4>{selectedSource ? `Origem: ${selectedSource}` : 'Selecione origem'}</h4>
                  
                  <div className="attack-info">
                    <h5>Escolha com quantas tropas irá atacar:</h5>
                    <p className="dice-info">
                      {parseInt(attackQuantity) > 0 ? (() => {
                        const troops = parseInt(attackQuantity);
                        const dice = troops >= 3 ? 3 : troops;
                        return `${troops} ${troops === 1 ? 'tropa' : 'tropas'} → ${dice} ${dice === 1 ? 'dado' : 'dados'}`;
                      })() : 'Selecione quantidade'}
                    </p>
                  </div>

                  <div className="allocation-input">
                    <div className="input-group">
                      <input
                        type="number"
                        min={1}
                        max={maxAttackable}
                        placeholder="Tropas"
                        value={attackQuantity}
                        onChange={(e) => {
                          if (!validatedAttack) {
                            setAttackQuantity(e.target.value);
                          }
                        }}
                        className="quantity-input"
                        disabled={!selectedSource || maxAttackable <= 0 || !!validatedAttack}
                      />
                      <button
                        className="allocate-btn"
                        onClick={handleValidate}
                        disabled={!selectedSource || !selectedTarget || !attackQuantity || parseInt(attackQuantity) <= 0 || !!validatedAttack}
                      >
                        Validar
                      </button>
                    </div>
                    <button
                      className="allocate-all-btn"
                      onClick={() => {
                        if (!validatedAttack) {
                          setAttackQuantity(String(maxAttackable));
                        }
                      }}
                      disabled={!selectedSource || maxAttackable <= 0 || !!validatedAttack}
                    >
                      Máximo de tropas ({maxAttackable})
                    </button>
                  </div>
                </div>

                {selectedTarget && (
                  <div className="defense-info">
                    <h5>🛡️ Informações da Defesa:</h5>
                    <p>• A defesa usa TODAS as tropas disponíveis</p>
                    <p>• {(() => {
                      const defenderTroops = (() => {
                        const defender = gameManager?.players?.find((pl: any) => pl.territories.includes(selectedTarget));
                        return defender?.territoriesArmies?.[selectedTarget] || 0;
                      })();
                      const defenderDice = Math.min(3, defenderTroops);
                      return `${selectedTarget}: ${defenderTroops} ${defenderTroops === 1 ? 'tropa' : 'tropas'} = ${defenderDice} ${defenderDice === 1 ? 'dado' : 'dados'}`;
                    })()}</p>
                    <p>• Em caso de empate nos dados, defesa ganha</p>
                  </div>
                )}



                {validatedAttack && (
                  <div className="current-allocations">
                    <h4>Ataque Validado</h4>
                    <div className="allocation-item">
                      <span>{validatedAttack.source} → {validatedAttack.target}</span>
                      <button 
                        className="remove-allocation"
                        onClick={() => {
                          setValidatedAttack(null);
                          setSelectedSource('');
                          setSelectedTarget('');
                          setAttackQuantity('1');
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {battleResults.length > 0 && (
                  <div className="battle-results">
                    <h4>Resultados dos Combates</h4>
                    <div className="results-list">
                      {battleResults.map((result, index) => (
                        <div key={index} className="battle-item">
                          <div className="battle-header">
                            <h5>{result.source} → {result.target}</h5>
                            <span className={`conquest-status ${result.conquered ? 'conquered' : 'defended'}`}>
                              {result.conquered ? '🏆 CONQUISTADO' : '🛡️ DEFENDIDO'}
                            </span>
                          </div>
                          
                          <div className="dice-results">
                            <div className="attacker-dice">
                              <span className="dice-label">Ataque:</span>
                              <div className="dice-values">
                                {result.attackerDice.map((die, i) => (
                                  <span key={i} className="die-value attacker-die">{die}</span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="defender-dice">
                              <span className="dice-label">Defesa:</span>
                              <div className="dice-values">
                                {result.defenderDice.map((die, i) => (
                                  <span key={i} className="die-value defender-die">{die}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="battle-losses">
                            <span className="attacker-loss">Atacante perdeu: {result.attackerLoss} tropas</span>
                            <span className="defender-loss">Defensor perdeu: {result.defenderLoss} tropas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="allocation-actions">
            <button className="cancel-btn" onClick={onClose}>Cancelar</button>
            <button 
              className="confirm-btn" 
              onClick={() => {
                console.log('🎯 Botão Executar Ataque clicado! validatedAttack:', validatedAttack);
                handleExecuteAttack();
              }} 
              disabled={!validatedAttack}
            >
              Executar Ataque
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackMenu;
