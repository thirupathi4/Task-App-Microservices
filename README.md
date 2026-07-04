# Task App

Task App is a small microservices project built with Node.js, Express, MongoDB, RabbitMQ, and Gmail notifications.

## Services

- `user-service` on `http://localhost:3000`
- `task-service` on `http://localhost:3001`
- `notification-service` listens for task events and sends email notifications
- MongoDB on `27017`
- RabbitMQ Management UI on `http://localhost:15672`

## Features

- Create and list users
- Create and list tasks
- Publish task-created events through RabbitMQ
- Send email notifications when a task is created

## Prerequisites

- Docker Desktop
- Node.js 20 or later if you want to run services locally
- A Gmail account with an app password for SMTP

## Environment Variables

Create a `.env` file in the project root using `.env.example` as a template.

Required values:

- `EMAIL_USER` - your Gmail address
- `EMAIL_PASS` - your Gmail app password
- `EMAIL_TO` - recipient email address for task notifications

## Run With Docker

Start the full stack from the project root:

```bash
docker compose up --build
```

Stop it with:

```bash
docker compose down
```

## Test APIs

Create a task with Postman:

- Method: `POST`
- URL: `http://localhost:3001/tasks`
- Headers: `Content-Type: application/json`
- Body:

```json
{
  "title": "Task-App",
  "description": "Want to build project Task-app",
  "userId": "07"
}
```

When the task is created, the task service publishes a `task_created` message to RabbitMQ and the notification service sends an email.

## Notes

- Do not commit your `.env` file.
- If you open `http://localhost:3001` in a browser, Chrome may show a probe request to `/.well-known/appspecific/com.chrome.devtools.json`; that is harmless.
