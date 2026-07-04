package models

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB(dsn string) {
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}

	for i := 0; i < 10; i++ {
		err = DB.Ping()
		if err == nil {
			break
		}
		log.Printf("Waiting for postgres... (%v)", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Error pinging database after retries: ", err)
	}

	log.Println("Database initialized successfully.")
}
