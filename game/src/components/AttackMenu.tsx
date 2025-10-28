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

  useEffect(() => {
    if (!isVisible) {
      setSelectedSource('');
      setSelectedTarget('');
      setAttackQuantity('1');
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
    const possible = Math.max(0, armies - 1);
    return Math.min(3, possible);
  }, [selectedSource, currentPlayer]);

  useEffect(() => {
    const currentQty = parseInt(attackQuantity) || 1;
    if (maxAttackable === 0) {
      setAttackQuantity('1'); 
    } else if (currentQty > maxAttackable) {
      setAttackQuantity(String(maxAttackable));
    }
  }, [maxAttackable, attackQuantity]);

  const getTerritoryTroops = (territory: string): number => {
    if (!gameManager) return 0;
    
    for (const player of gameManager.players) {
      if (player.territories.includes(territory)) {
        return player.territoriesArmies?.[territory] ?? 0;
      }
    }
    return 0;
  };

  const handleAttack = () => {
    if (!selectedSource || !selectedTarget) return;
    const qty = parseInt(attackQuantity) || 0;
    if (qty <= 0 || qty > maxAttackable) return;
    EventBus.emit('attack-request', { source: selectedSource, target: selectedTarget, troops: qty });
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
                          className={`territory-btn ${selectedSource === territory ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedSource(territory);
                            setSelectedTarget('');
                            setAttackQuantity('1');
                          }}
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
                      <div className="no-neighbors" >Nenhum vizinho atacável</div>
                    ) : (
                      neighborsForSource.map((n: string) => (
                        <button
                          key={n}
                          className={`territory-btn ${selectedTarget === n ? 'selected' : ''}`}
                          onClick={() => setSelectedTarget(n)}
                        >
                          {n} ({getTerritoryTroops(n)})
                        </button>
                      ))
                    )
                  ) : (
                    <div className="no-neighbors" style={{ marginBottom: '10px' }}>Selecione um território de origem</div>
                  )}
                </div>

                <div className="selected-territory-panel">
                  <h4>{selectedSource ? `Origem: ${selectedSource}` : 'Selecione origem'}</h4>
                  <div className="troop-selection">
                    <h5>Tropas para atacar:</h5>
                    <div className="troop-buttons">
                      <button
                        className={`troop-btn ${attackQuantity === '1' ? 'selected' : ''}`}
                        onClick={() => setAttackQuantity('1')}
                        disabled={maxAttackable < 1}
                        title={maxAttackable < 1 ? 'Não há tropas suficientes' : 'Atacar com 1 tropa'}
                      >
                        1
                      </button>
                      <button
                        className={`troop-btn ${attackQuantity === '2' ? 'selected' : ''}`}
                        onClick={() => setAttackQuantity('2')}
                        disabled={maxAttackable < 2}
                        title={maxAttackable < 2 ? 'Não há tropas suficientes' : 'Atacar com 2 tropas'}
                      >
                        2
                      </button>
                      <button
                        className={`troop-btn ${attackQuantity === '3' ? 'selected' : ''}`}
                        onClick={() => setAttackQuantity('3')}
                        disabled={maxAttackable < 3}
                        title={maxAttackable < 3 ? 'Não há tropas suficientes' : 'Atacar com 3 tropas'}
                      >
                        3
                      </button>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="allocation-actions">
            <button className="cancel-btn" onClick={onClose}>Cancelar</button>
            <button className="confirm-btn" onClick={handleAttack} disabled={!selectedSource || !selectedTarget || !(parseInt(attackQuantity) > 0 && parseInt(attackQuantity) <= maxAttackable)}>
              Atacar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackMenu;
