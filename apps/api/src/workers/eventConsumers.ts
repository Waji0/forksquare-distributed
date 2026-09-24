import { notificationConsumer, analyticsConsumer, TOPICS } from '../config/kafka';
import { pgPool } from '../config/db';
import { OrderEvent } from '../services/eventPublisher';

/**
 * Background Workers (Consumers)
 * 
 * These run asynchronously. The main API doesn't wait for them to finish.
 * Course Mapping: Module 2 - Asynchronous Replication & Eventual Consistency
 */

export async function startConsumers() {
  // 1. Notification Service Consumer
  await notificationConsumer.subscribe({ topic: TOPICS.ORDERS, fromBeginning: false });
  
  await notificationConsumer.run({
    eachMessage: async ({ message }) => {
      const event: OrderEvent = JSON.parse(message.value?.toString() || '{}');
      
      // Simulate sending an email/SMS (takes time)
      console.log(`📧 [Notification Worker] Processing ${event.eventType}...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      
      if (event.eventType === 'ORDER_CREATED') {
        console.log(`📧 [Notification Worker] Sent Email to User ${event.userId}: "Your order #${event.orderId} is confirmed!"`);
      } else if (event.eventType === 'ORDER_FAILED') {
        console.log(`📧 [Notification Worker] Sent Email to User ${event.userId}: "Your order failed. Reason: ${event.reason}"`);
      }

      // Log to DB so frontend can see it
      await pgPool.query(
        `INSERT INTO event_logs (topic, event_type, payload, processed_by) 
         VALUES ($1, $2, $3, $4)`,
        [TOPICS.ORDERS, event.eventType, JSON.stringify(event), 'NotificationService']
      );
    },
  });

  // 2. Analytics Service Consumer
  await analyticsConsumer.subscribe({ topic: TOPICS.ORDERS, fromBeginning: false });

  await analyticsConsumer.run({
    eachMessage: async ({ message }) => {
      const event: OrderEvent = JSON.parse(message.value?.toString() || '{}');
      
      console.log(`📊 [Analytics Worker] Ingesting ${event.eventType} into Data Warehouse...`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate ClickHouse/Columnar DB write

      // Log to DB
      await pgPool.query(
        `INSERT INTO event_logs (topic, event_type, payload, processed_by) 
         VALUES ($1, $2, $3, $4)`,
        [TOPICS.ORDERS, event.eventType, JSON.stringify(event), 'AnalyticsService']
      );
    },
  });

  console.log('👷 Background Consumers Started and Listening...');
}