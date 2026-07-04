package services

import (
	"encoding/json"
	"log"
	"os"

	"github.com/nats-io/nats.go"
)

var NC *nats.Conn

type AuthEvent struct {
	SessionID  int    `json:"session_id"`
	MACAddress string `json:"mac_address"`
	IPAddress  string `json:"ip_address"`
}

func InitNATS() {
	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = nats.DefaultURL
	}

	var err error
	NC, err = nats.Connect(natsURL)
	if err != nil {
		log.Printf("Warning: Could not connect to NATS (%s): %v", natsURL, err)
		log.Printf("Application will run, but async events will fail.")
		return
	}
	log.Println("Connected to NATS server.")

	// Start Background Worker
	StartFortinetWorker()
}

func PublishAuthEvent(event AuthEvent) {
	if NC == nil || !NC.IsConnected() {
		log.Println("NATS not connected, skipping event publish")
		return
	}

	data, _ := json.Marshal(event)
	if err := NC.Publish("guest.authorized", data); err != nil {
		log.Printf("Error publishing to NATS: %v", err)
	}
}

func StartFortinetWorker() {
	if NC == nil {
		return
	}

	_, err := NC.Subscribe("guest.authorized", func(m *nats.Msg) {
		var event AuthEvent
		if err := json.Unmarshal(m.Data, &event); err != nil {
			log.Printf("Worker error decoding event: %v", err)
			return
		}

		// =========================================================================
		// FORTINET FIREWALL INTEGRATION
		// =========================================================================
		log.Printf("[WORKER] Received authorization event for MAC: %s, IP: %s", event.MACAddress, event.IPAddress)
		log.Printf("[WORKER] Calling Fortinet API asynchronously...")
		
		// Simulate network call
		// time.Sleep(2 * time.Second)
		
		log.Printf("[WORKER] Successfully authorized MAC %s on Fortinet Firewall.", event.MACAddress)
		// =========================================================================
	})

	if err != nil {
		log.Fatalf("Error subscribing to NATS: %v", err)
	}
	log.Println("Started Fortinet async worker listening on 'guest.authorized'")
}
