require('dotenv').config();

const amqp = require('amqplib');
const nodemailer = require('nodemailer');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://127.0.0.1:5672';
const queueName = 'task_created';
const emailTo = process.env.EMAIL_TO || 'thirusmart54@gmail.com';
const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
    console.error('Missing email credentials. Set EMAIL_USER and EMAIL_PASS in notification-service/.env or your shell environment.');
    process.exit(1);
}

const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

async function sendTaskEmail(task) {
    const subject = `New task created: ${task.title || 'Untitled task'}`;
    const text = [
        'A new task was created.',
        '',
        `Title: ${task.title || '-'}`,
        `Description: ${task.description || '-'}`,
        `User ID: ${task.userId || '-'}`,
        `Created At: ${task.createdAt || '-'}`
    ].join('\n');

    await mailTransporter.sendMail({
        from: emailFrom,
        to: emailTo,
        subject,
        text
    });
}

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
                    sendTaskEmail(task)
                        .then(() => {
                            console.log(`Email sent to ${emailTo}`);
                            channel.ack(message);
                        })
                        .catch((err) => {
                            console.error('Failed to send email notification', err);
                            channel.nack(message, false, true);
                        });
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
