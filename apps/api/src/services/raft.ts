/**
 * Raft Consensus Algorithm (Simplified Implementation)
 * 
 * Course Mapping: Week 12 - "State machine replication; Paxos protocol; 
 * Raft consensus algorithm (leader election, log replication, safety)"
 * 
 * Key Concepts:
 * 1. Nodes have states: FOLLOWER, CANDIDATE, LEADER
 * 2. Time is divided into TERMS (election rounds)
 * 3. Followers become CANDIDATES when they don't receive heartbeats
 * 4. Candidates request votes; majority wins → becomes LEADER
 * 5. Only ONE leader per term (safety guarantee)
 * 
 * This is a simplified in-memory simulation for educational purposes.
 * Production Raft implementations: etcd, Consul, TiKV.
 */

export type RaftNodeState = 'FOLLOWER' | 'CANDIDATE' | 'LEADER';

export interface RaftLogEntry {
  term: number;
  index: number;
  command: string;
}

export interface RaftNode {
  id: string;
  state: RaftNodeState;
  currentTerm: number;
  votedFor: string | null;
  log: RaftLogEntry[];
  leaderId: string | null;
  votesReceived: Set<string>;
  isAlive: boolean;
}

export interface RaftElectionResult {
  winner: string | null;
  term: number;
  totalNodes: number;
  aliveNodes: number;
  majorityRequired: number;
  votes: Record<string, string | null>;
  timeline: Array<{
    step: string;
    nodeId: string;
    action: string;
    term: number;
  }>;
  explanation: string;
}

export class RaftCluster {
  private nodes: Map<string, RaftNode> = new Map();
  private timeline: RaftElectionResult['timeline'] = [];

  constructor(nodeIds: string[]) {
    for (const id of nodeIds) {
      this.nodes.set(id, {
        id,
        state: 'FOLLOWER',
        currentTerm: 0,
        votedFor: null,
        log: [],
        leaderId: null,
        votesReceived: new Set(),
        isAlive: true,
      });
    }
  }

  /**
   * Simulate a node crash (network partition)
   */
  killNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isAlive = false;
      this.timeline.push({
        step: 'NODE_FAILURE',
        nodeId,
        action: `Node ${nodeId} crashed (network partition)`,
        term: node.currentTerm,
      });
    }
  }

  /**
   * Get majority threshold
   */
  private getMajority(): number {
    const aliveCount = Array.from(this.nodes.values()).filter(n => n.isAlive).length;
    return Math.floor(aliveCount / 2) + 1;
  }

  /**
   * Run a leader election
   * Simulates what happens when a follower times out waiting for heartbeats
   */
  runElection(): RaftElectionResult {
    this.timeline = [];
    const aliveNodes = Array.from(this.nodes.values()).filter(n => n.isAlive);
    const majority = this.getMajority();
    const votes: Record<string, string | null> = {};

    // Step 1: A follower times out and becomes CANDIDATE
    const candidate = aliveNodes[Math.floor(Math.random() * aliveNodes.length)];
    if (!candidate) {
      return {
        winner: null,
        term: 0,
        totalNodes: this.nodes.size,
        aliveNodes: 0,
        majorityRequired: 1,
        votes: {},
        timeline: [{ step: 'ERROR', nodeId: 'none', action: 'No alive nodes', term: 0 }],
        explanation: 'No alive nodes available for election.',
      };
    }

    candidate.currentTerm++;
    candidate.state = 'CANDIDATE';
    candidate.votedFor = candidate.id;
    candidate.votesReceived.add(candidate.id);

    this.timeline.push({
      step: 'TIMEOUT',
      nodeId: candidate.id,
      action: `Follower timed out. Became CANDIDATE. Incremented term to ${candidate.currentTerm}. Voted for self.`,
      term: candidate.currentTerm,
    });

    // Step 2: Candidate sends RequestVote RPCs to all other alive nodes
    for (const node of aliveNodes) {
      if (node.id === candidate.id) continue;

      this.timeline.push({
        step: 'REQUEST_VOTE',
        nodeId: candidate.id,
        action: `Candidate ${candidate.id} sends RequestVote(term=${candidate.currentTerm}) to ${node.id}`,
        term: candidate.currentTerm,
      });

      // Step 3: Each node decides whether to grant the vote
      const grantVote = this.shouldGrantVote(node, candidate);

      if (grantVote) {
        node.currentTerm = candidate.currentTerm;
        node.votedFor = candidate.id;
        candidate.votesReceived.add(node.id);

        this.timeline.push({
          step: 'VOTE_GRANTED',
          nodeId: node.id,
          action: `Node ${node.id} grants vote to ${candidate.id}`,
          term: candidate.currentTerm,
        });
      } else {
        this.timeline.push({
          step: 'VOTE_REJECTED',
          nodeId: node.id,
          action: `Node ${node.id} rejects vote from ${candidate.id} (already voted or higher term)`,
          term: candidate.currentTerm,
        });
      }

      votes[node.id] = grantVote ? candidate.id : null;
    }

    votes[candidate.id] = candidate.id; // Self-vote

    // Step 4: Check if candidate got majority
    const hasMajority = candidate.votesReceived.size >= majority;

    if (hasMajority) {
      candidate.state = 'LEADER';
      candidate.leaderId = candidate.id;

      // All followers acknowledge the leader
      for (const node of aliveNodes) {
        if (node.id !== candidate.id) {
          node.state = 'FOLLOWER';
          node.leaderId = candidate.id;
        }
      }

      this.timeline.push({
        step: 'LEADER_ELECTED',
        nodeId: candidate.id,
        action: `Node ${candidate.id} received ${candidate.votesReceived.size}/${aliveNodes.length} votes (majority=${majority}). Became LEADER. Sending heartbeats.`,
        term: candidate.currentTerm,
      });
    } else {
      candidate.state = 'FOLLOWER';

      this.timeline.push({
        step: 'ELECTION_FAILED',
        nodeId: candidate.id,
        action: `Node ${candidate.id} received only ${candidate.votesReceived.size}/${aliveNodes.length} votes. Needs ${majority}. Election failed. Will retry.`,
        term: candidate.currentTerm,
      });
    }

    return {
      winner: hasMajority ? candidate.id : null,
      term: candidate.currentTerm,
      totalNodes: this.nodes.size,
      aliveNodes: aliveNodes.length,
      majorityRequired: majority,
      votes,
      timeline: this.timeline,
      explanation: hasMajority
        ? `Node ${candidate.id} won the election with ${candidate.votesReceived.size} votes out of ${aliveNodes.length} alive nodes. Majority threshold was ${majority}. The new leader will now send periodic heartbeats to maintain authority and prevent new elections.`
        : `No candidate achieved majority (${majority} votes required). This can happen during network partitions. The election will be retried after a random timeout.`,
    };
  }

  /**
   * Raft voting rule: Grant vote if candidate's term >= voter's term
   * and voter hasn't voted for someone else in this term
   */
  private shouldGrantVote(voter: RaftNode, candidate: RaftNode): boolean {
    if (candidate.currentTerm < voter.currentTerm) {
      return false; // Candidate's term is outdated
    }

    if (voter.votedFor !== null && voter.votedFor !== candidate.id && voter.currentTerm === candidate.currentTerm) {
      return false; // Already voted for someone else this term
    }

    return true;
  }

  /**
   * Append a log entry (only leader can do this)
   */
  appendLog(command: string): { success: boolean; entry: RaftLogEntry | null } {
    const leader = Array.from(this.nodes.values()).find(
      n => n.state === 'LEADER' && n.isAlive
    );

    if (!leader) {
      return { success: false, entry: null };
    }

    const entry: RaftLogEntry = {
      term: leader.currentTerm,
      index: leader.log.length + 1,
      command,
    };

    leader.log.push(entry);

    // Replicate to followers (simplified)
    for (const node of this.nodes.values()) {
      if (node.id !== leader.id && node.isAlive) {
        node.log.push(entry);
      }
    }

    return { success: true, entry };
  }

  /**
   * Get cluster state
   */
  getClusterState(): Array<{
    id: string;
    state: RaftNodeState;
    currentTerm: number;
    votedFor: string | null;
    leaderId: string | null;
    logLength: number;
    isAlive: boolean;
  }> {
    return Array.from(this.nodes.values()).map(n => ({
      id: n.id,
      state: n.state,
      currentTerm: n.currentTerm,
      votedFor: n.votedFor,
      leaderId: n.leaderId,
      logLength: n.log.length,
      isAlive: n.isAlive,
    }));
  }
}

// Global cluster instance
export const raftCluster = new RaftCluster(['node-A', 'node-B', 'node-C', 'node-D', 'node-E']);