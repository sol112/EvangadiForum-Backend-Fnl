const express = require('express');
const router = express.Router();
const { createdbTable } = require('../db/migrate');

router.get('/create-tables', createdbTable);

module.exports = router;
