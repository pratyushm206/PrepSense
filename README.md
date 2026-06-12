# PrepSense

> AI-powered mock interview platform for campus placement preparation (in development)

## What it does
PrepSense will let students practice company-specific mock interviews 
and get AI-evaluated feedback on their answers, with analytics tracking 
their improvement over time.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas + Mongoose
- **AI:** Google Gemini API (planned)
- **Auth:** JWT + bcrypt (in progress)

## Current Status
🚧 In active development — Day 13/90 of build roadmap

### Completed
- Express server with REST routing structure
- MongoDB Atlas connection
- User and Session data models

### In Progress
- Authentication system (JWT)
- AI question generation

## Run Locally
\`\`\`
git clone https://github.com/pratyushm206/PrepSense.git
cd PrepSense
npm install
# create .env file with PORT, MONGO_URI, JWT_SECRET
npm run dev
\`\`\`

## Environment Variables
- PORT
- MONGO_URI
- JWT_SECRET
- NODE_ENV