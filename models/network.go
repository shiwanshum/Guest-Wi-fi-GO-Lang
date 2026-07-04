package models

import (
	"time"
)

type Network struct {
	ID             int        `json:"id"`
	PortNum        int        `json:"port_num"`
	PortMode       string     `json:"port_mode"`
	BandwidthLimit int        `json:"bandwidth_limit"`
	VIPIPs         string     `json:"vip_ips"`
	VLANID         int        `json:"vlan_id"`
	IPRange        string     `json:"ip_range"`
	Description    string     `json:"description"`
	CreatedAt      *time.Time `json:"created_at"`
}

func GetAllNetworks() ([]Network, error) {
	query := `SELECT id, port_num, port_mode, bandwidth_limit, vip_ips, vlan_id, ip_range, description, created_at FROM networks ORDER BY port_num ASC`
	rows, err := DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var networks []Network
	for rows.Next() {
		var n Network
		err := rows.Scan(&n.ID, &n.PortNum, &n.PortMode, &n.BandwidthLimit, &n.VIPIPs, &n.VLANID, &n.IPRange, &n.Description, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		networks = append(networks, n)
	}
	return networks, nil
}

func CreateNetwork(net *Network) error {
	query := `INSERT INTO networks (port_num, port_mode, bandwidth_limit, vip_ips, vlan_id, ip_range, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`
	err := DB.QueryRow(query, net.PortNum, net.PortMode, net.BandwidthLimit, net.VIPIPs, net.VLANID, net.IPRange, net.Description).Scan(&net.ID)
	if err != nil {
		return err
	}
	
	now := time.Now()
	net.CreatedAt = &now
	return nil
}
