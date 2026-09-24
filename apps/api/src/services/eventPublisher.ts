import { producer, TOPICS } from '../config/kafka';

export interface OrderEvent {
  eventType: 'ORDER_CREATED' | 'ORDER_FAILED' | 'PAYMENT_REFUNDED';
  orderId?: number;
  userId: number;
  totalAmount?: number;
  reason?: string;
  timestamp: string;
}

/**
 * Publishes an event to the Kafka topic.
 * This is the "Fire and Forget" mechanism for distributed systems.
 */
export async function publishOrderEvent(event: OrderEvent): Promise<void> {
  try {
    await producer.send({
      topic: TOPICS.ORDERS,
      messages: [
        {
          key: event.userId.toString(), // Partition by userId to maintain order per user
          value: JSON.stringify(event),
        },
      ],
    });
    console.log(`📤 Event Published: ${event.eventType} for User ${event.userId}`);
  } catch (error) {
    console.error('❌ Failed to publish event:', error);
    // In a real system, this would go to an Outbox Pattern table
  }
}