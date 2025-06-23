const express = require('express');
const router = express.Router();


const {
  register,
  loginUser,
  checkUser,
  resetPassword,
  verifyResetToken,
} = require('../controller/userController');
const authMiddleware = require('../middleware/authMiddleware');

//register route
router.post('/register', register);

//login route
router.post('/login', loginUser);

//user check router
router.get('/check', authMiddleware, checkUser);

// password reset
router.post('/reset-password', resetPassword);

// Verify reset token and update password
router.post('/verify-reset-token', verifyResetToken);

module.exports = router;
