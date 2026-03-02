// src/seed.js
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

// Open or create the database
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) console.error(err);
  else console.log("Database connected");
});

// Hash a password
const seedUser = async () => {
  const passwordHash = await bcrypt.hash("123456", 10); // password: 123456
  const email = "test@example.com";

  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT)",
    (err) => {
      if (err) console.error(err);
      else {
        // Insert user
        db.run(
          "INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)",
          [email, passwordHash],
          (err) => {
            if (err) console.error(err);
            else console.log(`User seeded: ${email} / 123456`);
            db.close();
          }
        );
      }
    }
  );
};

seedUser();