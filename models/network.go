package models

import (
	"time"
)

type Network struct {
	ID          int        `json:"id"`
	VLANID      int        `json:"vlan_id"`
	IPRange     string     `json:"ip_range"`
	Description string     `json:"description"`
	CreatedAt   *time.Time `json:"created_at"`
}

func GetAllNetworks() ([]Network, error) {
	query := `SELECT id, vlan_id, ip_range, description, created_at FROM networks ORDER BY id DESC`
	rows, err := DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var networks []Network
	for rows.Next() {
		var n Network
		err := rows.Scan(&n.ID, &n.VLANID, &n.IPRange, &n.Description, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		networks = append(networks, n)
	}
	return networks, nil
}

func CreateNetwork(net *Network) error {
	query := `INSERT INTO networks (vlan_id, ip_range, description) VALUES (?, ?, ?)`
	res, err := DB.Exec(query, net.VLANID, net.IPRange, net.Description)
	if err != nil {
		return err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	net.ID = int(id)
	
	now := time.Now()
	net.CreatedAt = &now
	return nil
}
