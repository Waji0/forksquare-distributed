import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TwoPhaseCommitCoordinator } from '../services/twoPhaseCommit';
import { ThreePhaseCommitCoordinator } from '../services/threePhaseCommit';
import { ApiError } from '../middlewares/errorHandler';

const scenarioSchema = z.object({
  scenario: z.enum([
    'all_success',
    'one_participant_fails',
    'coordinator_fails',
  ]),
  participantCount: z.string().optional(),
});

// ==========================================
// POST /api/commit-protocols/2pc
// ==========================================
export function run2PC(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = scenarioSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'scenario is required (all_success | one_participant_fails | coordinator_fails)');

    const { scenario, participantCount } = parsed.data;
    const count = Math.min(10, Math.max(2, Number(participantCount) || 3));

    const coordinator = new TwoPhaseCommitCoordinator();

    // Add participants
    for (let i = 0; i < count; i++) {
      const canCommit = scenario === 'one_participant_fails' ? i !== 1 : true;
      coordinator.addParticipant(`node_${i}`, `Database Node ${i}`, canCommit);
    }

    // Simulate coordinator failure
    if (scenario === 'coordinator_fails') {
      coordinator.killCoordinator();
    }

    const result = coordinator.execute();

    res.json({
      success: true,
      data: result,
      scenario,
      courseNote: scenario === 'coordinator_fails'
        ? 'This demonstrates the BLOCKING PROBLEM of 2PC. If the coordinator crashes after PREPARE, participants hold locks indefinitely. This is why 3PC was invented.'
        : undefined,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/commit-protocols/3pc
// ==========================================
export function run3PC(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = scenarioSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'scenario is required');

    const { scenario, participantCount } = parsed.data;
    const count = Math.min(10, Math.max(2, Number(participantCount) || 3));

    const coordinator = new ThreePhaseCommitCoordinator();

    for (let i = 0; i < count; i++) {
      const canCommit = scenario === 'one_participant_fails' ? i !== 1 : true;
      coordinator.addParticipant(`node_${i}`, `Database Node ${i}`, canCommit);
    }

    // Simulate coordinator failure at different phases
    if (scenario === 'coordinator_fails') {
      // 3PC can handle failure at either PREPARE or PRE_COMMIT
      coordinator.killCoordinatorAt('PRE_COMMIT');
    }

    const result = coordinator.execute();

    res.json({
      success: true,
      data: result,
      scenario,
      comparisonWith2PC: 'Unlike 2PC, 3PC NEVER blocks. If coordinator fails after PRE_COMMIT, participants can commit on their own. If it fails before PRE_COMMIT, participants can abort on their own.',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/commit-protocols/compare
// ==========================================
export function compareProtocols(_req: Request, res: Response, _next: NextFunction): void {
  res.json({
    success: true,
    data: {
      '2PC': {
        phases: ['PREPARE', 'COMMIT/ABORT'],
        blocking: true,
        failureScenario: 'If coordinator crashes after PREPARE, participants are BLOCKED indefinitely',
        messageComplexity: 'O(2N)',
        useCase: 'Single-datacenter, low-latency scenarios',
      },
      '3PC': {
        phases: ['PREPARE', 'PRE_COMMIT', 'DO_COMMIT'],
        blocking: false,
        failureScenario: 'If coordinator crashes, participants can decide on their own (timeout-based)',
        messageComplexity: 'O(3N)',
        useCase: 'Multi-datacenter, high-availability scenarios',
      },
      saga: {
        phases: ['Local TX 1', 'Local TX 2', '...', 'Local TX N'],
        blocking: false,
        failureScenario: 'Compensating transactions undo completed steps',
        messageComplexity: 'O(N)',
        useCase: 'Microservices, long-running transactions',
      },
    },
    courseMapping: {
      week8: 'Two-Phase Commit (2PC) protocol; coordinator failure, blocking scenarios',
      week9: 'Three-Phase Commit (3PC) non-blocking protocols; Saga pattern',
    },
  });
}