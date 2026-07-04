package handlers

import (
	"encoding/json"
	"net/http"

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
