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
	dbDSN := os.Getenv("DB_DSN")
	if dbDSN == "" {
		dbDSN = "host=localhost user=admin password=admin dbname=guestwifi port=5432 sslmode=disable"
	}
	models.InitDB(dbDSN)

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

	// Auth routes (no token required)
	adminMux.HandleFunc("/api/admin/login", handlers.AdminLoginHandler)
	adminMux.HandleFunc("/api/admin/logout", handlers.AdminLogoutHandler)
	adminMux.HandleFunc("/api/admin/forgot-password", handlers.AdminForgotPasswordHandler)
	adminMux.HandleFunc("/api/admin/check-auth", handlers.AdminCheckAuthHandler)

	// Protected routes
	adminMux.HandleFunc("/api/admin/profile", handlers.AdminProfileHandler)
	adminMux.HandleFunc("/api/admin/sessions", handlers.AdminSessionsHandler)
	adminMux.HandleFunc("/api/admin/active-sessions", handlers.AdminActiveSessionsHandler)
	adminMux.HandleFunc("/api/admin/login-history", handlers.AdminLoginHistoryHandler)
	adminMux.HandleFunc("/api/admin/networks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetNetworksHandler(w, r)
		} else if r.Method == http.MethodPost {
			handlers.CreateNetworkHandler(w, r)
		} else if r.Method == http.MethodDelete {
			handlers.DeleteNetworkHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	adminMux.HandleFunc("/api/admin/networks/remove", handlers.DeleteNetworkHandler)

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
