package main

import (
	"log"
	"net/http"
	"os"

	"guest-wifi-portal/handlers"
	"guest-wifi-portal/models"
	"guest-wifi-portal/services"
)

func main() {
	// Initialize Database (store in /data volume to avoid shadowing /app)
	models.InitDB("/data/guest-wifi.db")

	// Initialize NATS & Worker
	services.InitNATS()

	// ---------------------------------------------------------
	// 1. Portal Server Mux (Guest Wi-Fi Registration)
	// ---------------------------------------------------------
	portalMux := http.NewServeMux()
	fs := http.FileServer(http.Dir("./static"))
	portalMux.Handle("/static/", http.StripPrefix("/static/", fs))

	portalMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "./static/portal.html")
	})
	portalMux.HandleFunc("/api/register", handlers.RegisterHandler)
	portalMux.HandleFunc("/api/verify", handlers.VerifyHandler)

	// ---------------------------------------------------------
	// 2. Admin Server Mux (Dashboard & Virtual Switch)
	// ---------------------------------------------------------
	adminMux := http.NewServeMux()
	adminMux.Handle("/static/", http.StripPrefix("/static/", fs))

	adminMux.HandleFunc("/admin", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/admin.html")
	})
	
	adminMux.HandleFunc("/api/admin/sessions", handlers.AdminSessionsHandler)
	adminMux.HandleFunc("/api/admin/networks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetNetworksHandler(w, r)
		} else if r.Method == http.MethodPost {
			handlers.CreateNetworkHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// ---------------------------------------------------------
	// Start Servers
	// ---------------------------------------------------------
	portalPort := os.Getenv("PORT")
	if portalPort == "" {
		portalPort = "8080"
	}

	adminPort := os.Getenv("ADMIN_PORT")
	if adminPort == "" {
		adminPort = "8081"
	}

	go func() {
		log.Printf("Admin Server started on :%s", adminPort)
		if err := http.ListenAndServe(":"+adminPort, adminMux); err != nil {
			log.Fatalf("Admin server failed: %v", err)
		}
	}()

	log.Printf("Portal Server started on :%s", portalPort)
	if err := http.ListenAndServe(":"+portalPort, portalMux); err != nil {
		log.Fatalf("Portal server failed: %v", err)
	}
}
