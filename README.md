# Notification Service

A serverless notification service built with AWS Lambda, DynamoDB, SQS, EventBridge, and Scheduler for sending birthday notifications based on user timezones.

## Features

- User management (create, get, delete)
- Birthday notification scheduling with timezone support
- Event-driven architecture using SQS and EventBridge
- TypeScript support with proper type definitions

## Tech Stack

- **Framework**: Serverless Framework
- **Runtime**: Node.js 20.x
- **Language**: TypeScript
- **Database**: DynamoDB
- **Message Queue**: SQS
- **Event Bus**: EventBridge
- **Scheduler**: AWS EventBridge Scheduler
- **Email**: SES
- **SMS**: SNS
- **Build Tool**: esbuild

## Prerequisites

- Node.js 20.x or higher
- AWS CLI configured
- Serverless Framework CLI

## Installation

```bash
npm install
```

## Local Development

### Serverless Offline

To run the service locally for development:

```bash
# Start offline server with default stage
npm run offline
```

### Dynamo DB
- Java is required for local dynamodb. Download JRE and JDK from here: https://www.oracle.com/ph/java/technologies/downloads/
- Test dynamodb configurations by running `sls dynamodb start --stage dev` and see if it build successfully
- If dynamodb is unable to connect, try running `sls dynamodb install`

The service will be available at:
- **API Gateway**: http://localhost:3000
- **Lambda Functions**: http://localhost:3002

### Environment Variables

For local development, you can set environment variables in a `.env` file:

```env
STAGE=dev
AWS_ACCOUNT_ID=123456789012 // Ensure this matches your currently configured AWS profile
AWS_REGION=us-east-1
BIRTHDAY_NOTIFICATION_HOUR=9
BIRTHDAY_NOTIFICATION_MINUTE=0
PIPEDREAM_BASE_URL: 'https://eo2m8xnkmbeonic.m.pipedream.net'
```

## API Endpoints

### Users

- `POST /user` - Create a new user
- `GET /user/{userId}` - Get user by ID
- `DELETE /user/{userId}` - Delete user

### Example Usage

```bash
# Create a user
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "birthDate": "1990-05-15",
    "timezoneLocation": "America/New_York"
  }'

# Get a user
curl http://localhost:3000/user/user123

# Delete a user
curl -X DELETE http://localhost:3000/user/user123
```

## Lambda Functions

### User Management Functions

1. **createUser** (`src/functions/user/create-user.ts`)
   - **Trigger**: HTTP POST /user
   - **Purpose**: Creates a new user in DynamoDB
   - **Input**: User data (firstName, lastName, birthDate, timezoneLocation)

2. **getUser** (`src/functions/user/get-user.ts`)
   - **Trigger**: HTTP GET /user/{userId}
   - **Purpose**: Retrieves user data from DynamoDB
   - **Input**: userId path parameter

3. **deleteUser** (`src/functions/user/delete-user.ts`)
   - **Trigger**: HTTP DELETE /user/{userId}
   - **Purpose**: Deletes user from DynamoDB
   - **Input**: userId path parameter

### Event Processing Functions

4. **processUserUpdates** (`src/functions/process-user-updates.ts`)
   - **Trigger**: SQS queue (UserUpdateQueue)
   - **Purpose**: Processes DynamoDB stream events for user changes
   - **Actions**:
     - Creates EventBridge Scheduler schedules for new users
     - Updates schedules when user birthDate or timezoneLocation changes
     - Deletes schedules when users are deleted
   - **Input**: DynamoDB stream events via SQS

### Notification Functions

5. **sendGreeting** (`src/functions/notification/send-greeting.ts`)
   - **Trigger**: EventBridge Scheduler
   - **Purpose**: Sends birthday notifications to pipedream
   - **Actions**:
     - Sends user data to pipedream
   - **Input**: Scheduled event with user data

## Architecture

The service uses an event-driven architecture:

1. **User Management**: REST API endpoints for CRUD operations on users
2. **Event Processing**: DynamoDB streams capture user changes and send them to SQS
3. **Scheduling**: EventBridge Scheduler creates birthday notifications based on user timezone

### Data Flow

**Ideal Flow:**
![Birthday Greeting - Ideal](./docs/Birthday%20Greeting%20-%20Ideal.png)

This is the ideal implementation given the requirement, reducing single points of failures in the application and adding resiliency and flexibility

1. It starts when the `POST /user` API Gateway is called
2. The lambda `createUsers` is called to add the new user in the Dynamodb `Users` table
3. The `Users` table has a DynamodbStream that is triggered on every change.
4. Using the EventBridge Pipes, the new user data is inserted in SQS `UsersUpdatedQueue`
5. The `processUserUpdates` lambda is called with batching as new events are inserted in the SQS. This lambda deletes the SQS message once it is successfully processed.
6. The `processUserUpdates` lambda uses the EventBridge Scheduler to schedule the birthday greeting
7. The scheduler will input events in an SQS which will be consumed by the `sendGreeting` lambda or the `sendAnniversary` lambda
8. The lambdas will then call the pipedream APIs

**Current Implementation:**
![Birthday Greeting - Implemented](./docs/Birthday%20Greeting%20-%20Impemented.png)

To reduce scope, the currently implemented code has no `sendAnniversary` handling and reduced SQS handling like DLQs

**Offline Development:**
![Birthday Greeting - Offline](./docs/Birthday%20Greeting%20-%20Offline.png)

Due to the limitation of `serverless offline`, specifically for the offline version of SQS, some processes were removed or skipped.

**Offline Workaround Development:**
![Birthday Greeting - Offline Workaround](./docs/Birthday%20Greeting%20-%20Offline%20Workaround.png)

I wasn't able to fix the role permission I'm getting for the EventBridge Scheduler Serverless Offline in time. So I've done a workaround that uses polling. A lambda runs every 0th and 30th minute, checking for users with birthdays on the current date.

### Key Components

- **DynamoDB Table**: Stores user data with stream enabled
- **SQS Queue**: Processes user update events with dead letter queue
- **EventBridge Pipe**: Connects DynamoDB stream to SQS
- **EventBridge Scheduler**: Creates timezone-aware birthday schedules

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Linting

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint:fix
``` 