const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const port = process.env.PORT || 3001;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasks';



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

app.post('/tasks', async (req, res) => {
    const { title, description, userId } = req.body
    try {
        const task = new Task({ title, description, userId })
        await task.save()
        res.status(201).json(task)
    }
    catch (err) {
        console.log("Error in creating task", err);
        res.status(501).json("error in creating task")

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

