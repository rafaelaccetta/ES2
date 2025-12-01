import React, { useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';
import './GameLog.css';

const GameLog: React.FC = () => {
    const { logs } = useGameContext();
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [logs]);

    if (!logs || logs.length === 0) return null;

    return (
        <div className="game-log-container">
            <div className="game-log-header">
                Registro de Batalha
            </div>
            <div className="game-log-list" ref={listRef}>
                {logs.map((log, index) => (
                    <div key={`${log.timestamp}-${index}`} className="log-entry">
                        <span className="log-entry-meta">
                            [R{log.round + 1} - {log.phase.substring(0,3)}]
                        </span>
                        <span className="log-entry-content">
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GameLog;