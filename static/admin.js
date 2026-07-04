document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('sessions-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    
    // Stats
    const activeUsersCount = document.getElementById('active-users-count');
    const totalUsersCount = document.getElementById('total-users-count');

    // Modal
    const modal = document.getElementById('user-modal');
    const closeModal = document.getElementById('close-modal');
    const modalContent = document.getElementById('modal-content');

    let sessionsData = [];

    async function fetchSessions() {
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        tbody.innerHTML = '';

        try {
            const res = await fetch('/api/admin/sessions');
            if (res.ok) {
                sessionsData = await res.json() || [];
                renderTable(sessionsData);
                updateStats(sessionsData);
            }
        } catch (error) {
            console.error('Failed to fetch sessions', error);
        } finally {
            loadingState.classList.add('hidden');
            if (sessionsData.length === 0) {
                emptyState.classList.remove('hidden');
            }
        }
    }

    function renderTable(data) {
        tbody.innerHTML = '';
        data.forEach(session => {
            if (!session.is_verified) return; // Only show verified sessions for now

            const tr = document.createElement('tr');
            
            // Assume online if login time is within last 2 hours (mock logic)
            const loginTime = new Date(session.login_time);
            const isOnline = (new Date() - loginTime) < (2 * 60 * 60 * 1000);
            
            const statusClass = isOnline ? 'status-online' : 'status-offline';
            const statusText = isOnline ? 'Online' : 'Offline';
            
            tr.innerHTML = `
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${session.name}</td>
                <td>${session.mobile}</td>
                <td>${session.device}</td>
                <td>${session.ip_address}</td>
                <td>${session.mac_address}</td>
                <td>${loginTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td><a class="action-link" data-id="${session.id}">View Details</a></td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners for details
        document.querySelectorAll('.action-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const session = sessionsData.find(s => s.id === id);
                if (session) {
                    showModal(session);
                }
            });
        });
    }

    function updateStats(data) {
        const verified = data.filter(s => s.is_verified);
        totalUsersCount.textContent = verified.length;
        
        const active = verified.filter(s => {
            const loginTime = new Date(s.login_time);
            return (new Date() - loginTime) < (2 * 60 * 60 * 1000);
        });
        activeUsersCount.textContent = active.length;
    }

    function showModal(session) {
        const loginTime = new Date(session.login_time);
        
        modalContent.innerHTML = `
            <div>
                <div class="info-block"><label>Name</label><div class="val">${session.name}</div></div>
                <div class="info-block"><label>Mobile</label><div class="val">${session.mobile}</div></div>
                <div class="info-block"><label>Company</label><div class="val">${session.company || 'N/A'}</div></div>
                <div class="info-block"><label>Purpose</label><div class="val">${session.purpose}</div></div>
                <div class="info-block"><label>Device & OS</label><div class="val">${session.device} / ${session.os}</div></div>
                <div class="info-block"><label>Browser</label><div class="val">${session.browser}</div></div>
            </div>
            <div>
                <div class="info-block"><label>MAC Address</label><div class="val">${session.mac_address}</div></div>
                <div class="info-block"><label>IP Address</label><div class="val">${session.ip_address}</div></div>
                <div class="info-block"><label>Login Time</label><div class="val">${loginTime.toLocaleString()}</div></div>
                <div class="info-block"><label>Data Usage</label><div class="val">Down: ${session.data_download}B / Up: ${session.data_upload}B</div></div>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = sessionsData.filter(s => 
            s.is_verified && (
                s.name.toLowerCase().includes(query) ||
                s.mobile.includes(query) ||
                (s.ip_address && s.ip_address.includes(query))
            )
        );
        renderTable(filtered);
    });

    refreshBtn.addEventListener('click', fetchSessions);

    // Navigation
    const navSessions = document.getElementById('nav-sessions');
    const navNetwork = document.getElementById('nav-network');
    const sessionsView = document.getElementById('sessions-view');
    const networkView = document.getElementById('network-view');

    navSessions.addEventListener('click', (e) => {
        e.preventDefault();
        navSessions.classList.add('active');
        navNetwork.classList.remove('active');
        sessionsView.classList.remove('hidden');
        networkView.classList.add('hidden');
        fetchSessions();
    });

    navNetwork.addEventListener('click', (e) => {
        e.preventDefault();
        navNetwork.classList.add('active');
        navSessions.classList.remove('active');
        networkView.classList.remove('hidden');
        sessionsView.classList.add('hidden');
        fetchNetworks();
    });

    // Virtual Switch Logic
    const networksTbody = document.getElementById('networks-tbody');
    const netForm = document.getElementById('network-form');
    const addNetBtn = document.getElementById('add-net-btn');
    const netLoading = document.getElementById('net-loading-state');
    const netEmpty = document.getElementById('net-empty-state');
    
    // Switch UI Elements
    const switchPortsContainer = document.getElementById('switch-ports');
    const portConfigPanel = document.getElementById('port-config-panel');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const configPortTitle = document.getElementById('config-port-title');
    const configPortNum = document.getElementById('config-port-num');
    const switchModelLabel = document.getElementById('switch-model-label');
    const switchSizeSelect = document.getElementById('switch-size-select');
    
    // Default to 24 ports, but allow selection
    let currentSwitchSize = parseInt(localStorage.getItem('switchSize')) || 24;
    switchSizeSelect.value = currentSwitchSize;

    switchSizeSelect.addEventListener('change', (e) => {
        currentSwitchSize = parseInt(e.target.value);
        localStorage.setItem('switchSize', currentSwitchSize);
        fetchNetworks();
    });

    let activeNetworks = [];
    
    function renderSwitchUI() {
        switchPortsContainer.innerHTML = '';
        switchPortsContainer.dataset.size = currentSwitchSize;
        switchModelLabel.textContent = `Virtual Switch ${currentSwitchSize}G`;

        const colsPerRow = currentSwitchSize / 2;
        
        for (let i = 1; i <= currentSwitchSize; i++) {
            const isBottomRow = i > colsPerRow;
            const slot = document.createElement('div');
            slot.className = `port-slot ${isBottomRow ? 'bottom-row' : ''}`;
            slot.dataset.port = i;
            
            slot.innerHTML = `
                <div class="port-leds">
                    <div class="port-led lnk-led" title="Link/Power"></div>
                    <div class="port-led tx-led" title="Transmit"></div>
                    <div class="port-led rx-led" title="Receive"></div>
                </div>
                <div class="rj45"></div>
                <div class="port-label">${i}</div>
            `;
            
            slot.addEventListener('click', () => openPortConfig(i));
            switchPortsContainer.appendChild(slot);
        }
        updateSwitchLEDs();
    }
    
    function updateSwitchLEDs() {
        document.querySelectorAll('.port-slot').forEach(slot => {
            const portNum = parseInt(slot.dataset.port);
            const net = activeNetworks.find(n => n.port_num === portNum);
            
            // Remove existing badge if any
            const existingBadge = slot.querySelector('.port-status-badge');
            if (existingBadge) existingBadge.remove();

            if (net) {
                slot.classList.add('active', 'tx-rx-active');
                slot.title = `VLAN: ${net.vlan_id} | Mode: ${net.port_mode} | Limit: ${net.bandwidth_limit > 0 ? net.bandwidth_limit + 'Mbps' : 'Unlimited'}`;
                
                // Add persistent status badge
                const badge = document.createElement('div');
                badge.className = 'port-status-badge';
                badge.textContent = `V${net.vlan_id}-${net.port_mode === 'access' ? 'ACC' : 'TRK'}`;
                slot.appendChild(badge);
            } else {
                slot.classList.remove('active', 'tx-rx-active');
                slot.title = `Port ${portNum} - Empty`;
            }
        });
    }

    function openPortConfig(portNum) {
        document.querySelectorAll('.port-slot').forEach(s => s.classList.remove('selected'));
        const activeSlot = document.querySelector(`.port-slot[data-port="${portNum}"]`);
        if(activeSlot) activeSlot.classList.add('selected');
        
        configPortTitle.textContent = `Configure Port ${portNum}`;
        configPortNum.value = portNum;
        
        // If this port already has a mapped config, populate it
        const existingNet = activeNetworks.find(n => n.port_num === portNum);
        if (existingNet) {
            document.getElementById('port-mode').value = existingNet.port_mode;
            document.getElementById('bandwidth-limit').value = existingNet.bandwidth_limit;
            document.getElementById('vlan-id').value = existingNet.vlan_id;
            document.getElementById('ip-range').value = existingNet.ip_range;
            document.getElementById('vip-ips').value = existingNet.vip_ips || '';
            document.getElementById('net-desc').value = existingNet.description || '';
            addNetBtn.textContent = 'Update Configuration';
        } else {
            netForm.reset();
            configPortNum.value = portNum; // reset clears hidden inputs sometimes
            addNetBtn.textContent = 'Inject Configuration';
        }
        
        portConfigPanel.classList.add('open');
    }

    closePanelBtn.addEventListener('click', () => {
        portConfigPanel.classList.remove('open');
        document.querySelectorAll('.port-slot').forEach(s => s.classList.remove('selected'));
    });

    async function fetchNetworks() {
        netLoading.classList.remove('hidden');
        netEmpty.classList.add('hidden');
        networksTbody.innerHTML = '';

        try {
            const res = await fetch(`/api/admin/networks?switch_id=${currentSwitchSize}`);
            if (res.ok) {
                activeNetworks = await res.json() || [];
                netLoading.classList.add('hidden');
                
                renderSwitchUI();
                
                if (activeNetworks.length === 0) {
                    netEmpty.classList.remove('hidden');
                } else {
                    activeNetworks.forEach(net => {
                        const tr = document.createElement('tr');
                        let vipHtml = '-';
                        if (net.vip_ips) {
                            vipHtml = net.vip_ips.split(',').map(ip => `<a href="#" class="vip-link" style="color:var(--primary); text-decoration:underline;" data-ip="${ip.trim()}">${ip.trim()}</a>`).join(', ');
                        }
                        tr.innerHTML = `
                            <td><strong>P${net.port_num}</strong></td>
                            <td><span class="status-badge" style="background:#333; color:#aaa;">${net.port_mode.toUpperCase()}</span></td>
                            <td><strong>${net.vlan_id}</strong></td>
                            <td>${net.ip_range}</td>
                            <td>${net.bandwidth_limit > 0 ? net.bandwidth_limit + ' Mbps' : 'Unlimited'}</td>
                            <td>${vipHtml}</td>
                            <td><span class="status-badge status-online">Active</span></td>
                        `;
                        networksTbody.appendChild(tr);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch networks', error);
        }
    }

    netForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addNetBtn.disabled = true;
        const originalText = addNetBtn.textContent;
        addNetBtn.textContent = 'Injecting...';

        const port_num = parseInt(document.getElementById('config-port-num').value);
        const port_mode = document.getElementById('port-mode').value;
        const bandwidth_limit = parseInt(document.getElementById('bandwidth-limit').value);
        const vlan_id = parseInt(document.getElementById('vlan-id').value);
        const ip_range = document.getElementById('ip-range').value;
        const vip_ips = document.getElementById('vip-ips').value;
        const description = document.getElementById('net-desc').value;
        const switch_id = currentSwitchSize.toString();

        try {
            const res = await fetch('/api/admin/networks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ switch_id, port_num, port_mode, bandwidth_limit, vlan_id, ip_range, vip_ips, description })
            });

            if (res.ok) {
                netForm.reset();
                portConfigPanel.classList.remove('open');
                document.querySelectorAll('.port-slot').forEach(s => s.classList.remove('selected'));
                fetchNetworks();
            } else {
                const errorMsg = await res.text();
                alert(`Failed to configure port: ${errorMsg}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            addNetBtn.disabled = false;
            addNetBtn.textContent = originalText;
        }
    });

    // Initial fetch
    fetchSessions();
    renderSwitchUI();

    // VIP Link global listener
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('vip-link')) {
            e.preventDefault();
            const ip = e.target.getAttribute('data-ip');
            
            // Switch to Sessions Tab
            document.getElementById('nav-sessions').click();
            
            // Wait for DOM then search
            setTimeout(() => {
                searchInput.value = ip;
                searchInput.dispatchEvent(new Event('input'));
                
                const session = sessionsData.find(s => s.ip_address === ip && s.is_verified);
                if (session) {
                    showModal(session);
                } else {
                    alert('No active session currently found for VIP IP: ' + ip);
                }
            }, 100);
        }
    });
});
