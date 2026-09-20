import express from 'express';
import morgan from 'morgan';
import { sendEmail } from './email.js';
import { startMq, registerConsumer, getChannel } from './mq.js';

const app = express();
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('Hello from Notification Service!');
});

app.get("/_status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/_status/readyz", (req, res) => {
    res.status(200).json({ status: "ready" });
});


// MQ background me connect hota hai (retry ke saath) — server start
// block/crash nahi hoga chahe RabbitMQ ya DNS down ho.
startMq();

const onMessage = async (msg) => {
    if (msg !== null) {
        const messageContent = msg.content.toString();
        console.log('Received message from queue:', messageContent);

        try {
            const { userId, timestamp, email } = JSON.parse(messageContent);
            
            const subject = 'New Login Notification';
            const text = `A new login was detected for your account at ${timestamp}. If this was not you, please secure your account immediately.`;
            const html = `<p>A new login was detected for your account at <strong>${timestamp}</strong>. If this was not you, please secure your account immediately.</p>`;

            await sendEmail(email, subject, text, html);
            
            getChannel().ack(msg);
        } catch (error) {
            console.error('Error processing message:', error);
            // Optionally, you can choose to nack the message to requeue it
            // getChannel().nack(msg);
        }
    } else {
        console.log('Received null message');
    }
};

registerConsumer(onMessage);



export default app;