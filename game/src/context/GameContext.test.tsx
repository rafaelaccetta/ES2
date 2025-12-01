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
            // Start with 4 humans to prevent AI auto-play from draining reserves immediately
            // This ensures we have a predictable state to test the bridge
            result.current.startGame(4);
        });

        const currentPlayer = result.current.getCurrentPlayer();
        expect(currentPlayer).not.toBeNull();

        const lastCall = (EventBus.emit as any).mock.calls.find((call: any[]) => call[0] === 'players-updated');
        const payload = lastCall[1];

        // Find data for the current player
        const playerData = payload.players.find((p: any) => p.id === currentPlayer?.id);

        expect(playerData.pendingReinforcements).toBeDefined();
        // Since we disabled AI, reserves should be intact (5 for start)
        expect(playerData.pendingReinforcements).toBe(5);
        expect(playerData.pendingReinforcements).toBe(currentPlayer!.armies);
    });

    it('should handle territory reinforcement via the new helper', async () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        await act(async () => {
            result.current.startGame(4); // 4 Humans
        });

        const player = result.current.getCurrentPlayer();
        if (!player) throw new Error("No player found");

        const territory = player.territories[0];
        const initialReserves = player.armies;
        const initialOnBoard = result.current.gameManager!.getTerritoryArmies(territory);

        act(() => {
            result.current.placeReinforcement(territory);
        });

        // Re-fetch player to see updated state
        const updatedPlayer = result.current.getCurrentPlayer();

        expect(updatedPlayer!.armies).toBe(initialReserves - 1);
        expect(result.current.gameManager!.getTerritoryArmies(territory)).toBe(initialOnBoard + 1);
    });

    it('should advance phases correctly (Handling Round 0 Logic)', async () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        await act(async () => {
            result.current.startGame(4);
        });

        const drainArmies = () => {
            // Must fetch fresh player instance every time
            const player = result.current.gameManager!.getPlayerPlaying();
            if (!player || player.armies <= 0) return;

            const target = player.territories[0];
            const amount = player.armies;

            act(() => {
                for(let k=0; k<amount; k++) {
                    result.current.placeReinforcement(target);
                }
            });
        };

        // Round 0 Loop
        for (let i = 0; i < 4; i++) {
            drainArmies();
            const currentPlayerIdBefore = result.current.getCurrentPlayer()?.id;

            act(() => result.current.nextPhase());

            // In Round 0, phase stays REFORÇAR, but player changes
            if (i < 3) {
                expect(result.current.currentPhase).toBe("REFORÇAR");
                expect(result.current.getCurrentPlayer()?.id).not.toBe(currentPlayerIdBefore);
            }
        }

        // Round 1 Begins (Back to first player)
        // Now phase transitions should work normally
        drainArmies();

        act(() => result.current.nextPhase());
        expect(result.current.currentPhase).toBe("ATACAR");

        act(() => result.current.nextPhase());
        expect(result.current.currentPhase).toBe("FORTIFICAR");
    });
});