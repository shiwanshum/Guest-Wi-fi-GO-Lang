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

	_, err = DB.Exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA foreign_keys = ON;
	`)
	if err != nil {
		log.Fatalf("Error enabling WAL mode: %v", err)
	}

	createTablesQuery := `
	CREATE TABLE IF NOT EXISTS guest_sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		email TEXT,
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

	CREATE TABLE IF NOT EXISTS networks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		port_num INTEGER NOT NULL UNIQUE,
		port_mode TEXT NOT NULL DEFAULT 'access',
		bandwidth_limit INTEGER DEFAULT 0,
		vip_ips TEXT,
		vlan_id INTEGER NOT NULL,
		ip_range TEXT NOT NULL,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err = DB.Exec(createTablesQuery)
	if err != nil {
		log.Fatalf("Error creating tables: %v", err)
	}
	log.Println("Database initialized successfully.")
}
