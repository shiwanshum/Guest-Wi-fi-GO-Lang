package models

import (
	"time"
)

type Network struct {
	ID             int        `json:"id"`
	SwitchID       string     `json:"switch_id"`
	PortNum        int        `json:"port_num"`
	PortMode       string     `json:"port_mode"`
	BandwidthLimit int        `json:"bandwidth_limit"`
	VIPIPs         string     `json:"vip_ips"`
	VLANID         int        `json:"vlan_id"`
	IPRange        string     `json:"ip_range"`
	Description    string     `json:"description"`
	CreatedAt      *time.Time `json:"created_at"`
}

func GetAllNetworks(switchID string) ([]Network, error) {
	query := `SELECT id, switch_id, port_num, port_mode, bandwidth_limit, vip_ips, vlan_id, ip_range, description, created_at FROM networks WHERE switch_id = $1 ORDER BY port_num ASC`
	rows, err := DB.Query(query, switchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var networks []Network
	for rows.Next() {
		var n Network
		err := rows.Scan(&n.ID, &n.SwitchID, &n.PortNum, &n.PortMode, &n.BandwidthLimit, &n.VIPIPs, &n.VLANID, &n.IPRange, &n.Description, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		networks = append(networks, n)
	}
	return networks, nil
}

func CreateNetwork(net *Network) error {
	query := `
		INSERT INTO networks (switch_id, port_num, port_mode, bandwidth_limit, vip_ips, vlan_id, ip_range, description) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
		ON CONFLICT (switch_id, port_num) DO UPDATE 
		SET port_mode = EXCLUDED.port_mode, 
		    bandwidth_limit = EXCLUDED.bandwidth_limit, 
		    vip_ips = EXCLUDED.vip_ips, 
		    vlan_id = EXCLUDED.vlan_id, 
		    ip_range = EXCLUDED.ip_range, 
		    description = EXCLUDED.description 
		RETURNING id`
	err := DB.QueryRow(query, net.SwitchID, net.PortNum, net.PortMode, net.BandwidthLimit, net.VIPIPs, net.VLANID, net.IPRange, net.Description).Scan(&net.ID)
	if err != nil {
		return err
	}
	
	now := time.Now()
	net.CreatedAt = &now
	return nil
}
