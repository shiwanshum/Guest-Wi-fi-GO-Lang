package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	net_pkg "net"
	"net/http"
	"strings"
	"sync"
	"time"

	"guest-wifi-portal/models"
)

// Simple in-memory admin auth
type AdminUser struct {
	Username string `json:"username"`
	Password string `json:"-"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

var adminUser = AdminUser{
	Username: "admin",
	Password: "admin123",
	Name:     "Shiwanshu Mishra",
	Email:    "admin@guestwifi.local",
	Role:     "Super Admin",
}

type Session struct {
	Token     string    `json:"token"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	LastSeen  time.Time `json:"last_seen"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
}

var (
	mu           sync.RWMutex
	adminToken   string
	sessions     []Session
	loginHistory []Session
)

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func AdminLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds struct {
		Username  string `json:"username"`
		Password  string `json:"password"`
		IP        string `json:"ip"`
		UserAgent string `json:"user_agent"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if creds.Username != adminUser.Username || creds.Password != adminUser.Password {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	mu.Lock()
	token := generateToken()
	adminToken = token
	now := time.Now()
	ses := Session{
		Token:     token,
		Username:  creds.Username,
		CreatedAt: now,
		LastSeen:  now,
		IP:        creds.IP,
		UserAgent: creds.UserAgent,
	}
	sessions = append(sessions, ses)
	loginHistory = append(loginHistory, ses)
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":    token,
		"user":     adminUser,
		"redirect": "/admin",
	})
}

func AdminLogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	mu.Lock()
	adminToken = ""
	// Remove current session
	for i, s := range sessions {
		if s.Token == r.Header.Get("Authorization") {
			sessions = append(sessions[:i], sessions[i+1:]...)
			break
		}
	}
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "logged_out"})
}

func AdminProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	mu.RLock()
	valid := token != "" && token == adminToken
	mu.RUnlock()

	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(adminUser)
}

func AdminForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Simulate sending email
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "If an account with that email exists, a password reset link has been sent.",
	})
}

func AdminSessionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	mu.RLock()
	valid := token != "" && token == adminToken
	mu.RUnlock()

	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	sessions, err := models.GetAllSessions()
	if err != nil {
		http.Error(w, "Failed to retrieve sessions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

func AdminActiveSessionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	mu.RLock()
	valid := token != "" && token == adminToken
	mu.RUnlock()

	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	mu.RLock()
	resp := make([]Session, len(sessions))
	copy(resp, sessions)
	mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func AdminLoginHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	mu.RLock()
	valid := token != "" && token == adminToken
	mu.RUnlock()

	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	mu.RLock()
	resp := make([]Session, len(loginHistory))
	copy(resp, loginHistory)
	mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func AdminCheckAuthHandler(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	mu.RLock()
	valid := token != "" && token == adminToken
	mu.RUnlock()

	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"authenticated": true,
		"user":          adminUser,
	})
}

func GetNetworksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	switchID := r.URL.Query().Get("switch_id")
	if switchID == "" {
		switchID = "24"
	}

	networks, err := models.GetAllNetworks(switchID)
	if err != nil {
		http.Error(w, "Failed to retrieve networks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(networks)
}

func DeleteNetworkHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SwitchID string `json:"switch_id"`
		PortNum  int    `json:"port_num"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.PortNum < 1 || req.PortNum > 48 {
		http.Error(w, "Port Number must be between 1 and 48", http.StatusBadRequest)
		return
	}

	if err := models.DeleteNetwork(req.SwitchID, req.PortNum); err != nil {
		http.Error(w, "Failed to remove network", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
}

func CreateNetworkHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var net models.Network
	if err := json.NewDecoder(r.Body).Decode(&net); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if net.SwitchID == "" {
		net.SwitchID = "24"
	}

	if net.PortNum < 1 || net.PortNum > 48 {
		http.Error(w, "Port Number must be between 1 and 48", http.StatusBadRequest)
		return
	}

	if net.PortMode != "access" && net.PortMode != "trunk" {
		http.Error(w, "Port Mode must be either 'access' or 'trunk'", http.StatusBadRequest)
		return
	}

	if net.BandwidthLimit < 0 {
		http.Error(w, "Bandwidth limit cannot be negative", http.StatusBadRequest)
		return
	}

	if net.VLANID < 1 || net.VLANID > 4095 {
		http.Error(w, "VLAN ID must be between 1 and 4095", http.StatusBadRequest)
		return
	}

	if _, _, err := net_pkg.ParseCIDR(net.IPRange); err != nil {
		http.Error(w, "Invalid IP Range CIDR format (e.g., 192.168.10.0/24)", http.StatusBadRequest)
		return
	}

	net.Description = strings.TrimSpace(net.Description)
	if len(net.Description) > 255 {
		http.Error(w, "Description must be less than 255 characters", http.StatusBadRequest)
		return
	}

	if err := models.CreateNetwork(&net); err != nil {
		http.Error(w, "Failed to create network", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(net)
}
