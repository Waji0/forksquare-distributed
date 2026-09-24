/**
 * Saga Orchestrator
 * 
 * Course Mapping: Week 9 - Saga pattern for long-running transactions
 * 
 * A Saga is a sequence of local transactions. Each local transaction updates
 * the database and publishes an event/message. If a local transaction fails,
 * the saga executes compensating transactions to rollback the preceding steps.
 */

export interface SagaStep {
  name: string;
  action: () => Promise<unknown>;
  compensate: () => Promise<void>;
}

export class SagaOrchestrator {
  private steps: SagaStep[] = [];
  private executedSteps: SagaStep[] = [];

  addStep(step: SagaStep): this {
    this.steps.push(step);
    return this;
  }

  async execute(): Promise<void> {
    for (const step of this.steps) {
      try {
        console.log(`[Saga] Executing step: ${step.name}`);
        await step.action();
        this.executedSteps.push(step);
      } catch (error) {
        console.error(`[Saga] Step failed: ${step.name}. Starting compensation...`);
        await this.compensate();
        throw error; // Rethrow to let the controller handle the HTTP response
      }
    }
    console.log('[Saga] All steps completed successfully.');
  }

  private async compensate(): Promise<void> {
    // Rollback in REVERSE order (LIFO)
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const step = this.executedSteps[i];
      try {
        console.log(`[Saga] Compensating step: ${step.name}`);
        await step.compensate();
      } catch (compError) {
        // In a real system, this would go to a dead-letter queue for manual intervention
        console.error(`[Saga] CRITICAL: Compensation failed for ${step.name}`, compError);
      }
    }
  }
}