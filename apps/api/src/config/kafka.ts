import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

/**
 * Kafka / Redpanda Configuration
 * 
 * Course Mapping: Module 2 - Event Streaming & Asynchronous Replication
 * 
 * We use Redpanda locally (port 19092) which speaks the Kafka protocol.
 * In production, this would point to an MSK (Managed Streaming for Kafka) cluster.
 */

export const kafka = new Kafka({
  clientId: 'forksquare-api',
  brokers: ['localhost:19092'],
  logLevel: logLevel.ERROR, // Keep console clean
});

export const producer: Producer = kafka.producer();

// Consumer Groups allow multiple workers to process events in parallel
export const notificationConsumer: Consumer = kafka.consumer({ 
  groupId: 'forksquare-notification-service' 
});

export const analyticsConsumer: Consumer = kafka.consumer({ 
  groupId: 'forksquare-analytics-service' 
});

export const TOPICS = {
  ORDERS: 'forksquare.orders',
};

export async function connectKafka() {
  await producer.connect();
  await notificationConsumer.connect();
  await analyticsConsumer.connect();
  console.log('✅ Kafka (Redpanda) Producer & Consumers Connected');
}

export async function disconnectKafka() {
  await producer.disconnect();
  await notificationConsumer.disconnect();
  await analyticsConsumer.disconnect();
}