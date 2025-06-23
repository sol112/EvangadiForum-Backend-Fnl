const { StatusCodes } = require('http-status-codes');
const dbConnection = require('../db/dbConfig');
const { v4: uuidv4 } = require('uuid');

async function postQuestion(req, res) {
  const userId = req.user.userid;

  const questionid = uuidv4();

  const { title, description, tag } = req.body;
  if (!title || !description) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      msg: 'Please provide all required fields',
    });
  }

  try {
    await dbConnection.query(
      'INSERT INTO questions (userid, questionid, title, description, tag) VALUES (?, ?, ?, ?, ?)',
      [userId, questionid, title, description, tag]
    );
    res
      .status(StatusCodes.CREATED)
      .json({ msg: 'Question created successfully', questionid });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
    });
  }
}

async function getAllQuestions(req, res) {
  const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters
  const offset = (page - 1) * limit; // Calculate offset for pagination

  try {
    const [results] = await dbConnection.query(`
      SELECT 
        questions.id AS question_id,
        questions.title,
        questions.tag,
        questions.userid,
        questions.description AS content,
        users.username,
        questions.created_at,
        users.firstname
      FROM questions
      JOIN users ON questions.userid = users.userid
      ORDER BY questions.id DESC
      LIMIT ? OFFSET ?`,    
      [parseInt(limit), parseInt(offset)]
    );

    // const [totalCount] = await dbConnection.query(
    //   `SELECT COUNT(*) AS total FROM questions`
    // );

    // Handle case where no questions are found
    if (!results || results.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: 'No questions found',
      });
    }

    // Return the fetched questions
    res.status(StatusCodes.OK).json({ questions: results });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred.',
    });
  }
  // res.send("all question here");
}

async function getSingleQuestion(req, res) {
  const questionId = req.params.id; // Extract question ID from route parameter
  try {
    const [results] = await dbConnection.query(
        `SELECT 
          questions.id,
          questions.questionid,
          questions.title,
          questions.userid,
          questions.description AS content,
          questions.tag,
          questions.created_at,
          users.username
        FROM questions
        JOIN users ON questions.userid = users.userid
        WHERE questions.id = ?`,
      [questionId]
    );

    // Handle case where the question does not exist
    if (results.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'The requested question could not be found',
      });
    }

    // Return the fetched question
    res.status(StatusCodes.OK).json({ question: results[0] });
  } catch (error) {
    console.error('Database query error:', error.stack);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

async function editQuestion(req, res) {
  const userId = req.user.userid; // Get the logged-in user's ID
  const questionId = req.params.id; // Get the question ID from the route
  const { title, description } = req.body; // Get the updated title from the request body

  if (!title || !description) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      msg: 'Title is required',
    });
  }

  try {
    const [question] = await dbConnection.query(
      'SELECT userid FROM questions WHERE id = ?',
      [questionId]
    );

    if (question.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'Question not found',
      });
    }

    if (question[0].userid !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Forbidden',
        msg: 'You are not authorized to edit this question',
      });
    }

    await dbConnection.query(
      'UPDATE questions SET title = ?, description = ? WHERE id = ?',
      [title, description, questionId]
    );

    res.status(StatusCodes.OK).json({ msg: 'Question updated successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

async function deleteQuestion(req, res) {
  const userId = req.user.userid; // Get the logged-in user's ID
  const questionId = req.params.id; // Get the question ID from the route

  try {
    const [question] = await dbConnection.query(
      'SELECT userid FROM questions WHERE id = ?',
      [questionId]
    );

    if (question.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'Question not found',
      });
    }

    if (question[0].userid !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Forbidden',
        msg: 'You are not authorized to delete this question',
      });
    }

    await dbConnection.query('DELETE FROM questions WHERE id = ?', [
      questionId,
    ]);
    await dbConnection.query("DELETE FROM questions WHERE id = ?", [
      questionId,
    ]);
    res.status(StatusCodes.OK).json({ msg: 'Question deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

module.exports = {
  postQuestion,
  getAllQuestions,
  getSingleQuestion,
  editQuestion,
  deleteQuestion,
};
