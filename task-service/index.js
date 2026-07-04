const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const port = process.env.PORT || 3001;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasks';
const amqp = require('amqplib');
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://127.0.0.1:5672';


const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    userId: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const Task = mongoose.model("Task", taskSchema)

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.json({ status: 'task-service is running' })
})

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end()
})

async function connectWithRetry(retries = 5, delayMs = 3000) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            await mongoose.connect(mongoUri)
            console.log('Connected to MongoDB')
            return
        } catch (err) {
            console.error(`Error connecting to MongoDB (attempt ${attempt}/${retries})`, err)
            if (attempt === retries) {
                throw err
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }
}

async function startServer() {
    try {
        await connectWithRetry()
        app.listen(port, () => {
            console.log(`task-service listening on port ${port}`);
        })
    } catch (err) {
        console.error('Server failed to start', err)
        process.exit(1)
    }
}

async function publishTaskCreated(task, retries = 5, delayMs = 3000) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        let connection;
        try {
            connection = await amqp.connect(rabbitmqUrl);
            const channel = await connection.createConfirmChannel();
            await channel.assertQueue('task_created', { durable: true });

            const sent = channel.sendToQueue(
                'task_created',
                Buffer.from(JSON.stringify(task)),
                { persistent: true }
            );

            if (!sent) {
                throw new Error('RabbitMQ write buffer is full');
            }

            await channel.waitForConfirms();
            console.log('Task created notification sent');
            return;
        } catch (err) {
            console.error(`Error publishing task_created message (attempt ${attempt}/${retries})`, err);
            if (attempt === retries) {
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        } finally {
            if (connection) {
                await connection.close().catch(() => {});
            }
        }
    }
}

app.post('/tasks', async (req, res) => {
    const { title, description, userId } = req.body
    try {
        const task = new Task({ title, description, userId })
        await task.save()

        try {
            await publishTaskCreated(task)
        } catch (publishErr) {
            console.error('Failed to publish task_created event', publishErr)
            return res.status(502).json({
                error: 'Task saved, but RabbitMQ notification failed',
                task
            })
        }

        res.status(201).json(task)
    }
    catch (err) {
        console.log("Error in creating task", err);
        res.status(500).json("error in creating task")

    }
})

app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().lean()
        res.status(200).json(tasks)
    }
    catch (err) {
        console.log("Error in fetching task", err);
        res.status(500).json("error in fetching tasks")

    }
})

startServer()

