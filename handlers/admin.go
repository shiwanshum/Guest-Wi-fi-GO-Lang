package handlers

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"

	"guest-wifi-portal/models"
)

func AdminSessionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

func GetNetworksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	networks, err := models.GetAllNetworks()
	if err != nil {
		http.Error(w, "Failed to retrieve networks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(networks)
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

	// Backend Validation Crosscheck for Network Inputs
	if net.VlanID < 1 || net.VlanID > 4095 {
		http.Error(w, "VLAN ID must be between 1 and 4095", http.StatusBadRequest)
		return
	}

	if _, _, err := net.ParseCIDR(net.IPRange); err != nil {
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
