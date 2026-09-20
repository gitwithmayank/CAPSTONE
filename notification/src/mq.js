import amqplib from 'amqplib';

const QUEUE = 'auth_notification_queue';
const RETRY_DELAY_MS = 5000;

let currentChannel = null;
let consumer = null;

// RabbitMQ connect with infinite retry — transient DNS/network failures
// (EAI_AGAIN, ECONNREFUSED) par app crash NAHI hoga.
export async function startMq() {
    for (;;) {
        try {
            const connection = await amqplib.connect(process.env.RABBITMQ_URL);

            connection.on('error', (err) =>
                console.error('RabbitMQ connection error:', err.message)
            );
            connection.on('close', () => {
                if (currentChannel) {
                    console.error('RabbitMQ connection closed — retrying in 5s...');
                    currentChannel = null;
                    setTimeout(() => {
                        startMq();
                    }, RETRY_DELAY_MS);
                }
            });

            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE, { durable: true });

            currentChannel = channel;
            console.log('RabbitMQ connected, queue asserted:', QUEUE);
            subscribe();
            return;
        } catch (err) {
            console.error('RabbitMQ connect failed, retrying in 5s:', err.message);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
}

// Consumer register karo. Reconnect hone par bhi automatically
// re-subscribe ho jayega.
export function registerConsumer(fn) {
    consumer = fn;
    subscribe();
}

function subscribe() {
    if (currentChannel && consumer) {
        currentChannel.consume(QUEUE, consumer);
        console.log('Subscribed to queue:', QUEUE);
    }
}

export const getChannel = () => currentChannel;
