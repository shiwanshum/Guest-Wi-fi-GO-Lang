package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"regexp"
	"strings"
	"time"

	"guest-wifi-portal/models"
	"guest-wifi-portal/services"
)

type RegisterRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Mobile  string `json:"mobile"`
	Company string `json:"company"`
	Purpose string `json:"purpose"`
}

type VerifyRequest struct {
	Mobile  string `json:"mobile"`
	OTP     string `json:"otp"`
	MAC     string `json:"mac"`
	Device  string `json:"device"`
	OS      string `json:"os"`
	Browser string `json:"browser"`
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Backend Validation Crosscheck
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	if match, _ := regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, req.Email); !match {
		http.Error(w, "Invalid email address format", http.StatusBadRequest)
		return
	}

	if match, _ := regexp.MatchString(`^\+\d{1,3}-\d{10}$`, req.Mobile); !match {
		http.Error(w, "Invalid mobile number format. Expected format: +CC-XXXXXXXXXX", http.StatusBadRequest)
		return
	}

	if req.Purpose == "" {
		http.Error(w, "Purpose of visit is required", http.StatusBadRequest)
		return
	}

	// Generate a 4-digit OTP (TEMP: Hardcoded for testing)
	// rand.Seed(time.Now().UnixNano())
	// otp := fmt.Sprintf("%04d", rand.Intn(10000))
	otp := "1234"

	// In a real application, you would send the OTP via SMS here.
	// For now, we will log it to the console for testing.
	log.Printf("================================")
	log.Printf("OTP for %s (%s): %s", req.Name, req.Mobile, otp)
	log.Printf("================================")

	session := &models.GuestSession{
		Name:    req.Name,
		Email:   req.Email,
		Mobile:  req.Mobile,
		Company: req.Company,
		Purpose: req.Purpose,
		OTP:     otp,
	}

	if err := models.CreateSession(session); err != nil {
		log.Printf("Error creating session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "OTP sent successfully"})
}

func VerifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Backend Validation Crosscheck
	if match, _ := regexp.MatchString(`^\+\d{1,3}-\d{10}$`, req.Mobile); !match {
		http.Error(w, "Invalid mobile number format", http.StatusBadRequest)
		return
	}

	// TODO: ENABLE FOR PRODUCTION
	// if match, _ := regexp.MatchString(`^\d{4}$`, req.OTP); !match {
	// 	http.Error(w, "OTP must be exactly 4 digits", http.StatusBadRequest)
	// 	return
	// }

	ip := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ip = strings.Split(forwarded, ",")[0]
	}

	sessionData := &models.GuestSession{
		MACAddress: req.MAC,
		IPAddress:  ip,
		Device:     req.Device,
		OS:         req.OS,
		Browser:    req.Browser,
	}

	session, err := models.VerifySessionOTP(req.Mobile, req.OTP, sessionData)
	if err != nil {
		log.Printf("OTP Verification failed for %s: %v", req.Mobile, err)
		http.Error(w, "Invalid OTP or session not found", http.StatusUnauthorized)
		return
	}

	// =========================================================================
	// Publish Async Event to NATS for Fortinet Firewall Integration
	// =========================================================================
	services.PublishAuthEvent(services.AuthEvent{
		SessionID:  session.ID,
		MACAddress: session.MACAddress,
		IPAddress:  session.IPAddress,
	})
	// =========================================================================

	log.Printf("Device Authorized: MAC=%s, IP=%s", session.MACAddress, session.IPAddress)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "OTP Verified",
		"session_id":   session.ID,
		"ip_address":   session.IPAddress,
		"login_time":   session.LoginTime.Format(time.RFC3339),
		"valid_hours":  2,
	})
}
