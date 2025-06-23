const dbConnection = require("../db/dbConfig");

const { StatusCodes } = require("http-status-codes");

async function postAnswers(req, res) {
  const userId = req.user.userid;
  const { answer, questionid } = req.body;
  if (!answer) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Bad Request",
      msg: "Please provide answer",
    });
  }
  try {
    await dbConnection.query(
      "INSERT INTO answers(userid, questionid, answer) VALUES (?, ?, ?)",
      [userId, questionid, answer]
    );
    res.status(StatusCodes.CREATED).json({
      msg: "Answer posted successfully",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      msg: "An unexpected error occurred",
    });
  }
}

async function getAllAnswer(req, res) {
  const questionId = req.params.question_id;
  const userId = req.user.userid; // Get the logged-in user's ID

  try {
    const [results] = await dbConnection.query(
      `SELECT 
        answers.answerid,
        answers.answer AS content,
        users.username,
        users.userid,
        answers.created_at,
        answers.likes,
        answers.dislikes,
        users.firstname,
        (SELECT vote_type FROM answer_votes WHERE answer_votes.answerid = answers.answerid AND answer_votes.userid = ?) AS userVote
      FROM answers
      JOIN users ON answers.userid = users.userId
      WHERE answers.questionid = (
        SELECT questionid FROM questions WHERE id = ?
      )`,
      [userId, questionId]
    );

    // Handle case where no answers are found
    if (results.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'The requested answer could not be found',
      });
    }

    res.status(StatusCodes.OK).json({ answer: results });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

async function deleteAnswer(req, res) {
  const userId = req.user.userid; // Get the logged-in user's ID
  const answerId = req.params.id; // Get the answer ID from the route

  try {
    const [answer] = await dbConnection.query(
      'SELECT userid FROM answers WHERE answerid = ?',
      [answerId]
    );

    if (answer.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'Answer not found',
      });
    }

    if (answer[0].userid !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Forbidden',
        msg: 'You are not authorized to delete this answer',
      });
    }

    await dbConnection.query('DELETE FROM answers WHERE answerid = ?', [answerId]);

    res.status(StatusCodes.OK).json({ msg: 'Answer deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

async function voteAnswer(req, res) {
  const userId = req.user.userid;
  const answerId = req.params.id;
  const { voteType } = req.body; // "upvote" or "downvote"

  if (!["upvote", "downvote"].includes(voteType)) {
    return res.status(400).json({ msg: "Invalid vote type" });
  }

  try {
    const [existingVote] = await dbConnection.query(
      "SELECT vote_type FROM answer_votes WHERE userid = ? AND answerid = ?",
      [userId, answerId]
    );

    if (existingVote.length > 0) {
      const currentVote = existingVote[0].vote_type;

      if (currentVote === voteType) {
        // User clicked the same vote again → remove it
        await dbConnection.query(
          "DELETE FROM answer_votes WHERE userid = ? AND answerid = ?",
          [userId, answerId]
        );

        const column = voteType === "upvote" ? "likes" : "dislikes";
        await dbConnection.query(
          `UPDATE answers SET ${column} = ${column} - 1 WHERE answerid = ?`,
          [answerId]
        );

        return res.status(200).json({ msg: `${voteType} removed` });
      } else {
        // User switched vote (upvote ⇄ downvote)
        await dbConnection.query(
          "UPDATE answer_votes SET vote_type = ? WHERE userid = ? AND answerid = ?",
          [voteType, userId, answerId]
        );

        const addColumn = voteType === "upvote" ? "likes" : "dislikes";
        const removeColumn = voteType === "upvote" ? "dislikes" : "likes";

        await dbConnection.query(
          `UPDATE answers SET ${addColumn} = ${addColumn} + 1, ${removeColumn} = ${removeColumn} - 1 WHERE answerid = ?`,
          [answerId]
        );

        return res.status(200).json({ msg: `Vote changed to ${voteType}` });
      }
    } else {
      // First time voting
      await dbConnection.query(
        "INSERT INTO answer_votes (userid, answerid, vote_type) VALUES (?, ?, ?)",
        [userId, answerId, voteType]
      );

      const column = voteType === "upvote" ? "likes" : "dislikes";
      await dbConnection.query(
        `UPDATE answers SET ${column} = ${column} + 1 WHERE answerid = ?`,
        [answerId]
      );

      return res.status(200).json({ msg: `${voteType} added` });
    }
  } catch (error) {
    console.error("Vote error:", error.message);
    return res.status(500).json({ msg: "Server error while voting" });
  }
}




async function editAnswer(req, res) {
  const userId = req.user.userid; // Get the logged-in user's ID
  const answerId = req.params.id; // Get the answer ID from the route
  const { content } = req.body; // Get the new content for the answer

  if (!content || !content.trim()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      msg: 'Answer content cannot be empty',
    });
  }

  try {
    // Check if the answer exists and belongs to the logged-in user
    const [answer] = await dbConnection.query(
      'SELECT userid FROM answers WHERE answerid = ?',
      [answerId]
    );

    if (answer.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'Answer not found',
      });
    }

    if (answer[0].userid !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Forbidden',
        msg: 'You are not authorized to edit this answer',
      });
    }

    // Update the answer content
    await dbConnection.query(
      'UPDATE answers SET answer = ? WHERE answerid = ?',
      [content, answerId]
    );

    res.status(StatusCodes.OK).json({
      msg: 'Answer updated successfully',
    });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

// Add a comment to an answer
async function addComment(req, res) {
  const userId = req.user.userid; // Get the logged-in user's ID
  const answerId = req.params.answerId; // Get the answer ID from the route
  const { content } = req.body; // Get the comment content

  if (!content || !content.trim()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      msg: 'Comment content cannot be empty',
    });
  }

  try {
    await dbConnection.query(
      'INSERT INTO comments (answerid, userid, content) VALUES (?, ?, ?)',
      [answerId, userId, content]
    );

    res.status(StatusCodes.CREATED).json({
      msg: 'Comment added successfully',
    });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

// Get all comments for an answer
async function getComments(req, res) {
  const answerId = req.params.answerId; // Get the answer ID from the route

  try {
    const [comments] = await dbConnection.query(
      `SELECT 
        comments.commentid,
        comments.content,
        comments.created_at,
        users.username,
        users.userid
      FROM comments
      JOIN users ON comments.userid = users.userid
      WHERE comments.answerid = ?`,
      [answerId]
    );

    res.status(StatusCodes.OK).json({ comments });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

// Delete a comment
async function deleteComment(req, res) {
  const userId = req.user.userid; // Get the logged-in user's ID
  const commentId = req.params.commentId; // Get the comment ID from the route

  try {
    const [comment] = await dbConnection.query(
      'SELECT userid FROM comments WHERE commentid = ?',
      [commentId]
    );

    if (comment.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Not Found',
        msg: 'Comment not found',
      });
    }

    if (comment[0].userid !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'Forbidden',
        msg: 'You are not authorized to delete this comment',
      });
    }

    await dbConnection.query('DELETE FROM comments WHERE commentid = ?', [commentId]);

    res.status(StatusCodes.OK).json({ msg: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      msg: 'An unexpected error occurred',
    });
  }
}

module.exports = {
  postAnswers,
  getAllAnswer,
  deleteAnswer,
  voteAnswer,
  editAnswer,
  addComment,
  getComments,
  deleteComment,
};
