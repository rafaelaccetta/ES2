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
    }
  }, [isVisible]);

  const playerTerritories = useMemo(() => {
    return currentPlayer?.territories || [];
  }, [currentPlayer]);

  const neighborsForSource = useMemo(() => {
    if (!selectedSource || !gameManager) return [];
    // gameManager.gameMap.territories is a Graph with getNeighbors
    try {
      const neighbors = gameManager.gameMap.territories.getNeighbors(selectedSource) || [];
      // neighbors are objects like { node: 'territoryName' }
      // Filter only enemy-owned neighbors
      const enemyNeighbors = neighbors
        .map((n: any) => n.node)
        .filter((name: string) => {
          // check owner
          const owner = (() => {
            // gameManager.players contains Player instances
            const p = gameManager.players.find((pl: any) => pl.territories.includes(name));
            return p ? p.id : null;
          })();
          // owner id not equal to current player's id
          if (owner === null) return true; // treat as attackable if no owner (shouldn't happen)
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
    // attacker must leave at least 1 army behind
    const possible = Math.max(0, armies - 1);
    return Math.min(3, possible);
  }, [selectedSource, currentPlayer]);

  const handleAttack = () => {
    if (!selectedSource || !selectedTarget) return;
    const qty = parseInt(attackQuantity) || 0;
    if (qty <= 0 || qty > maxAttackable) return;
    // Emit event via EventBus so GameManager / logic can handle it
    EventBus.emit('attack-request', { source: selectedSource, target: selectedTarget, troops: qty });
    // Optionally close menu or keep open depending on game flow
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
                      <div className="no-neighbors">Nenhum vizinho atacável</div>
                    ) : (
                      neighborsForSource.map((n: string) => (
                        <button
                          key={n}
                          className={`territory-btn ${selectedTarget === n ? 'selected' : ''}`}
                          onClick={() => setSelectedTarget(n)}
                        >
                          {n}
                        </button>
                      ))
                    )
                  ) : (
                    <div className="no-neighbors">Selecione um território de origem</div>
                  )}
                </div>

                <div className="selected-territory-panel">
                  <h4>{selectedSource ? `Origem: ${selectedSource}` : 'Selecione origem'}</h4>
                  <p className="current-troops">Tropas no território: {selectedSource ? (currentPlayer.territoriesArmies?.[selectedSource] ?? 0) : '-'}</p>
                  <div className="allocation-input">
                    <div className="input-group">
                      <input
                        type="number"
                        min={1}
                        max={maxAttackable}
                        placeholder="Quantidade"
                        value={attackQuantity}
                        onChange={(e) => setAttackQuantity(e.target.value)}
                        className="quantity-input"
                        disabled={!selectedSource || maxAttackable <= 0}
                      />
                      <button
                        className="allocate-btn"
                        onClick={() => setAttackQuantity(String(Math.max(1, Math.min(maxAttackable, parseInt(attackQuantity || '0') || 1))))}
                        disabled={!selectedSource || maxAttackable <= 0}
                      >
                        Aplicar
                      </button>
                    </div>
                    <button
                      className="allocate-all-btn"
                      onClick={() => setAttackQuantity(String(maxAttackable))}
                      disabled={!selectedSource || maxAttackable <= 0}
                    >
                      Máx ({maxAttackable})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="allocation-actions">
            <button className="cancel-btn" onClick={onClose}>Cancelar</button>
            <button className="confirm-btn" onClick={handleAttack} disabled={!selectedSource || !selectedTarget || !(parseInt(attackQuantity) > 0 && parseInt(attackQuantity) <= maxAttackable)}>
              Atacar ({attackQuantity})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackMenu;
