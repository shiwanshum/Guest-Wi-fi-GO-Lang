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

    async function fetchNetworks() {
        netLoading.classList.remove('hidden');
        netEmpty.classList.add('hidden');
        networksTbody.innerHTML = '';

        try {
            const res = await fetch('/api/admin/networks');
            if (res.ok) {
                const data = await res.json() || [];
                netLoading.classList.add('hidden');
                
                if (data.length === 0) {
                    netEmpty.classList.remove('hidden');
                } else {
                    data.forEach(net => {
                        const tr = document.createElement('tr');
                        const created = new Date(net.created_at).toLocaleString();
                        tr.innerHTML = `
                            <td><strong>${net.vlan_id}</strong></td>
                            <td>${net.ip_range}</td>
                            <td>${net.description || '-'}</td>
                            <td>${created}</td>
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
        addNetBtn.textContent = 'Injecting...';

        const vlan_id = parseInt(document.getElementById('vlan-id').value);
        const ip_range = document.getElementById('ip-range').value;
        const description = document.getElementById('net-desc').value;

        try {
            const res = await fetch('/api/admin/networks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vlan_id, ip_range, description })
            });

            if (res.ok) {
                netForm.reset();
                fetchNetworks();
            } else {
                alert('Failed to add Virtual Switch config');
            }
        } catch (error) {
            console.error(error);
        } finally {
            addNetBtn.disabled = false;
            addNetBtn.textContent = 'Inject VLAN';
        }
    });

    // Initial fetch
    fetchSessions();
});
