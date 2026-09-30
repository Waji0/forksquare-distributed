/**
 * Three-Phase Commit (3PC) Protocol
 * 
 * Course Mapping: Week 9 - "Three-Phase Commit non-blocking protocols"
 * 
 * 3PC adds a PRE_COMMIT phase between PREPARE and COMMIT.
 * This makes it NON-BLOCKING because:
 * - If coordinator crashes after PRE_COMMIT, participants can COMMIT on their own
 * - If coordinator crashes before PRE_COMMIT, participants can ABORT on their own
 * - Participants are never stuck in an uncertain state
 * 
 * Phases:
 * 1. PREPARE (Can you commit?)
 * 2. PRE_COMMIT (I will commit, get ready)
 * 3. DO_COMMIT (Commit now!)
 */

export type ThreePCParticipantState = 'INIT' | 'PREPARED' | 'PRE_COMMITTED' | 'COMMITTED' | 'ABORTED';

export interface ThreePCParticipant {
  id: string;
  name: string;
  state: ThreePCParticipantState;
  vote: 'YES' | 'NO' | null;
  canCommit: boolean;
}

export interface ThreePCResult {
  protocol: '3PC';
  outcome: 'COMMITTED' | 'ABORTED' | 'RECOVERED_AFTER_FAILURE';
  phases: Array<{
    phase: string;
    action: string;
    participants: Array<{ id: string; state: string; vote: string | null }>;
  }>;
  coordinatorFailedAt: string | null;
  blockingDetected: boolean;
  explanation: string;
}

export class ThreePhaseCommitCoordinator {
  private participants: ThreePCParticipant[] = [];
  private failAtPhase: string | null = null;
  private phases: ThreePCResult['phases'] = [];

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
   * Simulate coordinator crash at a specific phase
   */
  killCoordinatorAt(phase: string): void {
    this.failAtPhase = phase;
  }

  /**
   * Execute the 3PC protocol
   */
  execute(): ThreePCResult {
    let outcome: ThreePCResult['outcome'] = 'ABORTED';

    // ==========================================
    // PHASE 1: PREPARE (Voting Phase)
    // ==========================================
    for (const p of this.participants) {
      p.vote = p.canCommit ? 'YES' : 'NO';
      p.state = p.vote === 'YES' ? 'PREPARED' : 'ABORTED';
    }

    this.phases.push({
      phase: 'Phase 1: PREPARE',
      action: 'Coordinator asks: "Can you commit?" Each participant votes YES/NO.',
      participants: this.participants.map(p => ({ id: p.id, state: p.state, vote: p.vote })),
    });

    const allYes = this.participants.every(p => p.vote === 'YES');

    if (!allYes) {
      // Someone voted NO → ABORT immediately
      for (const p of this.participants) p.state = 'ABORTED';

      this.phases.push({
        phase: 'ABORT',
        action: 'A participant voted NO. Coordinator sends ABORT.',
        participants: this.participants.map(p => ({ id: p.id, state: p.state, vote: p.vote })),
      });

      return {
        protocol: '3PC',
        outcome: 'ABORTED',
        phases: this.phases,
        coordinatorFailedAt: null,
        blockingDetected: false,
        explanation: 'ABORTED: A participant voted NO in Phase 1. Transaction rolled back.',
      };
    }

    // Check coordinator failure at Phase 1
    if (this.failAtPhase === 'PREPARE') {
      // Coordinator crashed before sending PRE_COMMIT
      // Participants can safely ABORT (they're in PREPARED state)
      for (const p of this.participants) {
        if (p.state === 'PREPARED') p.state = 'ABORTED';
      }

      this.phases.push({
        phase: '⚠️ COORDINATOR FAILURE (after PREPARE)',
        action: 'Coordinator crashed. Participants in PREPARED state timeout and ABORT on their own. NON-BLOCKING!',
        participants: this.participants.map(p => ({ id: p.id, state: p.state, vote: p.vote })),
      });

      return {
        protocol: '3PC',
        outcome: 'ABORTED',
        phases: this.phases,
        coordinatorFailedAt: 'PREPARE',
        blockingDetected: false,
        explanation: 'NON-BLOCKING RECOVERY: Coordinator crashed after PREPARE. Since participants never received PRE_COMMIT, they know the transaction was not guaranteed. They safely ABORT after timeout. No blocking!',
      };
    }

    // ==========================================
    // PHASE 2: PRE_COMMIT (Key difference from 2PC!)
    // ==========================================
    for (const p of this.participants) {
      p.state = 'PRE_COMMITTED';
    }

    this.phases.push({
      phase: 'Phase 2: PRE_COMMIT',
      action: 'All voted YES. Coordinator sends PRE_COMMIT. Participants acknowledge but do NOT commit yet.',
      participants: this.participants.map(p => ({ id: p.id, state: p.state, vote: p.vote })),
    });

    // Check coordinator failure at Phase 2
    if (this.failAtPhase === 'PRE_COMMIT') {
      // Coordinator crashed after PRE_COMMIT but before DO_COMMIT
      // Participants in PRE_COMMITTED state can safely COMMIT on their own
      // (because PRE_COMMIT means all participants voted YES)
      for (const p of this.participants) {
        if (p.state === 'PRE_COMMITTED') p.state = 'COMMITTED';
      }

      this.phases.push({
        phase: '⚠️ COORDINATOR FAILURE (after PRE_COMMIT)',
        action: 'Coordinator crashed. Participants in PRE_COMMITTED state timeout and COMMIT on their own. NON-BLOCKING!',
        participants: this.participants.map(p => ({ id: p.id, state: p.state, vote: p.vote })),
      });

      return {
        protocol: '3PC',
        outcome: 'RECOVERED_AFTER_FAILURE',
        phases: this.phases,
        coordinatorFailedAt: 'PRE_COMMIT',
        blockingDetected: false,
        explanation: 'NON-BLOCKING RECOVERY: Coordinator crashed after PRE_COMMIT. Since all participants received PRE_COMMIT, they know ALL participants voted YES. They can safely COMMIT on their own after timeout. This is the key advantage over 2PC!',
      };
    }

    // ==========================================
    // PHASE 3: DO_COMMIT
    // ==========================================
    for (const p of this.participants) {
      p.state = 'COMMITTED';
    }

    this.phases.push({
      phase: 'Phase 3: DO_COMMIT',
      action: 'Coordinator sends DO_COMMIT. All participants commit the transaction.',
      participants: this.participants.map(p => ({ id: p.id, state: p.state, vote: p.vote })),
    });

    outcome = 'COMMITTED';

    return {
      protocol: '3PC',
      outcome,
      phases: this.phases,
      coordinatorFailedAt: null,
      blockingDetected: false,
      explanation: 'SUCCESS: All three phases completed. Transaction committed across all nodes. 3PC guarantees non-blocking because the PRE_COMMIT phase eliminates the uncertainty window that exists in 2PC.',
    };
  }
}