import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { useGameContext } from '../context/GameContext';
import './TroopAllocation.css';
import './AttackResult.css';

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
          <h3>🏆 TERRITÓRIO CONQUISTADO!</h3>
          <button className="close-btn" onClick={handleCancel} aria-label="Fechar">&times;</button>
        </div>
        <div className="troop-allocation-content">
          
          <div className="selected-territory-panel">
            <h3>Mover Tropas para o Novo Território</h3>
            <p>Quantas tropas mover de <strong>{source}</strong> para <strong>{target}</strong>?</p>
            <div>Exércitos no território vencedor: <strong>{survivors} tropas</strong></div>
            <div>Exércitos no território conquistado: <strong>{sourceAfterLosses} tropas</strong></div>
            <div>Quantidade máxima de tropas permitida para mover: <strong>{maxCanMove} tropas</strong></div>
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
