import { describe, it, expect } from 'vitest';
import { ThreePhaseCommitCoordinator } from '../threePhaseCommit';

describe('ThreePhaseCommitCoordinator (Week 9: 3PC Non-Blocking)', () => {
  it('should COMMIT when all participants vote YES', () => {
    const coordinator = new ThreePhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);

    const result = coordinator.execute();
    expect(result.outcome).toBe('COMMITTED');
    expect(result.blockingDetected).toBe(false);
    expect(result.protocol).toBe('3PC');
  });

  it('should ABORT when a participant votes NO', () => {
    const coordinator = new ThreePhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', false);

    const result = coordinator.execute();
    expect(result.outcome).toBe('ABORTED');
  });

  it('should RECOVER (non-blocking) when coordinator fails at PRE_COMMIT', () => {
    const coordinator = new ThreePhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);
    coordinator.killCoordinatorAt('PRE_COMMIT');

    const result = coordinator.execute();
    // The KEY difference from 2PC: participants can commit on their own
    expect(result.outcome).toBe('RECOVERED_AFTER_FAILURE');
    expect(result.blockingDetected).toBe(false);
  });

  it('should ABORT safely (non-blocking) when coordinator fails at PREPARE', () => {
    const coordinator = new ThreePhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);
    coordinator.killCoordinatorAt('PREPARE');

    const result = coordinator.execute();
    expect(result.outcome).toBe('ABORTED');
    expect(result.blockingDetected).toBe(false); // Non-blocking even on failure
  });

  it('should include PRE_COMMIT phase in the timeline', () => {
    const coordinator = new ThreePhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);

    const result = coordinator.execute();
    const phaseNames = result.phases.map((p) => p.phase);
    expect(phaseNames.some((p) => p.includes('PRE_COMMIT'))).toBe(true);
  });
});