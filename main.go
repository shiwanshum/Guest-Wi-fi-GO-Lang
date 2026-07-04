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
	// Initialize Database
	models.InitDB("./guest-wifi.db")

	// Initialize NATS & Worker
	services.InitNATS()

	// Serve Static Files
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Captive Portal Routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "./static/portal.html")
	})

	http.HandleFunc("/api/register", handlers.RegisterHandler)
	http.HandleFunc("/api/verify", handlers.VerifyHandler)

	// Admin Panel Routes
	http.HandleFunc("/admin", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./static/admin.html")
	})
	
	http.HandleFunc("/api/admin/sessions", handlers.AdminSessionsHandler)
	http.HandleFunc("/api/admin/networks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetNetworksHandler(w, r)
		} else if r.Method == http.MethodPost {
			handlers.CreateNetworkHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server started on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
