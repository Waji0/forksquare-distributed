/**
 * Two-Phase Commit (2PC) Protocol
 * 
 * Course Mapping: Week 8 - "Multi-node transactions; Two-Phase Commit protocol;
 * coordinator failure, blocking scenarios, and recovery logs"
 * 
 * Phase 1 (PREPARE): Coordinator asks all participants "Can you commit?"
 * Phase 2 (COMMIT/ABORT): If ALL say YES → COMMIT. If ANY says NO → ABORT.
 * 
 * PROBLEM: If coordinator crashes after PREPARE but before COMMIT,
 * participants are BLOCKED waiting indefinitely (blocking protocol).
 */

export type ParticipantVote = 'YES' | 'NO';
export type ParticipantState = 'INIT' | 'PREPARED' | 'COMMITTED' | 'ABORTED' | 'BLOCKED';

export interface TwoPCParticipant {
  id: string;
  name: string;
  state: ParticipantState;
  vote: ParticipantVote | null;
  canCommit: boolean; // Simulates whether this node can commit
}

export interface TwoPCResult {
  protocol: '2PC';
  outcome: 'COMMITTED' | 'ABORTED' | 'BLOCKED';
  phases: Array<{
    phase: string;
    action: string;
    participants: Array<{ id: string; state: string; vote: string | null }>;
  }>;
  coordinatorFailed: boolean;
  blockingDetected: boolean;
  explanation: string;
}

export class TwoPhaseCommitCoordinator {
  private participants: TwoPCParticipant[] = [];
  private coordinatorAlive: boolean = true;
  private phases: TwoPCResult['phases'] = [];

  addParticipant(id: string, name: string, canCommit: boolean = true): void {
    this.participants.push({
      id,
      name,
      state: 'INIT',
      vote: null,
      canCommit,
    });
  }

  /**
   * Simulate coordinator crash
   */
  killCoordinator(): void {
    this.coordinatorAlive = false;
  }

  /**
   * Execute the 2PC protocol
   */
  execute(): TwoPCResult {
    let outcome: 'COMMITTED' | 'ABORTED' | 'BLOCKED' = 'ABORTED';
    let blockingDetected = false;

    // ==========================================
    // PHASE 1: PREPARE (Voting Phase)
    // ==========================================
    const prepareResults: Array<{ id: string; state: string; vote: string | null }> = [];

    for (const participant of this.participants) {
      // Each participant checks if it can commit
      participant.vote = participant.canCommit ? 'YES' : 'NO';
      participant.state = participant.vote === 'YES' ? 'PREPARED' : 'ABORTED';

      prepareResults.push({
        id: participant.id,
        state: participant.state,
        vote: participant.vote,
      });
    }

    this.phases.push({
      phase: 'Phase 1: PREPARE',
      action: 'Coordinator sends PREPARE to all participants. Each participant votes YES or NO.',
      participants: prepareResults,
    });

    // Check if all participants voted YES
    const allYes = this.participants.every(p => p.vote === 'YES');

    // ==========================================
    // Check for Coordinator Failure (BLOCKING SCENARIO)
    // ==========================================
    if (!this.coordinatorAlive) {
      // Coordinator crashed after PREPARE but before COMMIT/ABORT decision
      // Participants are now BLOCKED waiting for the coordinator
      for (const participant of this.participants) {
        if (participant.state === 'PREPARED') {
          participant.state = 'BLOCKED';
        }
      }

      this.phases.push({
        phase: '⚠️ COORDINATOR FAILURE',
        action: 'Coordinator crashed after PREPARE phase. Participants in PREPARED state are now BLOCKED indefinitely.',
        participants: this.participants.map(p => ({
          id: p.id,
          state: p.state,
          vote: p.vote,
        })),
      });

      outcome = 'BLOCKED';
      blockingDetected = true;

      return {
        protocol: '2PC',
        outcome,
        phases: this.phases,
        coordinatorFailed: true,
        blockingDetected,
        explanation: 'BLOCKING SCENARIO: The coordinator crashed after Phase 1 (PREPARE) but before sending the final COMMIT/ABORT decision. All participants that voted YES are now in a BLOCKED state, holding locks indefinitely. They cannot commit (because they don\'t know if others voted NO) and cannot abort (because they already promised to commit). This is the fundamental flaw of 2PC.',
      };
    }

    // ==========================================
    // PHASE 2: COMMIT or ABORT (Decision Phase)
    // ==========================================
    if (allYes) {
      // All participants voted YES → COMMIT
      for (const participant of this.participants) {
        participant.state = 'COMMITTED';
      }
      outcome = 'COMMITTED';

      this.phases.push({
        phase: 'Phase 2: COMMIT',
        action: 'All participants voted YES. Coordinator sends COMMIT to all.',
        participants: this.participants.map(p => ({
          id: p.id,
          state: p.state,
          vote: p.vote,
        })),
      });
    } else {
      // At least one participant voted NO → ABORT
      for (const participant of this.participants) {
        participant.state = 'ABORTED';
      }
      outcome = 'ABORTED';

      this.phases.push({
        phase: 'Phase 2: ABORT',
        action: 'At least one participant voted NO. Coordinator sends ABORT to all.',
        participants: this.participants.map(p => ({
          id: p.id,
          state: p.state,
          vote: p.vote,
        })),
      });
    }

    return {
      protocol: '2PC',
      outcome,
      phases: this.phases,
      coordinatorFailed: false,
      blockingDetected: false,
      explanation: outcome === 'COMMITTED'
        ? 'SUCCESS: All participants voted YES in Phase 1. The coordinator sent COMMIT in Phase 2. The transaction is atomically committed across all nodes.'
        : 'ABORTED: At least one participant voted NO in Phase 1. The coordinator sent ABORT in Phase 2. The transaction is rolled back on all nodes.',
    };
  }
}