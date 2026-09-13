import amqplib from 'amqplib';

const QUEUE = 'auth_notification_queue';

let channel = null;

async function getChannel() {
  if (channel) return channel;

  if (!process.env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL is not set');
  }

  const connection = await amqplib.connect(process.env.RABBITMQ_URL);

  // agar connection toot jaye to retry allow karo
  connection.on('error', (err) => {
    console.error('RabbitMQ connection error:', err.message);
    channel = null;
  });
  connection.on('close', () => { channel = null; });

  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });
  return channel;
}

export async function sendAuthNotification(message) {
  const ch = await getChannel();
  ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });
}
