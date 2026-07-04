package models

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB(filepath string) {
	var err error
	DB, err = sql.Open("sqlite3", filepath)
	if err != nil {
		log.Fatal(err)
	}

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS guest_sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		mobile TEXT,
		company TEXT,
		purpose TEXT,
		otp TEXT,
		is_verified BOOLEAN DEFAULT FALSE,
		mac_address TEXT,
		ip_address TEXT,
		device TEXT,
		os TEXT,
		browser TEXT,
		login_time DATETIME,
		logout_time DATETIME,
		data_download INTEGER DEFAULT 0,
		data_upload INTEGER DEFAULT 0
	);
	`
	_, err = DB.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Error creating table: %v", err)
	}
	log.Println("Database initialized successfully.")
}
