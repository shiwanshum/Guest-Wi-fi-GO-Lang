package models

import (
	"time"
)

type GuestSession struct {
	ID           int        `json:"id"`
	Name         string     `json:"name"`
	Email        string     `json:"email"`
	Mobile       string     `json:"mobile"`
	Company      string     `json:"company"`
	Purpose      string     `json:"purpose"`
	OTP          string     `json:"-"`
	IsVerified   bool       `json:"is_verified"`
	MACAddress   string     `json:"mac_address"`
	IPAddress    string     `json:"ip_address"`
	Device       string     `json:"device"`
	OS           string     `json:"os"`
	Browser      string     `json:"browser"`
	LoginTime    *time.Time `json:"login_time"`
	LogoutTime   *time.Time `json:"logout_time"`
	DataDownload int64      `json:"data_download"`
	DataUpload   int64      `json:"data_upload"`
}

func CreateSession(session *GuestSession) error {
	query := `INSERT INTO guest_sessions (name, email, mobile, company, purpose, otp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
	err := DB.QueryRow(query, session.Name, session.Email, session.Mobile, session.Company, session.Purpose, session.OTP).Scan(&session.ID)
	if err != nil {
		return err
	}
	return nil
}

func VerifySessionOTP(mobile, otp string, sessionData *GuestSession) (*GuestSession, error) {
	// Simple lookup based on mobile and OTP
	query := `SELECT id, name, email, mobile, company, purpose, otp, is_verified FROM guest_sessions WHERE mobile = $1 AND otp = $2 AND is_verified = FALSE ORDER BY id DESC LIMIT 1`
	row := DB.QueryRow(query, mobile, otp)

	var s GuestSession
	err := row.Scan(&s.ID, &s.Name, &s.Email, &s.Mobile, &s.Company, &s.Purpose, &s.OTP, &s.IsVerified)
	if err != nil {
		return nil, err
	}

	// Update verification status and metadata
	now := time.Now()
	updateQuery := `
		UPDATE guest_sessions 
		SET is_verified = TRUE, mac_address = $1, ip_address = $2, device = $3, os = $4, browser = $5, login_time = $6
		WHERE id = $7
	`
	_, err = DB.Exec(updateQuery, sessionData.MACAddress, sessionData.IPAddress, sessionData.Device, sessionData.OS, sessionData.Browser, now, s.ID)
	if err != nil {
		return nil, err
	}

	s.IsVerified = true
	s.MACAddress = sessionData.MACAddress
	s.IPAddress = sessionData.IPAddress
	s.Device = sessionData.Device
	s.OS = sessionData.OS
	s.Browser = sessionData.Browser
	s.LoginTime = &now
	return &s, nil
}

func GetAllSessions() ([]GuestSession, error) {
	query := `SELECT id, name, email, mobile, company, purpose, is_verified, mac_address, ip_address, device, os, browser, login_time, logout_time, data_download, data_upload FROM guest_sessions ORDER BY id DESC`
	rows, err := DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []GuestSession
	for rows.Next() {
		var s GuestSession
		err := rows.Scan(
			&s.ID, &s.Name, &s.Email, &s.Mobile, &s.Company, &s.Purpose, &s.IsVerified,
			&s.MACAddress, &s.IPAddress, &s.Device, &s.OS, &s.Browser,
			&s.LoginTime, &s.LogoutTime, &s.DataDownload, &s.DataUpload,
		)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}
