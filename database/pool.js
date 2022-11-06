const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "127.0.0.1",
  port: "3310",
  user: "root",
  password: "162534",
  database: "complexdb",
  connectionLimit: 10,
});

module.exports = pool;
