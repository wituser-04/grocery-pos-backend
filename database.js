const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'grocery.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Auto-create products table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_per_unit REAL NOT NULL,
      unit TEXT NOT NULL,
      stock REAL NOT NULL DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Products table ready');
    }
  });
});

function addProduct(name, price_per_unit, unit, stock) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO products (name, price_per_unit, unit, stock) VALUES (?, ?, ?, ?)`,
      [name, price_per_unit, unit, stock],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, name, price_per_unit, unit, stock });
        }
      }
    );
  });
}

function searchProductByName(name) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM products WHERE name LIKE ?`,
      [`%${name}%`],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// Close database on app exit (call this when needed)
function closeDb() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
}

module.exports = {
  addProduct,
  searchProductByName,
  closeDb
};

