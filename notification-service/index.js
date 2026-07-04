const amqp = require('amqplib');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://127.0.0.1:5672';
const queueName = 'task_created';

async function startConsumer(retries = 5, delayMs = 3000) {
    while (retries > 0) {
        try {
            const connection = await amqp.connect(rabbitmqUrl);
            const channel = await connection.createChannel();
            await channel.assertQueue(queueName, { durable: true });
            channel.prefetch(1);

            console.log(`notification-service listening on ${queueName}`);

            channel.consume(queueName, (message) => {
                if (!message) {
                    return;
                }

                try {
                    const task = JSON.parse(message.content.toString());
                    console.log('Received task_created event:', task);
                    channel.ack(message);
                } catch (err) {
                    console.error('Failed to process task_created message', err);
                    channel.nack(message, false, false);
                }
            });

            return;
        } catch (err) {
            console.error(`Error connecting to RabbitMQ (attempt ${6 - retries}/5)`, err);
            retries -= 1;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    process.exit(1);
}

startConsumer();
