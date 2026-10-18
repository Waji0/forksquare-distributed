import { describe, it, expect } from 'vitest';
import { TwoPhaseCommitCoordinator } from '../twoPhaseCommit';

describe('TwoPhaseCommitCoordinator (Week 8: 2PC & Blocking)', () => {
  it('should COMMIT when all participants vote YES', () => {
    const coordinator = new TwoPhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);
    coordinator.addParticipant('node-3', 'DB Node 3', true);

    const result = coordinator.execute();
    expect(result.outcome).toBe('COMMITTED');
    expect(result.blockingDetected).toBe(false);
    expect(result.protocol).toBe('2PC');
  });

  it('should ABORT when any participant votes NO', () => {
    const coordinator = new TwoPhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', false);
    coordinator.addParticipant('node-3', 'DB Node 3', true);

    const result = coordinator.execute();
    expect(result.outcome).toBe('ABORTED');
  });

  it('should detect BLOCKING when coordinator crashes after PREPARE', () => {
    const coordinator = new TwoPhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);
    coordinator.killCoordinator();

    const result = coordinator.execute();
    expect(result.outcome).toBe('BLOCKED');
    expect(result.blockingDetected).toBe(true);
    expect(result.coordinatorFailed).toBe(true);
  });

  it('should record all phases in the timeline', () => {
    const coordinator = new TwoPhaseCommitCoordinator();
    coordinator.addParticipant('node-1', 'DB Node 1', true);
    coordinator.addParticipant('node-2', 'DB Node 2', true);

    const result = coordinator.execute();
    expect(result.phases.length).toBeGreaterThanOrEqual(2);
    expect(result.phases[0].phase).toContain('PREPARE');
  });
});