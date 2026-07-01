const { webcrypto } = require('node:crypto');

if (!global.crypto) {
    global.crypto = webcrypto;
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const port = 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:27017/users';

const userSchema = new mongoose.Schema({
    name: String,
    email: String
})
const User = mongoose.model('User', userSchema)

app.get('/', (req, res) => {
    res.send('hellooo...')
})

app.use(bodyParser.json())

app.post('/users', async (req, res) => {
    const { name, email } = req.body;
    try {
        const user = new User({ name, email })
        await user.save()
        res.status(201).json(user)
    }
    catch (err) {
        console.log("Error in saving", err);
        res.status(501).json("error in saving")

    }
})

app.get("/users", async (req, res) => {
    try {
        const users = await User.find().lean()
        res.json(users)
    } catch (err) {
        console.error("Error fetching users", err)
        res.status(500).json({ error: "error fetching users" })
    }
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
            console.log(`Example app listening on port ${port}`);
        })
    } catch (err) {
        console.error('Server failed to start', err)
        process.exit(1)
    }
}

startServer()