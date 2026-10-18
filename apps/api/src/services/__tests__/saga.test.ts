import { describe, it, expect } from 'vitest';
import { SagaOrchestrator } from '../saga';

describe('SagaOrchestrator (Week 9: Distributed Transactions)', () => {
  it('should execute all steps in order on success', async () => {
    const executed: string[] = [];
    const saga = new SagaOrchestrator();

    saga.addStep({
      name: 'Reserve Inventory',
      action: async () => { executed.push('step1'); },
      compensate: async () => { executed.push('comp1'); },
    });
    saga.addStep({
      name: 'Process Payment',
      action: async () => { executed.push('step2'); },
      compensate: async () => { executed.push('comp2'); },
    });

    await saga.execute();
    expect(executed).toEqual(['step1', 'step2']);
  });

  it('should compensate in REVERSE order when a step fails', async () => {
    const executed: string[] = [];
    const saga = new SagaOrchestrator();

    saga.addStep({
      name: 'Step 1',
      action: async () => { executed.push('step1'); },
      compensate: async () => { executed.push('comp1'); },
    });
    saga.addStep({
      name: 'Step 2',
      action: async () => { executed.push('step2'); },
      compensate: async () => { executed.push('comp2'); },
    });
    saga.addStep({
      name: 'Step 3 (fails)',
      action: async () => { throw new Error('Payment gateway declined'); },
      compensate: async () => { executed.push('comp3'); },
    });

    await expect(saga.execute()).rejects.toThrow('Payment gateway declined');

    // Steps 1 and 2 ran, step 3 failed before executing
    expect(executed).toContain('step1');
    expect(executed).toContain('step2');
    expect(executed).not.toContain('comp3'); // failed step never executed, so not compensated

    // Compensation must happen in reverse: comp2 before comp1
    expect(executed.indexOf('comp2')).toBeLessThan(executed.indexOf('comp1'));
  });

  it('should not compensate when the first step fails', async () => {
    const executed: string[] = [];
    const saga = new SagaOrchestrator();

    saga.addStep({
      name: 'Step 1 (fails)',
      action: async () => { throw new Error('Inventory unavailable'); },
      compensate: async () => { executed.push('comp1'); },
    });

    await expect(saga.execute()).rejects.toThrow('Inventory unavailable');
    expect(executed).not.toContain('comp1');
  });

  it('should support method chaining via addStep', () => {
    const saga = new SagaOrchestrator();
    const result = saga
      .addStep({ name: 'A', action: async () => {}, compensate: async () => {} })
      .addStep({ name: 'B', action: async () => {}, compensate: async () => {} });
    expect(result).toBe(saga);
  });
});