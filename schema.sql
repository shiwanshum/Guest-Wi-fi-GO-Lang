CREATE TABLE IF NOT EXISTS guest_sessions (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    mobile TEXT,
    company TEXT,
    purpose TEXT,
    otp TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    mac_address TEXT,
    ip_address TEXT,
    device TEXT,
    os TEXT,
    browser TEXT,
    login_time TIMESTAMP,
    logout_time TIMESTAMP,
    data_download BIGINT DEFAULT 0,
    data_upload BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS networks (
    id SERIAL PRIMARY KEY,
    switch_id TEXT NOT NULL DEFAULT '24',
    port_num INTEGER NOT NULL,
    port_mode TEXT NOT NULL DEFAULT 'access',
    bandwidth_limit INTEGER DEFAULT 0,
    vip_ips TEXT,
    vlan_id INTEGER NOT NULL,
    ip_range TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(switch_id, port_num)
);
