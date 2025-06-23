require('dotenv').config();
const express = require('express');
const cors = require('cors');
// db connection
const dbConnection = require('./db/dbConfig');

// authentication middleware
const authMiddleware = require('./middleware/authMiddleware');

// Initialize Express
const app = express();
const port = 8000;

// Middleware
app.use(cors());
//json middleware to extract json data
app.use(express.json());

// Test the backend listening
app.get('/', (req, res) => {
  res.send('Welcome to the Evangadi Forum API');
});

// Table creation route
const setupRoute = require('./routes/setupRoute');
app.use('/api/setup', setupRoute);

// User routes middleware
const userRoutes = require('./routes/userRoute');
app.use('/api/users', userRoutes);

// Question routes middleware
const questionRoutes = require('./routes/questionRoute');
app.use('/api/questions', authMiddleware, questionRoutes);

// Answer routes middleware
const answerRoutes = require('./routes/answerRoute');
app.use('/api/answers', authMiddleware, answerRoutes);

async function start() {
  try {
    const res = await dbConnection.execute("SELECT 'test'");
    app.listen(port, () => {
      console.log(`✅ Server is running on https://forumbackend.even.com`);
    });
    console.log('✅ Successfully connected to MySQL Database');
  } catch (error) {
    console.error('❌ Error setting up the server:', error.message);
  }
}

start();
