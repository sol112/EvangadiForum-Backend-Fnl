const dbConnection = require("../db/dbConfig")
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  postAnswers,
  deleteAnswer,
  getAllAnswer,
  voteAnswer,
  editAnswer,
  addComment,
  getComments,
  deleteComment
} = require('../controller/answersController');

router.post('/postanswer', postAnswers);

router.get('/:question_id', getAllAnswer);

router.delete('/delete/:id', deleteAnswer);

router.put('/edit/:id',  editAnswer);

router.post('/vote/:id',voteAnswer);

router.post('/comments/:answerId', addComment); // Add a comment
router.get('/comments/:answerId', getComments); // Get all comments for an answer
router.delete('/comments/:commentId', deleteComment); // Delete a comment

module.exports = router;



 
// answerRoute.js


// const express = require("express");
// const router = express.Router();
// const { postAnswers, getAllAnswer } = require("../controllers/answerController");
// const authenticate = require("../middleware/authenticate"); // If you have authentication

// // Get all answers for a question
// router.get("/:question_Id", getAllAnswer);

// // Post a new answer (protected route)
// router.post("/", authenticate, postAnswers);

// module.exports = router;