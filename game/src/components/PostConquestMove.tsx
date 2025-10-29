import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { useGameContext } from '../context/GameContext';
import './TroopAllocation.css';
import './AttackMenu.css';

interface Payload {
  source: string;
  target: string;
  troopsRequested: number;
  attackerLoss: number;
  defenderLoss: number;
  survivors: number;
  armiesBefore: number;
  sourceAfterLosses: number;
  maxCanMove: number;
}

const PostConquestMove: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [moveCount, setMoveCount] = useState('1');

  useEffect(() => {
    const handler = (data: any) => {
      const p = data as Payload;
      setPayload(p);
      const defaultMove = Math.min(1, Math.max(1, p.maxCanMove));
      setMoveCount(String(defaultMove));
      setVisible(true);
    };

    EventBus.on('post-conquest', handler);
    return () => {
      EventBus.removeListener('post-conquest', handler);
    };
  }, []);

  useEffect(() => {
    if (!payload) return;
    
    const currentMove = parseInt(moveCount) || 1;
    const maxPossible = Math.min(payload.troopsRequested, payload.maxCanMove);
    
    if (currentMove > maxPossible && maxPossible > 0) {
      setMoveCount(String(maxPossible));
    } else if (maxPossible === 0) {
      setMoveCount('1'); 
    }
  }, [payload, moveCount]);

  if (!visible || !payload) return null;

  const { source, target, survivors, sourceAfterLosses, maxCanMove } = payload;

  const { applyPostConquestMove } = useGameContext();

  const handleConfirm = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const moved = Math.max(0, Math.min(parseInt(moveCount) || 0, maxCanMove));
    applyPostConquestMove(source, target, moved);
    setVisible(false);
    setPayload(null);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const fallback = maxCanMove > 0 ? 1 : 0;
    applyPostConquestMove(source, target, fallback);
    setVisible(false);
    setPayload(null);
  };

  return (
    <div className="troop-allocation-overlay" onClick={handleCancel}>
      <div className="troop-allocation-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="troop-allocation-header">
          <h3>Território Conquistado!</h3>
          <button className="close-btn" onClick={handleCancel} aria-label="Fechar">&times;</button>
        </div>
        <div className="troop-allocation-content">
          <div className="selected-territory-panel">
            <p>Quantas tropas mover de <strong>{source}</strong> para <strong>{target}</strong>?</p>
            <div>Exércitos no território atacante: <strong>{sourceAfterLosses}</strong></div>
          </div>

          <div className="troop-selection">
            <h5>Quantas tropas mover:</h5>
            <div className="troop-buttons">
              <button
                className={`troop-btn ${moveCount === '1' ? 'selected' : ''}`}
                onClick={() => setMoveCount('1')}
                disabled={payload.troopsRequested < 1 || maxCanMove < 1}
                title={payload.troopsRequested < 1 || maxCanMove < 1 ? 'Não é possível mover 1 tropa' : 'Mover 1 tropa'}
              >
                1
              </button>
              <button
                className={`troop-btn ${moveCount === '2' ? 'selected' : ''}`}
                onClick={() => setMoveCount('2')}
                disabled={payload.troopsRequested < 2 || maxCanMove < 2}
                title={payload.troopsRequested < 2 || maxCanMove < 2 ? 'Não é possível mover 2 tropas' : 'Mover 2 tropas'}
              >
                2
              </button>
              <button
                className={`troop-btn ${moveCount === '3' ? 'selected' : ''}`}
                onClick={() => setMoveCount('3')}
                disabled={payload.troopsRequested < 3 || maxCanMove < 3}
                title={payload.troopsRequested < 3 || maxCanMove < 3 ? 'Não é possível mover 3 tropas' : 'Mover 3 tropas'}
              >
                3
              </button>
            </div>
          </div>

          <div className="troop-allocation-actions">
            <button className="cancel-btn" onClick={handleCancel}>Cancelar</button>
            <button className="confirm-btn" onClick={handleConfirm}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostConquestMove;
