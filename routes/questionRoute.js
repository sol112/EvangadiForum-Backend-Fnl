const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware")

const {
  getAllQuestions,
  postQuestion,
  getSingleQuestion,
  editQuestion,
  deleteQuestion,
} = require('../controller/questionController');
router.post("/post-questions", authMiddleware, postQuestion);

router.put('/edit/:id', authMiddleware, editQuestion);

router.delete('/delete/:id', authMiddleware, deleteQuestion);

router.get("/all-questions", authMiddleware, getAllQuestions);

router.get('/:id', authMiddleware, getSingleQuestion);

module.exports = router;