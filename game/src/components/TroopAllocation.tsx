import React, { useState, useEffect, useMemo } from 'react';
import { useGameContext } from '../context/GameContext';
import './TroopAllocation.css';

interface TroopAllocationProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (allocations: Record<string, number>) => void;
}

const TroopAllocation: React.FC<TroopAllocationProps> = ({ isVisible, onClose, onConfirm }) => {
  const { getCurrentPlayer, setTerritorySelectionCallback, currentRound } = useGameContext();
  const [availableTroops, setAvailableTroops] = useState(0);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [inputQuantity, setInputQuantity] = useState<string>('');
  const [lastRoundPlayer, setLastRoundPlayer] = useState<string>('');
  const [initialTroops, setInitialTroops] = useState(0);

  const currentPlayer = getCurrentPlayer();

  const calculatedTroops = useMemo(() => {
    if (!currentPlayer) return 0;
    
    let territoryBonus = Math.max(3, Math.floor(currentPlayer.territories.length / 2));
    
    const roundBonus = currentPlayer.id % 3; 
    
    let continentBonus = 0;
    if (currentPlayer.territories.length > 10) {
      continentBonus = 2; 
    }
    
    let cardBonus = 0;
    if (currentPlayer.id === 0) { 
      cardBonus = 4; 
    }
    
    const total = territoryBonus + roundBonus + continentBonus + cardBonus;
    
    console.log('Tropas calculadas para jogador', currentPlayer.id, ':', total);
    
    // TODO: Integrar com o back-end real
    return Math.min(total, 20); // Máximo de 20 tropas para teste
  }, [currentPlayer?.id, currentPlayer?.territories.length]);

  useEffect(() => {
    if (isVisible && currentPlayer) {
      const currentRoundPlayer = `${currentRound}-${currentPlayer.id}`;
      
      if (lastRoundPlayer !== currentRoundPlayer) {
        console.log('🎯 Nova rodada/jogador detectada:', currentRoundPlayer);
        setInitialTroops(calculatedTroops);
        setAvailableTroops(calculatedTroops);
        setAllocations({});
        setSelectedTerritory('');
        setInputQuantity('');
        setLastRoundPlayer(currentRoundPlayer);
        console.log('Tropas calculadas para jogador', currentPlayer.id, 'rodada', currentRound, ':', calculatedTroops, 'tropas');
      } else {
        console.log('🔄 Mesma rodada/jogador, mantendo tropas:', availableTroops);
      }
    }
  }, [isVisible, currentPlayer?.id, currentRound, calculatedTroops, lastRoundPlayer, availableTroops]);

  useEffect(() => {
    if (isVisible && currentPlayer) {
      setTerritorySelectionCallback((territory: string) => {
        if (currentPlayer.territories.includes(territory)) {
          setSelectedTerritory(territory);
        }
      });
    } else {
      setTerritorySelectionCallback(null);
    }

    return () => {
      setTerritorySelectionCallback(null);
    };
  }, [isVisible, currentPlayer, setTerritorySelectionCallback]);

  const getRemainingTroops = useMemo(() => {
    const allocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
    return Math.max(0, initialTroops - allocated);
  }, [initialTroops, allocations]);

  const handleTerritorySelect = (territory: string) => {
    console.log('=== CLICOU EM:', territory, '===');
    setSelectedTerritory(territory);
  };

  const handleAllocate = (quantity: number) => {
    console.log('CLICOU ALOCAR:', { quantity, selectedTerritory, remaining: getRemainingTroops });
    
    if (!selectedTerritory) {
      console.log('ERRO: Nenhum território selecionado');
      return;
    }
    
    if (quantity <= 0) {
      console.log('ERRO: Quantidade inválida');
      return;
    }
    
    if (quantity > getRemainingTroops) {
      console.log('ERRO: Não há tropas suficientes');
      return;
    }

    console.log('ALOCANDO TROPAS');
    setAllocations(prev => {
      const newAllocations = {
        ...prev,
        [selectedTerritory]: (prev[selectedTerritory] || 0) + quantity
      };
      console.log('NOVAS ALOCAÇÕES:', newAllocations);
      return newAllocations;
    });
  };

  const handleInputAllocate = () => {
    const quantity = parseInt(inputQuantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      alert('Por favor, digite um número válido maior que 0');
      return;
    }

    if (quantity > getRemainingTroops) {
      alert(`Você só tem ${getRemainingTroops} tropas disponíveis`);
      return;
    }

    handleAllocate(quantity);
    setInputQuantity(''); 
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputAllocate();
    }
  };

  const handleRemoveAllocation = (territory: string) => {
    setAllocations(prev => {
      const newAllocations = { ...prev };
      delete newAllocations[territory];
      return newAllocations;
    });
  };

  const getCurrentAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + val, 0);
  }, [allocations]);



  const canConfirm = useMemo(() => {
    return getRemainingTroops === 0;
  }, [getRemainingTroops]);

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm(allocations);
      onClose();
    }
  };

  if (!isVisible) {
    return null;
  }

  if (!currentPlayer) {
    return (
      <div className="troop-allocation-overlay">
        <div className="troop-allocation-modal">
          <div className="troop-allocation-header">
            <h2>Erro</h2>
          </div>
          <div className="troop-allocation-content">
            <p>Jogador atual não encontrado. Tente novamente.</p>
            <button className="cancel-btn" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="troop-allocation-overlay">
      <div className="troop-allocation-modal">
        <div className="troop-allocation-header">
          <h2>Alocação de Tropas</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="troop-allocation-content">
          <div className="troop-info">
            <div className="troop-stats">
              <div className="stat-item">
                <span className="stat-label">Tropas Iniciais:</span>
                <span className="stat-value">{initialTroops}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tropas Alocadas:</span>
                <span className="stat-value">{getCurrentAllocated}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tropas Restantes:</span>
                <span className="stat-value remaining">{getRemainingTroops}</span>
              </div>
            </div>
          </div>

          <div className="allocation-interface">
            <div className="territory-selection">
              <h3>Seus Territórios ({currentPlayer.territories.length})</h3>
              <div className="territories-list">
                {currentPlayer.territories.length === 0 ? (
                  <div className="no-territories">
                    Nenhum território encontrado para este jogador.
                  </div>
                ) : (
                  <div>
                    {currentPlayer.territories.map((territory: string) => (
                      <button
                        key={territory}
                        className={`territory-btn ${selectedTerritory === territory ? 'selected' : ''}`}
                        onClick={() => {
                          console.log('CLICOU NO BOTÃO:', territory);
                          handleTerritorySelect(territory);
                        }}
                      >
                        {territory} ({currentPlayer.territoriesArmies[territory] || 0})
                        {allocations[territory] && ` +${allocations[territory]}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="allocation-controls">
              <div className="selected-territory-panel">
                <h4>
                  {selectedTerritory ? `Território: ${selectedTerritory}` : 'Selecione um território'}
                </h4>
                
                <div className="debug-info">
                  <p>Território selecionado: "{selectedTerritory || 'NENHUM'}"</p>
                  <p>Tropas restantes: {getRemainingTroops}</p>
                  <p>Pode alocar: {selectedTerritory && getRemainingTroops > 0 ? 'SIM' : 'NÃO'}</p>
                </div>
                
                <div className="allocation-input">
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      max={getRemainingTroops}
                      placeholder="Quantidade"
                      value={inputQuantity}
                      onChange={(e) => setInputQuantity(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={!selectedTerritory || getRemainingTroops === 0}
                      className="quantity-input"
                    />
                    <button
                      className="allocate-btn"
                      onClick={handleInputAllocate}
                      disabled={!selectedTerritory || getRemainingTroops === 0 || !inputQuantity}
                    >
                      Alocar
                    </button>
                  </div>
                  <button
                    className="allocate-all-btn"
                    onClick={() => {
                      console.log('BOTÃO TODAS CLICADO');
                      handleAllocate(getRemainingTroops);
                    }}
                    disabled={!selectedTerritory || getRemainingTroops === 0}
                  >
                    Todas ({getRemainingTroops})
                  </button>
                </div>
              </div>

              {Object.keys(allocations).length > 0 && (
                <div className="current-allocations">
                  <h4>Alocações Atuais</h4>
                  <div className="allocations-list">
                    {Object.entries(allocations).map(([territory, quantity]) => (
                      <div key={territory} className="allocation-item">
                        <span>{territory}: +{quantity}</span>
                        <button 
                          className="remove-allocation"
                          onClick={() => handleRemoveAllocation(territory)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="allocation-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="confirm-btn"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              Confirmar Alocação
            </button>
          </div>

          <div className="allocation-instructions">
            <p>• Clique em um território para selecioná-lo</p>
            <p>• Use os botões para alocar tropas no território selecionado</p>
            <p>• Você deve alocar todas as tropas disponíveis para prosseguir</p>
            <p>• Clique no mapa do jogo para também selecionar territórios</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TroopAllocation;