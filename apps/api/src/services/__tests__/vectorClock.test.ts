import { describe, it, expect } from 'vitest';
import { vectorClockService } from '../vectorClock';

describe('VectorClockService (Week 7: Time & Event Ordering)', () => {
  it('should create an empty clock', () => {
    const clock = vectorClockService.create();
    expect(clock).toEqual({});
  });

  it('should increment a node counter from zero', () => {
    const clock = vectorClockService.increment({}, 'node-A');
    expect(clock).toEqual({ 'node-A': 1 });
  });

  it('should increment an existing node counter', () => {
    let clock = vectorClockService.increment({}, 'node-A');
    clock = vectorClockService.increment(clock, 'node-A');
    expect(clock['node-A']).toBe(2);
  });

  it('should not mutate the original clock', () => {
    const original = { 'node-A': 1 };
    vectorClockService.increment(original, 'node-A');
    expect(original['node-A']).toBe(1);
  });

  it('should merge two clocks taking element-wise max', () => {
    const clock1 = { 'node-A': 2, 'node-B': 1 };
    const clock2 = { 'node-A': 1, 'node-B': 3, 'node-C': 1 };
    const merged = vectorClockService.merge(clock1, clock2);
    expect(merged).toEqual({ 'node-A': 2, 'node-B': 3, 'node-C': 1 });
  });

  it('should detect clock1 happened BEFORE clock2', () => {
    const clock1 = { 'node-A': 1, 'node-B': 1 };
    const clock2 = { 'node-A': 2, 'node-B': 2 };
    expect(vectorClockService.compare(clock1, clock2)).toBe('before');
  });

  it('should detect clock1 happened AFTER clock2', () => {
    const clock1 = { 'node-A': 3, 'node-B': 3 };
    const clock2 = { 'node-A': 2, 'node-B': 2 };
    expect(vectorClockService.compare(clock1, clock2)).toBe('after');
  });

  it('should detect CONCURRENT clocks (the conflict case)', () => {
    const clock1 = { 'node-A': 2, 'node-B': 1 };
    const clock2 = { 'node-A': 1, 'node-B': 2 };
    expect(vectorClockService.compare(clock1, clock2)).toBe('concurrent');
  });

  it('should detect EQUAL clocks', () => {
    const clock1 = { 'node-A': 2, 'node-B': 2 };
    const clock2 = { 'node-A': 2, 'node-B': 2 };
    expect(vectorClockService.compare(clock1, clock2)).toBe('equal');
  });

  it('should treat missing keys as zero (concurrent)', () => {
    const clock1 = { 'node-A': 1 };
    const clock2 = { 'node-B': 1 };
    expect(vectorClockService.compare(clock1, clock2)).toBe('concurrent');
  });

  it('should report concurrency via isConcurrent', () => {
    const clock1 = { 'node-A': 2, 'node-B': 1 };
    const clock2 = { 'node-A': 1, 'node-B': 2 };
    expect(vectorClockService.isConcurrent(clock1, clock2)).toBe(true);
  });

  it('should format clock as sorted string', () => {
    const clock = { 'node-B': 2, 'node-A': 1 };
    expect(vectorClockService.format(clock)).toBe('[node-A:1, node-B:2]');
  });
});