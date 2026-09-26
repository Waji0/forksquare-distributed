import { notificationConsumer, analyticsConsumer, TOPICS } from '../config/kafka';
import { pgPool } from '../config/db';
import { insertAnalyticsEvent } from '../services/analytics';
import { OrderEvent } from '../services/eventPublisher';

export async function startConsumers() {
  // 1. Notification Service Consumer
  await notificationConsumer.subscribe({ topic: TOPICS.ORDERS, fromBeginning: false });

  await notificationConsumer.run({
    eachMessage: async ({ message }) => {
      const event: OrderEvent = JSON.parse(message.value?.toString() || '{}');

      console.log(`📧 [Notification Worker] Processing ${event.eventType}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (event.eventType === 'ORDER_CREATED') {
        console.log(`📧 [Notification Worker] Sent Email to User ${event.userId}`);
      } else if (event.eventType === 'ORDER_FAILED') {
        console.log(`📧 [Notification Worker] Sent failure email to User ${event.userId}`);
      }

      // Log to Postgres event_logs
      await pgPool.query(
        `INSERT INTO event_logs (topic, event_type, payload, processed_by) VALUES ($1, $2, $3, $4)`,
        [TOPICS.ORDERS, event.eventType, JSON.stringify(event), 'NotificationService']
      );
    },
  });

  // 2. Analytics Service Consumer (NOW WRITES TO CLICKHOUSE)
  await analyticsConsumer.subscribe({ topic: TOPICS.ORDERS, fromBeginning: false });

  await analyticsConsumer.run({
    eachMessage: async ({ message }) => {
      const event: OrderEvent = JSON.parse(message.value?.toString() || '{}');

      console.log(`📊 [Analytics Worker] Ingesting ${event.eventType} into ClickHouse...`);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Write to ClickHouse (Columnar DB)
      await insertAnalyticsEvent({
        event_type: event.eventType,
        user_id: event.userId,
        order_id: event.orderId,
        total_amount: event.totalAmount,
        processed_by: 'AnalyticsService',
        status: event.eventType === 'ORDER_CREATED' ? 'COMPLETED' : 'FAILED',
      });

      // Also log to Postgres for compatibility
      await pgPool.query(
        `INSERT INTO event_logs (topic, event_type, payload, processed_by) VALUES ($1, $2, $3, $4)`,
        [TOPICS.ORDERS, event.eventType, JSON.stringify(event), 'AnalyticsService']
      );
    },
  });

  console.log('👷 Background Consumers Started and Listening...');
}