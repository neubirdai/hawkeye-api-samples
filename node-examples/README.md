# Hawkeye API Node.js Examples

This directory contains Node.js examples demonstrating how to interact with the Hawkeye REST API. The project includes a utils folder which contains some API wrapper utility functions to make the samples easier to understand and work with. 


## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Copy `.env_example` to `.env`
   - Edit `.env` to add your Hawkeye API credentials

## Environment Variables

The following environment variables are used by the examples:

| Variable | Description | Required |
|----------|-------------|----------|
| HAWKEYE_API_URL | The URL of the Hawkeye API | Yes |
| HAWKEYE_EMAIL | Your Hawkeye account email | Yes |
| HAWKEYE_PASSWORD | Your Hawkeye account password | Yes |
| STREAM_RESPONSE | Stream response in real-time (true/false) | No |

## Available Examples



### List Projects
This example is the simplest and lists all projects configured in the Hawkeye deployment which is configured in your .env file. 

```
node list-projects.js
```


### List Sessions
This examples builds on the previous example and allows the user to pick a project, lits the sessions, and finally inspect the analysis for any session in the list.

```
node list-sessions.js
```

### Create Session
This example shows how to use the API to programatically create a session in Hawkeye and retrieve it's analysis in real-time.

```
node create-session.js
```

