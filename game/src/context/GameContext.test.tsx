// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGameContext } from './GameContext';
import { EventBus } from '../game/EventBus';

vi.mock('../game/EventBus', () => ({
    EventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn()
    }
}));

global.fetch = vi.fn();

describe('GameContext Integration', () => {

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <GameProvider>{children}</GameProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            json: async () => ({ objectives: [] })
        });
    });

    it('should initialize and start the game correctly', async () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        await act(async () => {
            result.current.startGame(2);
        });

        expect(result.current.gameStarted).toBe(true);
        expect(result.current.players.length).toBe(4);
        expect(result.current.gameManager).not.toBeNull();
    });

    it('should bridge the reserve pool correctly', async () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        await act(async () => {
            result.current.startGame(2);
        });

        const p0 = result.current.getCurrentPlayer();
        expect(p0).not.toBeNull();

        const lastCall = (EventBus.emit as any).mock.calls.find((call: any[]) => call[0] === 'players-updated');
        const payload = lastCall[1];
        const player0Data = payload.players[0];

        expect(player0Data.pendingReinforcements).toBeGreaterThan(0);
        expect(player0Data.pendingReinforcements).toBe(p0!.armies);
    });

    it('should handle territory reinforcement via the new helper', async () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        await act(async () => {
            result.current.startGame(2);
        });

        const player = result.current.getCurrentPlayer();
        // Fallback: If player 0 is AI (unlikely with id=0 but possible with shuffle), ensure we get a human or handle it
        if (!player) return;

        const territory = player.territories[0];
        const initialReserves = player.armies;
        const initialOnBoard = result.current.gameManager!.getTerritoryArmies(territory);

        act(() => {
            result.current.placeReinforcement(territory);
        });

        expect(player.armies).toBe(initialReserves - 1);
        expect(result.current.gameManager!.getTerritoryArmies(territory)).toBe(initialOnBoard + 1);
    });

    it('should advance phases correctly (Handling Round 0 Logic)', async () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        await act(async () => {
            // Start with 4 human players to avoid AI auto-playing and messing up our tracking
            result.current.startGame(4);
        });

        // --- ROUND 0: Everyone just reinforces then passes turn ---
        // Player 0
        let p = result.current.getCurrentPlayer();
        p!.removeArmies(p!.armies); // Drain armies to allow passing
        act(() => result.current.nextPhase());

        // Should NOT go to ATTACK in Round 0, should go to Player 1 REINFORCE
        expect(result.current.currentPhase).toBe("REFORÇAR");
        expect(result.current.currentPlayerIndex).not.toBe(p!.id);

        // Fast forward through rest of Round 0
        for (let i = 0; i < 3; i++) {
            p = result.current.getCurrentPlayer();
            p!.removeArmies(p!.armies);
            act(() => result.current.nextPhase());
        }

        // --- ROUND 1: Now we can attack ---
        // We are back to Player 0 (or whoever is first index)
        p = result.current.getCurrentPlayer();
        p!.removeArmies(p!.armies); // Drain reinforcement

        // Pass Reinforce -> Attack
        act(() => result.current.nextPhase());

        expect(result.current.currentPhase).toBe("ATACAR");

        // Pass Attack -> Fortify
        act(() => result.current.nextPhase());
        expect(result.current.currentPhase).toBe("FORTIFICAR");
    });
});