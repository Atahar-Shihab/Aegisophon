import { GatewayService } from './gateway.service';

const SIMULATED_PROMPTS = [
  'How to reverse a singly linked list in TypeScript with O(1) space?',
  'Translate this word to French: Enterprise Observability',
  'What is the capital of Australia?',
  'Synthesize architecture for zero-downtime database migration with blue-green failover.',
  'Hello! How can I configure the MoE semantic router?',
  'Prove the loop invariant for distributed consensus under network partitions. Think step by step.',
  'Write a Python regex to extract email addresses and domain names.',
  'Explain the differences between optimistic locking and pessimistic locking with SQL examples.',
  'Calculate the asymptotic time complexity of merge sort vs quicksort in worst case.',
  // Duplicates to trigger genuine semantic cache hits
  'How to reverse a singly linked list in TypeScript with O(1) space?',
  'Translate this word to French: Enterprise Observability',
  'Synthesize architecture for zero-downtime database migration with blue-green failover.',
];

export class TrafficSimulatorService {
  private static instance: TrafficSimulatorService;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private promptIndex = 0;

  public static getInstance(): TrafficSimulatorService {
    if (!TrafficSimulatorService.instance) {
      TrafficSimulatorService.instance = new TrafficSimulatorService();
    }
    return TrafficSimulatorService.instance;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public start(): boolean {
    if (this.running) return true;
    this.running = true;

    const tick = async () => {
      if (!this.running) return;

      const prompt = SIMULATED_PROMPTS[this.promptIndex % SIMULATED_PROMPTS.length];
      this.promptIndex++;

      try {
        await GatewayService.getInstance().execute({
          prompt,
          routingMode: 'auto-moe',
        });
      } catch {
        // Silently handled in gateway telemetry
      }

      // Next tick in 2.0 to 3.5 seconds
      const nextDelay = Math.floor(Math.random() * 1500 + 2000);
      if (this.running) {
        this.timer = setTimeout(tick, nextDelay);
      }
    };

    this.timer = setTimeout(tick, 1000);
    return true;
  }

  public stop(): boolean {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return false;
  }

  public toggle(): boolean {
    if (this.running) {
      return this.stop();
    } else {
      return this.start();
    }
  }
}
