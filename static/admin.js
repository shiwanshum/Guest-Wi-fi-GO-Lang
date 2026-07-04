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
    const navEnterprise = document.getElementById('nav-enterprise');
    const navSettings = document.getElementById('nav-settings');
    const navLogs = document.getElementById('nav-logs');
    const sessionsView = document.getElementById('sessions-view');
    const networkView = document.getElementById('network-view');
    const enterpriseView = document.getElementById('enterprise-view');
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
        [navSessions, navNetwork, navEnterprise, navSettings, navLogs].forEach(n => n.classList.remove('active'));
        activeNav.classList.add('active');
        [sessionsView, networkView, enterpriseView, settingsView, logsView].forEach(v => v.classList.add('hidden'));
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

    navEnterprise.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(navEnterprise, enterpriseView);
        // Reset to grid view if config view was open
        document.querySelectorAll('.enterprise-header, .enterprise-grid').forEach(el => {
            el.classList.remove('hidden');
        });
        entConfigView.classList.add('hidden');
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
    // ENTERPRISE CONFIG FULL PAGE
    // =============================================
    const entConfigView = document.getElementById('ent-config-view');
    const entTitle = document.getElementById('ent-config-title');
    const entBody = document.getElementById('ent-config-body');
    const backToEntGrid = document.getElementById('back-to-ent-grid');

    const configPanels = {
        l2: {
            title: 'L2 Switching Configuration',
            icon: 'ent-icon-l2',
            fields: [
                { label: 'VLAN ID', type: 'number', placeholder: '1-4095', value: '100' },
                { label: 'Port Mode', type: 'select', options: ['Access', 'Trunk', 'Hybrid'] },
                { label: 'Allowed VLANs', type: 'text', placeholder: '100,200,300', value: '100' },
                { label: 'STP Mode', type: 'select', options: ['STP', 'RSTP', 'MSTP', 'Disabled'] },
                { label: 'LACP', type: 'select', options: ['Active', 'Passive', 'Disabled'] },
                { label: 'MTU', type: 'number', placeholder: '1500', value: '1500' },
                { label: 'Port Mirroring', type: 'select', options: ['Disabled', 'Ingress', 'Egress', 'Both'] }
            ]
        },
        routing: {
            title: 'BGP / OSPF / VRRP Configuration',
            icon: 'ent-icon-routing',
            fields: [
                { label: 'Protocol', type: 'select', options: ['BGP', 'OSPF', 'VRRP', 'Static'] },
                { label: 'AS Number', type: 'number', placeholder: '65000', value: '65000' },
                { label: 'Router ID', type: 'text', placeholder: '10.0.0.1', value: '10.0.0.1' },
                { label: 'Network', type: 'text', placeholder: '192.168.1.0/24', value: '192.168.1.0/24' },
                { label: 'Neighbor', type: 'text', placeholder: '10.0.0.2' },
                { label: 'ECMP Paths', type: 'number', placeholder: '4', value: '4' },
                { label: 'NAT', type: 'select', options: ['Disabled', 'Source NAT', 'Destination NAT', 'Masquerade'] }
            ]
        },
        lb: {
            title: 'L4/L7 Load Balancer Configuration',
            icon: 'ent-icon-lb',
            fields: [
                { label: 'Mode', type: 'select', options: ['TCP', 'UDP', 'HTTP', 'HTTPS'] },
                { label: 'Frontend Port', type: 'number', placeholder: '80', value: '80' },
                { label: 'Backend Servers', type: 'text', placeholder: '10.0.0.10:8080,10.0.0.11:8080' },
                { label: 'Algorithm', type: 'select', options: ['Round Robin', 'Least Connections', 'Source IP Hash', 'URI Hash'] },
                { label: 'Health Check', type: 'select', options: ['TCP', 'HTTP', 'HTTPS', 'Disabled'] },
                { label: 'Session Persistence', type: 'select', options: ['None', 'Source IP', 'Cookie', 'Cookie Insert'] },
                { label: 'TLS Termination', type: 'select', options: ['Disabled', 'Enabled - ACME', 'Enabled - Upload'] }
            ]
        },
        ssl: {
            title: 'ACME Certificate Authority — Core Engine',
            render: true
        },
        k8s: {
            title: 'Kubernetes LoadBalancer Configuration',
            icon: 'ent-icon-k8s',
            fields: [
                { label: 'Kubeconfig', type: 'select', options: ['In-Cluster', 'Upload Config', 'Manual'] },
                { label: 'API Server', type: 'text', placeholder: 'https://kubernetes.default.svc' },
                { label: 'IP Pool Name', type: 'text', placeholder: 'production-pool', value: 'production-pool' },
                { label: 'IP Pool Range', type: 'text', placeholder: '203.0.113.10-203.0.113.50' },
                { label: 'Service Type', type: 'select', options: ['LoadBalancer', 'ClusterIP + LB', 'Ingress'] },
                { label: 'Namespace Filter', type: 'text', placeholder: 'default' },
                { label: 'Announce Method', type: 'select', options: ['ARP', 'BGP', 'L2 Announce'] }
            ]
        },
        ipam: {
            title: 'IP Address Management Configuration',
            icon: 'ent-icon-ipam',
            fields: [
                { label: 'Pool Name', type: 'text', placeholder: 'pool-name', value: 'public-pool' },
                { label: 'Network CIDR', type: 'text', placeholder: '10.0.0.0/16', value: '10.0.0.0/16' },
                { label: 'Gateway IP', type: 'text', placeholder: '10.0.0.1', value: '10.0.0.1' },
                { label: 'Pool Type', type: 'select', options: ['Public', 'Private', 'Floating', 'VIP'] },
                { label: 'DHCP Range', type: 'text', placeholder: '10.0.0.100-10.0.0.200' },
                { label: 'Reserved IPs', type: 'text', placeholder: '10.0.0.1,10.0.0.2' },
                { label: 'IP Version', type: 'select', options: ['IPv4', 'IPv6', 'Dual Stack'] }
            ]
        },
        qos: {
            title: 'Bandwidth Control Configuration',
            icon: 'ent-icon-bw',
            fields: [
                { label: 'Scope', type: 'select', options: ['Per-Port', 'Per-VLAN', 'Per-IP', 'Per-Service'] },
                { label: 'Ingress Limit', type: 'number', placeholder: '1000', value: '1000' },
                { label: 'Egress Limit', type: 'number', placeholder: '1000', value: '1000' },
                { label: 'Unit', type: 'select', options: ['Mbps', 'Kbps', 'Gbps'] },
                { label: 'Burst Size', type: 'number', placeholder: '100', value: '100' },
                { label: 'Traffic Shaping', type: 'select', options: ['HTB', 'TBF', 'HFSC', 'Disabled'] },
                { label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Critical'] }
            ]
        },
        ha: {
            title: 'HA Clustering Configuration',
            icon: 'ent-icon-ha',
            fields: [
                { label: 'Cluster Mode', type: 'select', options: ['Active/Standby', 'Active/Active', 'Master/Slave'] },
                { label: 'Node Name', type: 'text', placeholder: 'node-1', value: 'node-1' },
                { label: 'Peer Address', type: 'text', placeholder: '10.0.0.2' },
                { label: 'VRRP Group ID', type: 'number', placeholder: '1', value: '1' },
                { label: 'Floating VIP', type: 'text', placeholder: '10.0.0.100', value: '10.0.0.100' },
                { label: 'Sync Protocol', type: 'select', options: ['etcd', 'Consul', 'Raft', 'Manual'] },
                { label: 'Health Check Interval', type: 'number', placeholder: '5', value: '5' }
            ]
        }
    };

    function openEntConfigView(configKey) {
        const config = configPanels[configKey];
        if (!config) return;

        entTitle.textContent = config.title;

        let html = '';

        if (config.render) {
            // Custom rich render for ACME SSL core
            html = acmeCoreHTML();
        } else {
            config.fields.forEach(f => {
                const fieldId = 'ent-field-' + configKey + '-' + f.label.toLowerCase().replace(/\s+/g, '-');
                html += `<div class="input-group">`;
                html += `<label for="${fieldId}">${f.label}</label>`;
                if (f.type === 'select') {
                    html += `<select id="${fieldId}" class="ent-field">`;
                    f.options.forEach(opt => {
                        html += `<option value="${opt}">${opt}</option>`;
                    });
                    html += `</select>`;
                } else {
                    html += `<input id="${fieldId}" type="${f.type}" class="ent-field" placeholder="${f.placeholder || ''}" value="${f.value || ''}">`;
                }
                html += `</div>`;
            });

            html += `
                <div style="margin-top:12px; padding-top:20px; border-top:1px solid var(--border);">
                    <button class="btn btn-primary ent-apply-btn">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Apply Configuration
                    </button>
                </div>
            `;
        }

        entBody.innerHTML = html;

        // Show full-page config, hide grid
        document.querySelectorAll('.enterprise-header, .enterprise-grid').forEach(el => {
            el.classList.add('hidden');
        });
        entConfigView.classList.remove('hidden');

        if (configKey === 'ssl') {
            initACMETabs();
        }
    }

    // Current selected domain for cert issuance
    let acmeSelectedDomain = 'example.com';

    function acmeCoreHTML() {
        return `
            <div class="acme-container">
                <!-- STEP 1: Domain Creation & Certificate Profile -->
                <div class="acme-section acme-section-highlight">
                    <div class="acme-section-title">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        New Certificate — Domain Setup
                        <span class="status-badge status-online" style="margin-left:auto;"><span class="status-dot"></span>Let's Encrypt</span>
                    </div>
                    <div class="step-indicator">
                        <span class="step active">1. Domain</span>
                        <span class="step-sep">→</span>
                        <span class="step">2. Validation</span>
                        <span class="step-sep">→</span>
                        <span class="step">3. Issuance</span>
                        <span class="step-sep">→</span>
                        <span class="step">4. Active</span>
                    </div>
                    <div class="acme-field-row">
                        <div class="input-group" style="flex:2;">
                            <label>Common Name (CN)</label>
                            <input type="text" class="ent-field" id="acme-cn" value="example.com" placeholder="e.g. app.yourdomain.com" style="font-family:monospace;">
                        </div>
                        <div class="input-group" style="flex:1;">
                            <label>Certificate Profile</label>
                            <select class="ent-field" id="acme-profile">
                                <option value="server">Server (HTTPS/TLS)</option>
                                <option value="client">Client (mTLS)</option>
                                <option value="ssh-user">SSH User (smallstep)</option>
                                <option value="ssh-host">SSH Host (smallstep)</option>
                                <option value="code-signing">Code Signing</option>
                                <option value="custom">Custom Profile</option>
                            </select>
                        </div>
                    </div>
                    <div class="acme-field-row">
                        <div class="input-group" style="flex:1;">
                            <label>Subject Alternative Names (SANs)</label>
                            <input type="text" class="ent-field" id="acme-sans" value="*.example.com, api.example.com, www.example.com" placeholder="*.domain.com, api.domain.com">
                        </div>
                    </div>
                    <div class="acme-field-row">
                        <div class="input-group" style="flex:1;">
                            <label>Organization (O)</label>
                            <input type="text" class="ent-field" id="acme-org" value="Acme Corp" placeholder="Your Organization">
                        </div>
                        <div class="input-group" style="flex:1;">
                            <label>Country (C)</label>
                            <select class="ent-field" id="acme-country">
                                <option value="US">United States (US)</option>
                                <option value="IN" selected>India (IN)</option>
                                <option value="GB">United Kingdom (GB)</option>
                                <option value="DE">Germany (DE)</option>
                                <option value="SG">Singapore (SG)</option>
                                <option value="JP">Japan (JP)</option>
                                <option value="AU">Australia (AU)</option>
                            </select>
                        </div>
                        <div class="input-group" style="flex:1;">
                            <label>Validity (Days)</label>
                            <input type="number" class="ent-field" id="acme-validity" value="90">
                        </div>
                    </div>
                    <div class="acme-provisioners">
                        <div class="provisioner-info">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                            <span>Provisioner: <strong>Admin JIT Provisioner</strong> (OIDC-enabled, like smallstep)</span>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: Provisioners & Identity (smallstep-like) -->
                <div class="acme-section">
                    <div class="acme-section-title">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Provisioners & Identity (smallstep-compatible)
                    </div>
                    <div class="provisioner-grid">
                        <div class="provisioner-card active">
                            <div class="prov-icon prov-icon-oidc">OIDC</div>
                            <div class="prov-info">
                                <strong>Admin JIT</strong>
                                <span>OIDC · Google Workspace</span>
                            </div>
                            <span class="status-badge status-online"><span class="status-dot"></span>Active</span>
                        </div>
                        <div class="provisioner-card">
                            <div class="prov-icon prov-icon-acme">ACME</div>
                            <div class="prov-info">
                                <strong>ACME Agent</strong>
                                <span>Automated · No OIDC</span>
                            </div>
                            <span class="status-badge status-online"><span class="status-dot"></span>Active</span>
                        </div>
                        <div class="provisioner-card">
                            <div class="prov-icon prov-icon-saml">SAML</div>
                            <div class="prov-info">
                                <strong>Enterprise SSO</strong>
                                <span>SAML · Azure AD</span>
                            </div>
                            <span class="status-badge status-offline"><span class="status-dot"></span>Inactive</span>
                        </div>
                        <div class="provisioner-card">
                            <div class="prov-icon prov-icon-password">PWD</div>
                            <div class="prov-info">
                                <strong>Local Admin</strong>
                                <span>Password · Offline token</span>
                            </div>
                            <span class="status-badge status-online"><span class="status-dot"></span>Active</span>
                        </div>
                    </div>
                    <div class="acme-field-row" style="margin-top:12px;">
                        <div class="input-group" style="flex:1;">
                            <label>JWT / OIDC Token (for Admin JIT provisioner)</label>
                            <input type="text" class="ent-field" value="eyJhbGciOiJSUzI1NiIsImtpZCI6I..." placeholder="Paste JWT or OIDC token">
                        </div>
                        <button class="btn btn-outline" style="white-space:nowrap; height:fit-content; align-self:flex-end; padding:12px 16px;">Verify</button>
                    </div>
                </div>

                <!-- Domain List with Cert Status -->
                <div class="acme-section">
                    <div class="acme-section-title">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Managed Certificates
                        <span class="status-badge status-online" style="margin-left:auto; font-size:0.65rem;">3 Active</span>
                    </div>
                    <div class="acme-domain-list">
                        <div class="acme-domain-item" data-domain="example.com" onclick="acmeSelectedDomain='example.com';document.querySelectorAll('.acme-domain-item').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');">
                            <div class="domain-cert-status">
                                <span class="cert-led cert-led-valid"></span>
                            </div>
                            <span class="acme-domain-name">example.com</span>
                            <span class="domain-cert-info">ECDSA P-256 · SHA-256</span>
                            <span class="status-badge status-online"><span class="status-dot"></span>Valid</span>
                            <span class="domain-expiry">Exp: 2026-10-02</span>
                        </div>
                        <div class="acme-domain-item selected" data-domain="*.example.com" onclick="acmeSelectedDomain='*.example.com';document.querySelectorAll('.acme-domain-item').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');">
                            <div class="domain-cert-status">
                                <span class="cert-led cert-led-valid"></span>
                            </div>
                            <span class="acme-domain-name">*.example.com</span>
                            <span class="domain-cert-info">RSA 2048 · SHA-256</span>
                            <span class="status-badge status-online"><span class="status-dot"></span>Valid</span>
                            <span class="domain-expiry">Exp: 2026-09-15</span>
                        </div>
                        <div class="acme-domain-item" data-domain="api.example.com" onclick="acmeSelectedDomain='api.example.com';document.querySelectorAll('.acme-domain-item').forEach(d=>d.classList.remove('selected'));this.classList.add('selected');">
                            <div class="domain-cert-status">
                                <span class="cert-led cert-led-pending"></span>
                            </div>
                            <span class="acme-domain-name">api.example.com</span>
                            <span class="domain-cert-info">—</span>
                            <span class="status-badge status-offline"><span class="status-dot"></span>Pending</span>
                            <span class="domain-expiry">—</span>
                        </div>
                        <div class="acme-domain-item" onclick="alert('Create new certificate for this domain');">
                            <div class="domain-cert-status">
                                <span style="color:var(--text-muted);font-size:1.2rem;">+</span>
                            </div>
                            <span class="acme-domain-name" style="color:var(--text-muted);">internal.service.local</span>
                            <span class="domain-cert-info">—</span>
                            <span class="status-badge" style="background:rgba(99,102,241,0.15);color:var(--primary);border:1px solid rgba(99,102,241,0.3);">New</span>
                            <span class="domain-expiry">—</span>
                        </div>
                    </div>
                </div>

                <!-- Certificate Details Panel -->
                <div class="acme-section" id="acme-cert-details">
                    <div class="acme-section-title">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        Certificate Details — *.example.com
                    </div>
                    <div class="cert-detail-grid">
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Serial Number</span>
                            <span class="cert-detail-val mono">04:A3:7B:1F:8C:22:D9:45:EB:11:6F:00:3A:98:CC:77</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Subject</span>
                            <span class="cert-detail-val mono">CN = *.example.com</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Issuer</span>
                            <span class="cert-detail-val mono">CN = R3, O = Let's Encrypt</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Not Before</span>
                            <span class="cert-detail-val">2026-06-15 00:00:00 UTC</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Not After</span>
                            <span class="cert-detail-val" style="color:var(--warning);">2026-09-15 23:59:59 UTC</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">SANs</span>
                            <span class="cert-detail-val mono">*.example.com, example.com</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Signature Algorithm</span>
                            <span class="cert-detail-val">SHA-256 With RSA Encryption</span>
                        </div>
                        <div class="cert-detail-item">
                            <span class="cert-detail-label">Public Key</span>
                            <span class="cert-detail-val">RSA (2048 bits)</span>
                        </div>
                        <div class="cert-detail-item" style="grid-column:span 2;">
                            <span class="cert-detail-label">Fingerprint (SHA-256)</span>
                            <span class="cert-detail-val mono" style="font-size:0.7rem;">A3:8B:1C:4D:5E:F0:12:34:56:78:90:AB:CD:EF:01:23:45:67:89:0A:BC:DE:F0:12:34:56:78:90:AB:CD:EF:01</span>
                        </div>
                    </div>
                </div>

                <!-- Download & Actions -->
                <div class="acme-section">
                    <div class="acme-section-title">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download & Actions
                    </div>
                    <div class="acme-download-grid">
                        <button class="acme-dl-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8l-4 4-4-4"></path><path d="M12 12v8"></path></svg>
                            Certificate (PEM)
                        </button>
                        <button class="acme-dl-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8l-4 4-4-4"></path><path d="M12 12v8"></path></svg>
                            Private Key (PEM)
                        </button>
                        <button class="acme-dl-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8l-4 4-4-4"></path><path d="M12 12v8"></path></svg>
                            Full Chain (PEM)
                        </button>
                        <button class="acme-dl-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8l-4 4-4-4"></path><path d="M12 12v8"></path></svg>
                            PKCS#12 (PFX)
                        </button>
                    </div>
                    <div class="acme-actions" style="margin-top:16px;">
                        <button class="btn btn-primary ent-apply-btn" style="flex:1;justify-content:center;">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Issue & Install Certificate
                        </button>
                        <button class="btn btn-outline ent-test-btn" style="flex:1;justify-content:center;">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Renew Selected
                        </button>
                    </div>
                </div>

                <!-- SSH Certificate Section (smallstep feature) -->
                <div class="acme-section">
                    <div class="acme-section-title">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        SSH Certificates (smallstep-compatible)
                    </div>
                    <div class="acme-field-row">
                        <div class="input-group" style="flex:1;">
                            <label>SSH User</label>
                            <input type="text" class="ent-field" value="deploy" placeholder="username">
                        </div>
                        <div class="input-group" style="flex:1;">
                            <label>Principals</label>
                            <input type="text" class="ent-field" value="deploy,root,ubuntu" placeholder="user,admin">
                        </div>
                        <div class="input-group" style="flex:1;">
                            <label>Validity (Hours)</label>
                            <input type="number" class="ent-field" value="24">
                        </div>
                    </div>
                    <div class="acme-actions" style="margin-top:8px;">
                        <button class="btn btn-outline" style="flex:1;justify-content:center;" onclick="alert('SSH Certificate issued for deploy@*.example.com (valid for 24h)')">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Issue SSH Cert
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="acme-actions">
                    <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="alert(
'Certificate Issuance Workflow\\n\\n' +
'1. Domain: ' + document.getElementById('acme-cn').value + '\\n' +
'2. Profile: ' + document.getElementById('acme-profile').value + '\\n' +
'3. SANs: ' + document.getElementById('acme-sans').value + '\\n' +
'4. Algorithm: ' + (document.querySelector('input[name=\\'key-algo\\']:checked')?.closest('.acme-algo-card')?.querySelector('.algo-name')?.textContent || 'ECDSA P-256') + '\\n\\n' +
'Status: Order Created → Pending Authorization → Validating → Issued\\n' +
'This is a UI prototype (like smallstep CA). Backend pending.');
">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Quick Issue
                    </button>
                    <button class="btn btn-outline" style="flex:1;justify-content:center;" onclick="alert('CA certificate and intermediate downloaded successfully.\\n\\nAdd to system trust store:\\n  sudo cp ca.crt /usr/local/share/ca-certificates/\\n  sudo update-ca-certificates');">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        Download CA Bundle
                    </button>
                </div>
            </div>
        `;
    }

    function initACMETabs() {
        document.querySelectorAll('.acme-provider-card, .acme-challenge-card, .acme-algo-card').forEach(card => {
            card.addEventListener('click', function() {
                const parent = this.parentElement;
                parent.querySelectorAll('.active').forEach(a => a.classList.remove('active'));
                this.classList.add('active');
                this.querySelector('input[type="radio"]').checked = true;
            });
        });
    }

    backToEntGrid.addEventListener('click', () => {
        document.querySelectorAll('.enterprise-header, .enterprise-grid').forEach(el => {
            el.classList.remove('hidden');
        });
        entConfigView.classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.ent-btn');
        if (btn) {
            e.preventDefault();
            const config = btn.getAttribute('data-config');
            openEntConfigView(config);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('ent-apply-btn')) {
            e.preventDefault();
            const isACME = entTitle.textContent.includes('ACME');
            if (isACME) {
                const provider = document.querySelector('input[name="acme-provider"]:checked');
                const algo = document.querySelector('input[name="key-algo"]:checked');
                const challenge = document.querySelector('input[name="challenge"]:checked');
                const algoLabel = algo?.closest('.acme-algo-card')?.querySelector('.algo-name')?.textContent || 'ECDSA P-256';
                const providerLabel = provider?.closest('.acme-provider-card')?.querySelector('.acme-provider-name')?.textContent || 'Let\'s Encrypt';
                const challengeLabel = challenge?.closest('.acme-challenge-card')?.querySelector('strong')?.textContent || 'HTTP Challenge';
                alert(
`ACME Certificate Request Initiated

Provider: ${providerLabel}
Key Algorithm: ${algoLabel}
Challenge: ${challengeLabel}

Order Status: Processing
Authorization: Pending
Validation: Pending
Issuance: Queued

This is a UI prototype. ACME backend integration is pending.`);
            } else {
                const title = entTitle.textContent;
                alert(`Configuration saved for: ${title}\n\nThis is a UI prototype. Backend integration is pending.`);
            }
            // Go back to enterprise grid
            document.querySelectorAll('.enterprise-header, .enterprise-grid').forEach(el => {
                el.classList.remove('hidden');
            });
            entConfigView.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('ent-test-btn')) {
            e.preventDefault();
            alert(
`ACME Dry-Run Test

✓ ACME Directory Reachable
✓ Account Registered (admin@example.com)
✓ Domain Validation Ready
✓ Challenge Configured
✓ Key Pair Generated
× Certificate Issuance: SKIPPED (dry-run)

Dry-run completed successfully. No certificates were issued.`);
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
