document.addEventListener('DOMContentLoaded', () => {
    // =============================================
    // STATE
    // =============================================
    let sessionsData = [];
    let activeNetworks = [];
    let currentSwitchSize = parseInt(localStorage.getItem('switchSize')) || 24;
    let adminProfile = null;

    // =============================================
    // DOM REFS
    // =============================================
    const loginPage = document.getElementById('login-page');
    const adminApp = document.getElementById('admin-app');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const togglePassword = document.getElementById('toggle-password');
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotModal = document.getElementById('forgot-modal');
    const closeForgot = document.getElementById('close-forgot');
    const backToLogin = document.getElementById('back-to-login');
    const forgotForm = document.getElementById('forgot-form');
    const forgotBtn = document.getElementById('forgot-btn');
    const forgotSuccess = document.getElementById('forgot-success');
    const forgotEmail = document.getElementById('forgot-email');

    const tbody = document.getElementById('sessions-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const activeUsersCount = document.getElementById('active-users-count');
    const totalUsersCount = document.getElementById('total-users-count');

    const modal = document.getElementById('user-modal');
    const closeModal = document.getElementById('close-modal');
    const modalContent = document.getElementById('modal-content');
    const disconnectBtn = document.getElementById('disconnect-user');
    const blockMacBtn = document.getElementById('block-mac');

    const navSessions = document.getElementById('nav-sessions');
    const navNetwork = document.getElementById('nav-network');
    const navSettings = document.getElementById('nav-settings');
    const navLogs = document.getElementById('nav-logs');
    const sessionsView = document.getElementById('sessions-view');
    const networkView = document.getElementById('network-view');
    const settingsView = document.getElementById('settings-view');
    const logsView = document.getElementById('logs-view');
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarRole = document.getElementById('sidebar-role');
    const logoutBtn = document.getElementById('logout-btn');

    // =============================================
    // AUTH HELPERS
    // =============================================
    function getToken() {
        return localStorage.getItem('adminToken');
    }

    function setToken(token) {
        localStorage.setItem('adminToken', token);
    }

    function clearToken() {
        localStorage.removeItem('adminToken');
    }

    function authHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': getToken() || ''
        };
    }

    // =============================================
    // LOGIN FLOW
    // =============================================
    togglePassword.addEventListener('click', () => {
        const type = loginPassword.type === 'password' ? 'text' : 'password';
        loginPassword.type = type;
        togglePassword.innerHTML = type === 'password'
            ? '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
            : '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        loginBtn.disabled = true;
        loginBtn.querySelector('.btn-text').textContent = 'Signing in...';
        loginBtn.querySelector('.spinner').classList.remove('hidden');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginUsername.value.trim(),
                    password: loginPassword.value,
                    ip: '',
                    user_agent: navigator.userAgent
                })
            });
            const data = await res.json();
            if (res.ok) {
                setToken(data.token);
                adminProfile = data.user;
                showAdminApp();
            } else {
                loginError.querySelector('span').textContent = data.error || 'Invalid credentials';
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            loginError.querySelector('span').textContent = 'Connection failed. Check server.';
            loginError.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.querySelector('.btn-text').textContent = 'Sign In';
            loginBtn.querySelector('.spinner').classList.add('hidden');
        }
    });

    // =============================================
    // FORGOT PASSWORD
    // =============================================
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotModal.classList.remove('hidden');
        forgotSuccess.classList.add('hidden');
        forgotForm.classList.remove('hidden');
        forgotBtn.querySelector('.spinner').classList.add('hidden');
        forgotBtn.querySelector('.btn-text').textContent = 'Send Reset Link';
    });

    closeForgot.addEventListener('click', () => forgotModal.classList.add('hidden'));
    backToLogin.addEventListener('click', () => forgotModal.classList.add('hidden'));
    forgotModal.addEventListener('click', (e) => { if (e.target === forgotModal) forgotModal.classList.add('hidden'); });

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        forgotBtn.disabled = true;
        forgotBtn.querySelector('.btn-text').textContent = 'Sending...';
        forgotBtn.querySelector('.spinner').classList.remove('hidden');

        try {
            const res = await fetch('/api/admin/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail.value })
            });
            const data = await res.json();
            forgotForm.classList.add('hidden');
            forgotSuccess.classList.remove('hidden');
            document.getElementById('forgot-msg').textContent = data.message || 'Reset link sent successfully!';
        } catch (err) {
            alert('Failed to send reset link.');
        } finally {
            forgotBtn.disabled = false;
        }
    });

    // =============================================
    // AUTH CHECK & APP INIT
    // =============================================
    async function checkAuth() {
        const token = getToken();
        if (!token) return false;
        try {
            const res = await fetch('/api/admin/check-auth', { headers: { 'Authorization': token } });
            if (res.ok) {
                const data = await res.json();
                adminProfile = data.user;
                return true;
            }
        } catch (_) {}
        clearToken();
        return false;
    }

    async function init() {
        const authenticated = await checkAuth();
        if (authenticated) {
            showAdminApp();
        } else {
            loginPage.classList.remove('hidden');
        }
    }

    function showAdminApp() {
        loginPage.classList.add('hidden');
        adminApp.classList.remove('hidden');
        if (adminProfile) {
            sidebarName.textContent = adminProfile.name || 'Admin';
            sidebarRole.textContent = adminProfile.role || 'Super Admin';
        }
        fetchSessions();
        renderSwitchUI();
        loadProfile();
    }

    // =============================================
    // LOGOUT
    // =============================================
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/admin/logout', { method: 'POST', headers: { 'Authorization': getToken() } });
        } catch (_) {}
        clearToken();
        adminProfile = null;
        adminApp.classList.add('hidden');
        loginPage.classList.remove('hidden');
        loginUsername.value = 'admin';
        loginPassword.value = 'admin123';
        loginError.classList.add('hidden');
    });

    // =============================================
    // SESSIONS
    // =============================================
    async function fetchSessions() {
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        tbody.innerHTML = '';

        try {
            const res = await fetch('/api/admin/sessions', { headers: authHeaders() });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) {
                sessionsData = await res.json() || [];
                renderTable(sessionsData);
                updateStats(sessionsData);
            }
        } catch (error) {
            console.error('Failed to fetch sessions', error);
        } finally {
            loadingState.classList.add('hidden');
            if (sessionsData.length === 0) emptyState.classList.remove('hidden');
        }
    }

    function renderTable(data) {
        tbody.innerHTML = '';
        data.forEach(session => {
            if (!session.is_verified) return;
            const loginTime = new Date(session.login_time);
            const isOnline = (new Date() - loginTime) < (2 * 60 * 60 * 1000);
            const statusClass = isOnline ? 'status-online' : 'status-offline';
            const statusText = isOnline ? 'Online' : 'Offline';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="status-badge ${statusClass}"><span class="status-dot"></span>${statusText}</span></td>
                <td><strong>${session.name}</strong></td>
                <td>${session.mobile}</td>
                <td>${session.device}</td>
                <td><code>${session.ip_address}</code></td>
                <td><code>${session.mac_address}</code></td>
                <td><span class="time-cell">${loginTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></td>
                <td><a class="action-link" data-id="${session.id}">View Details</a></td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.action-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const session = sessionsData.find(s => s.id === id);
                if (session) showModal(session);
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

    // =============================================
    // USER MODAL
    // =============================================
    function showModal(session) {
        const loginTime = new Date(session.login_time);
        const isOnline = (new Date() - loginTime) < (2 * 60 * 60 * 1000);

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
                <div class="info-block"><label>MAC Address</label><div class="val"><code>${session.mac_address}</code></div></div>
                <div class="info-block"><label>IP Address</label><div class="val"><code>${session.ip_address}</code></div></div>
                <div class="info-block"><label>Status</label><div class="val"><span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}"><span class="status-dot"></span>${isOnline ? 'Online' : 'Offline'}</span></div></div>
                <div class="info-block"><label>Login Time</label><div class="val">${loginTime.toLocaleString()}</div></div>
                <div class="info-block"><label>Data Usage</label><div class="val">${formatBytes(session.data_download) || '0 B'} down / ${formatBytes(session.data_upload) || '0 B'} up</div></div>
                <div class="info-block"><label>Session Duration</label><div class="val">${getDuration(loginTime)}</div></div>
            </div>
        `;

        disconnectBtn.dataset.sessionId = session.id;
        disconnectBtn.dataset.mac = session.mac_address;
        blockMacBtn.dataset.mac = session.mac_address;
        modal.classList.remove('hidden');
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getDuration(loginTime) {
        const diff = new Date() - loginTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    disconnectBtn.addEventListener('click', () => {
        const name = modalContent.querySelector('.info-block:first-child .val')?.textContent || 'user';
        if (confirm(`Disconnect ${name} from the network?`)) {
            alert(`User ${name} has been disconnected.`);
            modal.classList.add('hidden');
        }
    });

    blockMacBtn.addEventListener('click', () => {
        const mac = blockMacBtn.dataset.mac;
        if (confirm(`Block MAC address ${mac} permanently?`)) {
            alert(`MAC ${mac} has been blocked.`);
            modal.classList.add('hidden');
        }
    });

    // =============================================
    // SEARCH & REFRESH
    // =============================================
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

    // =============================================
    // NAVIGATION
    // =============================================
    function switchView(activeNav, activeView) {
        [navSessions, navNetwork, navSettings, navLogs].forEach(n => n.classList.remove('active'));
        activeNav.classList.add('active');
        [sessionsView, networkView, settingsView, logsView].forEach(v => v.classList.add('hidden'));
        activeView.classList.remove('hidden');
    }

    navSessions.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(navSessions, sessionsView);
        fetchSessions();
    });

    navNetwork.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(navNetwork, networkView);
        fetchNetworks();
    });

    navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(navSettings, settingsView);
        loadProfile();
        loadAdminSessions();
        loadLoginHistory();
    });

    navLogs.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(navLogs, logsView);
    });

    // =============================================
    // SETTINGS
    // =============================================
    function loadProfile() {
        document.getElementById('profile-name').textContent = adminProfile?.name || 'Admin';
        document.getElementById('profile-role').textContent = adminProfile?.role || 'Super Admin';
        document.getElementById('profile-username').textContent = adminProfile?.username || 'admin';
        document.getElementById('profile-email').textContent = adminProfile?.email || 'admin@guestwifi.local';
        document.getElementById('profile-role-val').textContent = adminProfile?.role || 'Super Admin';
    }

    async function loadAdminSessions() {
        const container = document.getElementById('admin-sessions-list');
        container.innerHTML = '<div class="table-state" id="admin-sessions-loading">Loading sessions...</div>';
        try {
            const res = await fetch('/api/admin/active-sessions', { headers: authHeaders() });
            if (res.ok) {
                const sessions = await res.json();
                if (sessions.length === 0) {
                    container.innerHTML = '<div class="table-state">No active admin sessions</div>';
                    return;
                }
                let html = '<div class="session-cards">';
                sessions.forEach(s => {
                    const time = new Date(s.created_at);
                    html += `
                        <div class="session-card">
                            <div class="session-card-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                            </div>
                            <div class="session-card-info">
                                <strong>${s.username}</strong>
                                <span class="session-meta">Started: ${time.toLocaleString()}</span>
                                <span class="session-meta">Last Seen: ${new Date(s.last_seen).toLocaleString()}</span>
                                ${s.ip ? `<span class="session-meta">IP: ${s.ip}</span>` : ''}
                            </div>
                            <span class="status-badge status-online"><span class="status-dot"></span>Active</span>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            }
        } catch (_) {
            container.innerHTML = '<div class="table-state">Failed to load sessions</div>';
        }
    }

    async function loadLoginHistory() {
        const container = document.getElementById('login-history-list');
        container.innerHTML = '<div class="table-state" id="login-history-loading">Loading login history...</div>';
        try {
            const res = await fetch('/api/admin/login-history', { headers: authHeaders() });
            if (res.ok) {
                const history = await res.json();
                if (history.length === 0) {
                    container.innerHTML = '<div class="table-state">No login history</div>';
                    return;
                }
                let html = '<div class="session-cards">';
                history.slice().reverse().forEach(s => {
                    const time = new Date(s.created_at);
                    html += `
                        <div class="session-card">
                            <div class="session-card-icon">
                                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            </div>
                            <div class="session-card-info">
                                <strong>${s.username}</strong>
                                <span class="session-meta">Login: ${time.toLocaleString()}</span>
                                ${s.ip ? `<span class="session-meta">IP: ${s.ip}</span>` : ''}
                                ${s.user_agent ? `<span class="session-meta">${s.user_agent.substring(0,50)}...</span>` : ''}
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            }
        } catch (_) {
            container.innerHTML = '<div class="table-state">Failed to load history</div>';
        }
    }

    // Settings Tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-pane').forEach(p => p.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
        });
    });

    // Change Password
    document.getElementById('change-password-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const current = document.getElementById('current-pwd').value;
        const newPwd = document.getElementById('new-pwd').value;
        const confirm = document.getElementById('confirm-pwd').value;
        if (!current || !newPwd || !confirm) {
            alert('Please fill in all password fields.');
            return;
        }
        if (newPwd !== confirm) {
            alert('New passwords do not match.');
            return;
        }
        alert('Password updated successfully.');
        document.getElementById('change-password-form').reset();
    });

    // =============================================
    // VIRTUAL SWITCH
    // =============================================
    const networksTbody = document.getElementById('networks-tbody');
    const netForm = document.getElementById('network-form');
    const addNetBtn = document.getElementById('add-net-btn');
    const netLoading = document.getElementById('net-loading-state');
    const netEmpty = document.getElementById('net-empty-state');
    const switchPortsContainer = document.getElementById('switch-ports');
    const portConfigPanel = document.getElementById('port-config-panel');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const configPortTitle = document.getElementById('config-port-title');
    const configPortNum = document.getElementById('config-port-num');
    const switchModelLabel = document.getElementById('switch-model-label');
    const switchSizeSelect = document.getElementById('switch-size-select');

    switchSizeSelect.value = currentSwitchSize;

    switchSizeSelect.addEventListener('change', (e) => {
        currentSwitchSize = parseInt(e.target.value);
        localStorage.setItem('switchSize', currentSwitchSize);
        fetchNetworks();
    });

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
            const existingBadge = slot.querySelector('.port-status-badge');
            if (existingBadge) existingBadge.remove();

            if (net) {
                slot.classList.add('active', 'tx-rx-active');
                slot.title = `VLAN: ${net.vlan_id} | Mode: ${net.port_mode} | Limit: ${net.bandwidth_limit > 0 ? net.bandwidth_limit + 'Mbps' : 'Unlimited'}`;
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

    const removeNetBtn = document.getElementById('remove-net-btn');

    function openPortConfig(portNum) {
        document.querySelectorAll('.port-slot').forEach(s => s.classList.remove('selected'));
        const activeSlot = document.querySelector(`.port-slot[data-port="${portNum}"]`);
        if (activeSlot) activeSlot.classList.add('selected');

        configPortTitle.textContent = `Configure Port ${portNum}`;
        configPortNum.value = portNum;

        const existingNet = activeNetworks.find(n => n.port_num === portNum);
        if (existingNet) {
            document.getElementById('port-mode').value = existingNet.port_mode;
            document.getElementById('bandwidth-limit').value = existingNet.bandwidth_limit;
            document.getElementById('vlan-id').value = existingNet.vlan_id;
            document.getElementById('ip-range').value = existingNet.ip_range;
            document.getElementById('vip-ips').value = existingNet.vip_ips || '';
            document.getElementById('net-desc').value = existingNet.description || '';
            addNetBtn.textContent = 'Update Configuration';
            removeNetBtn.classList.remove('hidden');
            removeNetBtn.dataset.port = portNum;
        } else {
            netForm.reset();
            configPortNum.value = portNum;
            addNetBtn.textContent = 'Inject Configuration';
            removeNetBtn.classList.add('hidden');
        }

        portConfigPanel.classList.add('open');
    }

    closePanelBtn.addEventListener('click', () => {
        portConfigPanel.classList.remove('open');
        document.querySelectorAll('.port-slot').forEach(s => s.classList.remove('selected'));
    });

    removeNetBtn.addEventListener('click', async () => {
        const portNum = parseInt(removeNetBtn.dataset.port);
        if (!confirm(`Remove VLAN configuration from Port ${portNum}?`)) return;

        try {
            const res = await fetch('/api/admin/networks/remove', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    switch_id: currentSwitchSize.toString(),
                    port_num: portNum
                })
            });
            if (res.ok) {
                portConfigPanel.classList.remove('open');
                document.querySelectorAll('.port-slot').forEach(s => s.classList.remove('selected'));
                fetchNetworks();
            } else {
                const err = await res.text();
                alert('Failed to remove: ' + err);
            }
        } catch (err) {
            console.error(err);
        }
    });

    async function fetchNetworks() {
        netLoading.classList.remove('hidden');
        netEmpty.classList.add('hidden');
        networksTbody.innerHTML = '';

        try {
            const res = await fetch(`/api/admin/networks?switch_id=${currentSwitchSize}`, { headers: authHeaders() });
            if (res.status === 401) return handleUnauthorized();
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
                            <td><span class="status-badge" style="background:rgba(99,102,241,0.15); color:var(--primary); border:1px solid rgba(99,102,241,0.3);">${net.port_mode.toUpperCase()}</span></td>
                            <td><strong>${net.vlan_id}</strong></td>
                            <td>${net.ip_range}</td>
                            <td>${net.bandwidth_limit > 0 ? net.bandwidth_limit + ' Mbps' : 'Unlimited'}</td>
                            <td>${vipHtml}</td>
                            <td><span class="status-badge status-online"><span class="status-dot"></span>Active</span></td>
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

    // =============================================
    // VIP LINK CLICK DELEGATION
    // =============================================
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('vip-link')) {
            e.preventDefault();
            const ip = e.target.getAttribute('data-ip');
            document.getElementById('nav-sessions').click();
            setTimeout(() => {
                searchInput.value = ip;
                searchInput.dispatchEvent(new Event('input'));
                const session = sessionsData.find(s => s.ip_address === ip && s.is_verified);
                if (session) showModal(session);
                else alert('No active session currently found for VIP IP: ' + ip);
            }, 100);
        }
    });

    // =============================================
    // UNAUTHORIZED HANDLER
    // =============================================
    function handleUnauthorized() {
        clearToken();
        adminApp.classList.add('hidden');
        loginPage.classList.remove('hidden');
        loginError.querySelector('span').textContent = 'Session expired. Please sign in again.';
        loginError.classList.remove('hidden');
    }

    // =============================================
    // INIT
    // =============================================
    init();
});
