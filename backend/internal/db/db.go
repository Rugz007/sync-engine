package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "sync.db")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	createTable := `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL
    );`

	_, err = DB.Exec(createTable)

	if err != nil {
		log.Fatal("Failed to ensure table exists:", err)
	}

	createTable = `CREATE TABLE IF NOT EXISTS transactions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id TEXT NOT NULL,
		operation TEXT NOT NULL,
		content TEXT,
		completed BOOLEAN DEFAULT FALSE
	);`
	_, err = DB.Exec(createTable)

	if err != nil {
		log.Fatal("Failed to ensure table exists:", err)
	}

	log.Println("Database initialized.")
}
