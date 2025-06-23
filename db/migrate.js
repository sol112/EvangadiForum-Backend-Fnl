const fs = require('fs');
const path = require('path');
const dbConnection = require('./dbConfig');

async function createdbTable(req, res) {
  try {
    const sqlPath = path.join(__dirname, '../sql', 'create_schema.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf-8');

    await dbConnection.query(sqlScript);
    res.send('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error.message);
    res.status(500).send('Error creating tables');
  }
}

module.exports = { createdbTable };
