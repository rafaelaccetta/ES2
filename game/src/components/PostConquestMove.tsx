import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { useGameContext } from '../context/GameContext';
import './TroopAllocation.css';

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
  const [moveCount, setMoveCount] = useState(1);

  useEffect(() => {
    const handler = (data: any) => {
      const p = data as Payload;
      setPayload(p);
      // default move: survivors or 1, bounded by maxCanMove
      const defaultMove = Math.min(Math.max(1, p.survivors), Math.max(1, p.maxCanMove));
      setMoveCount(Math.min(defaultMove, p.maxCanMove));
      setVisible(true);
    };

    EventBus.on('post-conquest', handler);
    return () => {
      EventBus.removeListener('post-conquest', handler);
    };
  }, []);

  if (!visible || !payload) return null;

  const { source, target, survivors, sourceAfterLosses, maxCanMove } = payload;

  const { applyPostConquestMove } = useGameContext();

  const handleConfirm = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const moved = Math.max(0, Math.min(Number(moveCount), maxCanMove));
    // Use GameContext method directly so changes and players-updated emission happen the same way as TroopAllocation
    applyPostConquestMove(source, target, moved);
    setVisible(false);
    setPayload(null);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    // fallback: move 1 if possible, else 0
    const fallback = maxCanMove > 0 ? 1 : 0;
    applyPostConquestMove(source, target, fallback);
    setVisible(false);
    setPayload(null);
  };

  return (
    <div className="troop-allocation-overlay" onClick={handleCancel}>
      <div className="troop-allocation-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="troop-allocation-header">
          <h3>Território Conquistado</h3>
          <button className="close-btn" onClick={handleCancel} aria-label="Fechar">&times;</button>
        </div>
        <div className="troop-allocation-content">
          <div className="selected-territory-panel">
            <p>Quantas tropas mover de <strong>{source}</strong> para <strong>{target}</strong>?</p>
            <div>Sobreviventes do ataque: <strong>{survivors}</strong></div>
            <div>Exércitos no território após perdas: <strong>{sourceAfterLosses}</strong></div>
            <div>Máximo possível de mover (deixar 1 atrás): <strong>{maxCanMove}</strong></div>
          </div>

          <div className="troop-allocation-input">
            <input
              type="number"
              min={0}
              max={maxCanMove}
              value={moveCount}
              onChange={(e) => setMoveCount(Number(e.target.value))}
              className="quantity-input"
            />
            <button className="allocate-btn" onClick={() => setMoveCount(maxCanMove)}>Máx</button>
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
