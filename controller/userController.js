require('dotenv').config();
const dbConnection = require('../db/dbConfig');
const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

async function register(req, res) {
  // Logic for user registration
  const { username, firstname, lastname, email, password } = req.body;
  try {

    const [user] = await dbConnection.query(
      'select username, userId from users where username=? && email=?',
      [username, email]
    );
    if (user.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        error: 'Conflict',
        msg: 'User already existed',
      });
    }

    const [userEmail] = await dbConnection.query(
      'select email, userId from users where email=?',
      [email]
    );
    if (userEmail.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        error: 'Conflict',
        msg: 'User E-Mail already existed',
      });
    }

        const [userName] = await dbConnection.query(
      'select username, userId from users where username=?',
      [username]
    );
    if (userName.length > 0) {
      return res.status(StatusCodes.CONFLICT).json({
        error: 'Conflict',
        msg: 'User Name already existed',
      });
    }

    if (!username || !email || !firstname || !lastname || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Bad Request',
        msg: 'Please, provide full information',
      });
    }
    if (password.length < 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: 'password length should be at least 8 character',
      });
    }
    const genString = await bcrypt.genSalt(10);
    const hashedPswrd = await bcrypt.hash(password, genString);

    await dbConnection.query(
      `INSERT INTO users (username, firstname, lastname, email, password) VALUES (?, ?, ?, ?, ?)`,
      [username, firstname, lastname, email, hashedPswrd]
    );
    
    return res
      .status(StatusCodes.CREATED)
      .json({ msg: 'User registered successfully' });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Server Error',
      msg: error.message,
    });
  }
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: 'Bad Request',
      msg: 'Please provide all required fields!',
    });
  }
  try {
    const [user] = await dbConnection.query(
      'SELECT userid, username, password, firstname FROM users WHERE email = ?',
      [email]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        msg: 'Invalid credential',
      });
    }

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        error: 'Unauthorized',
        msg: 'Invalid password',
      });
    }

    const username = user[0].username;
    const userid = user[0].userid;
    const firstname = user[0].firstname;
    const token = jwt.sign({ username, userid }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(StatusCodes.OK).json({
      msg: 'User login successful',
      token,
      user: {
        username,
        firstname,
        userid,
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: 'Server error' });
    console.error(err.message);
  }
}

async function checkUser(req, res) {
  // Logic to check user status
  const { username, userid } = req.user; // Extract user info from request object

  res
    .status(StatusCodes.OK)
    .json({ msg: 'User is authenticated', username, userid });
}

// Reset password
async function resetPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: 'Please provide an email address',
    });
  }

  try {
    const [user] = await dbConnection.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: 'User not found with this email',
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save the hashed token and expiration time in the database
    const expirationTime = new Date(Date.now() + 3600000); // Token valid for 1 hour
    await dbConnection.query(
      'UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE email = ?',
      [hashedToken, expirationTime, email]
    );

    // Send email with reset link
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, 
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
              <a href="${resetLink}" target="_blank">${resetLink}</a>
              <p>If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(StatusCodes.OK).json({
      msg: 'Password reset link sent to your email',
    });
  } catch (error) {
    console.error(error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: 'Server error',
    });
  }
}

async function verifyResetToken(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: 'Please provide a valid token and new password',
    });
  }

  if (newPassword.length < 8) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: 'Password should be at least 8 characters',
    });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [user] = await dbConnection.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > ?',
      [hashedToken, new Date()]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        msg: 'Invalid or expired reset token',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await dbConnection.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE reset_token = ?',
      [hashedPassword, hashedToken]
    );

    return res.status(StatusCodes.OK).json({
      msg: 'Password updated successfully',
    });
  } catch (error) {
    console.error(error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: 'Server error',
    });
  }
}

module.exports = { register, loginUser, checkUser, resetPassword, verifyResetToken };
