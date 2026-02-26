<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayCoinADS • Admin Panel</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
        }

        body {
            background: #0a0b0e;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: auto;
        }

        /* Animated background */
        .parallax-bg {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -1;
            overflow: hidden;
            pointer-events: none;
        }
        .glow-shape {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.6;
            animation: floatShape 20s infinite alternate ease-in-out;
        }
        .shape-1 { width: 300px; height: 300px; background: rgba(255, 215, 0, 0.15); top: -100px; left: -100px; }
        .shape-2 { width: 400px; height: 400px; background: rgba(60, 186, 146, 0.1); bottom: -150px; right: -100px; animation-delay: -5s; }
        .shape-3 { width: 250px; height: 250px; background: rgba(255, 165, 0, 0.12); top: 40%; left: 50%; animation-delay: -10s; }
        
        @keyframes floatShape {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(30px, -50px) scale(1.1); }
            100% { transform: translate(-40px, 40px) scale(0.9); }
        }

        .container {
            width: 100%;
            max-width: 1200px;
            z-index: 1;
            position: relative;
        }

        /* Header */
        .header {
            background: rgba(20, 22, 27, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.15);
            border-radius: 30px;
            padding: 20px 30px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header-badge {
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            padding: 8px 16px;
            border-radius: 40px;
            color: #ffd700;
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .header-badge i {
            font-size: 16px;
        }

        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: rgba(20, 22, 27, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 215, 0, 0.1);
            border-radius: 24px;
            padding: 20px;
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-4px);
            border-color: rgba(255, 215, 0, 0.3);
            box-shadow: 0 10px 25px rgba(255, 215, 0, 0.1);
        }

        .stat-label {
            color: #8e8e9d;
            font-size: 14px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #ffd700;
            line-height: 1.2;
        }

        .stat-unit {
            font-size: 14px;
            color: #8e8e9d;
            margin-left: 4px;
        }

        /* Table Card */
        .table-card {
            background: rgba(20, 22, 27, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 215, 0, 0.1);
            border-radius: 30px;
            padding: 25px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        }

        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .table-title {
            font-size: 18px;
            font-weight: 600;
            color: #ffd700;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .table-title span {
            background: rgba(255, 215, 0, 0.1);
            padding: 4px 10px;
            border-radius: 40px;
            font-size: 14px;
            color: #b0b0c0;
        }

        .search-box {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 215, 0, 0.2);
            border-radius: 40px;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #8e8e9d;
        }

        .search-box input {
            background: transparent;
            border: none;
            outline: none;
            color: #fff;
            font-size: 14px;
            min-width: 200px;
        }

        .search-box input::placeholder {
            color: #5e5e71;
        }

        /* Table Styles */
        .table-wrapper {
            overflow-x: auto;
            border-radius: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 600px;
        }

        th {
            text-align: left;
            padding: 15px 20px;
            background: rgba(255, 215, 0, 0.05);
            color: #ffd700;
            font-weight: 600;
            font-size: 14px;
            white-space: nowrap;
        }

        td {
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: #fff;
            font-size: 14px;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: rgba(255, 215, 0, 0.02);
        }

        .user-id {
            font-family: monospace;
            color: #ffd700;
            font-weight: 500;
        }

        .username {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .username-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2a2a3c, #1a1a28);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #ffd700;
        }

        .coins {
            color: #ffd700;
            font-weight: 600;
        }

        .date {
            color: #8e8e9d;
            font-size: 13px;
        }

        .badge {
            background: rgba(255, 215, 0, 0.1);
            padding: 4px 10px;
            border-radius: 40px;
            font-size: 12px;
            color: #ffd700;
            display: inline-block;
        }

        /* Loading State */
        .loading-state {
            text-align: center;
            padding: 60px 20px;
        }

        .loader {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255, 215, 0, 0.1);
            border-radius: 50%;
            border-top-color: #ffd700;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-text {
            color: #8e8e9d;
            font-size: 16px;
        }

        /* Error State */
        .error-state {
            text-align: center;
            padding: 60px 20px;
            background: rgba(255, 71, 87, 0.05);
            border-radius: 20px;
            border: 1px solid rgba(255, 71, 87, 0.2);
        }

        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }

        .error-message {
            color: #ff4757;
            font-size: 18px;
            margin-bottom: 20px;
        }

        .retry-btn {
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            color: #ffd700;
            padding: 12px 30px;
            border-radius: 40px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .retry-btn:hover {
            background: rgba(255, 215, 0, 0.15);
            transform: scale(1.05);
        }

        /* Footer */
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #5e5e71;
            font-size: 12px;
        }

        /* No Data */
        .no-data {
            text-align: center;
            padding: 40px;
            color: #8e8e9d;
        }
    </style>
</head>
<body>
    <div class="parallax-bg">
        <div class="glow-shape shape-1"></div>
        <div class="glow-shape shape-2"></div>
        <div class="glow-shape shape-3"></div>
    </div>

    <div class="container">
        <div class="header">
            <h1>⚡ PayCoinADS Admin</h1>
            <div class="header-badge">
                <i>👑</i>
                <span id="adminStatus">Checking...</span>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">👥 Total Users</div>
                <div class="stat-value" id="totalUsers">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">💰 Total Coins</div>
                <div class="stat-value" id="totalCoins">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">📊 Avg. Coins</div>
                <div class="stat-value" id="avgCoins">-</div>
            </div>
        </div>

        <!-- Main Table Card -->
        <div class="table-card">
            <div class="table-header">
                <div class="table-title">
                    📋 User Management
                    <span id="userCount">0 users</span>
                </div>
                <div class="search-box">
                    <i>🔍</i>
                    <input type="text" id="searchInput" placeholder="Search by ID or username..." onkeyup="filterTable()">
                </div>
            </div>

            <div class="table-wrapper" id="tableWrapper">
                <!-- Table will be populated by JavaScript -->
                <div class="loading-state" id="loadingState">
                    <div class="loader"></div>
                    <div class="loading-text">Loading user data...</div>
                </div>
            </div>
        </div>

        <div class="footer">
            PayCoinADS • Admin Panel • Secure Access Only
        </div>
    </div>

    <script>
        const tg = window.Telegram?.WebApp;
        let allUsers = [];
        let filteredUsers = [];

        // Initialize Telegram WebApp
        if (tg) {
            tg.expand();
            tg.ready();
            console.log('Telegram WebApp initialized');
        }

        // Get init data
        const initData = tg?.initData || '';

        // DOM Elements
        const adminStatusEl = document.getElementById('adminStatus');
        const totalUsersEl = document.getElementById('totalUsers');
        const totalCoinsEl = document.getElementById('totalCoins');
        const avgCoinsEl = document.getElementById('avgCoins');
        const userCountEl = document.getElementById('userCount');
        const tableWrapper = document.getElementById('tableWrapper');
        const loadingState = document.getElementById('loadingState');

        // ==================== Helper Functions ====================
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function formatNumber(num) {
            return num?.toLocaleString() || '0';
        }

        // Escape HTML to prevent XSS
        function escapeHTML(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // ==================== Render Table ====================
        function renderTable(users) {
            if (!users || users.length === 0) {
                tableWrapper.innerHTML = `
                    <div class="no-data">
                        <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                        <div style="color: #8e8e9d;">No users found</div>
                    </div>
                `;
                return;
            }

            let tableHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Username</th>
                            <th>Coins</th>
                            <th>Joined Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            users.forEach(user => {
                const escapedUsername = escapeHTML(user.username || 'No username');
                const joinedDate = formatDate(user.createdAt);
                
                tableHTML += `
                    <tr>
                        <td><span class="user-id">${user.userId}</span></td>
                        <td>
                            <div class="username">
                                <div class="username-avatar">👤</div>
                                @${escapedUsername}
                            </div>
                        </td>
                        <td><span class="coins">🪙 ${formatNumber(user.coins)}</span></td>
                        <td><span class="date">${joinedDate}</span></td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            tableWrapper.innerHTML = tableHTML;
        }

        // ==================== Filter Table ====================
        function filterTable() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            
            if (!searchTerm) {
                filteredUsers = allUsers;
            } else {
                filteredUsers = allUsers.filter(user => 
                    user.userId.toString().includes(searchTerm) || 
                    (user.username && user.username.toLowerCase().includes(searchTerm))
                );
            }

            renderTable(filteredUsers);
            userCountEl.textContent = `${filteredUsers.length} users`;
        }

        // ==================== Update Stats ====================
        function updateStats(users) {
            const totalUsers = users.length;
            const totalCoins = users.reduce((sum, user) => sum + (user.coins || 0), 0);
            const avgCoins = totalUsers > 0 ? Math.round(totalCoins / totalUsers) : 0;

            totalUsersEl.textContent = formatNumber(totalUsers);
            totalCoinsEl.textContent = `🪙 ${formatNumber(totalCoins)}`;
            avgCoinsEl.textContent = `🪙 ${formatNumber(avgCoins)}`;
            userCountEl.textContent = `${totalUsers} users`;
        }

        // ==================== Fetch Users ====================
        async function fetchUsers() {
            // Show loading state
            tableWrapper.innerHTML = `
                <div class="loading-state">
                    <div class="loader"></div>
                    <div class="loading-text">Loading user data...</div>
                </div>
            `;

            try {
                const response = await fetch('/api/admin/users', {
                    method: 'GET',
                    headers: {
                        'X-Telegram-Init-Data': initData,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch users');
                }

                // Check if admin
                if (response.status === 403) {
                    adminStatusEl.textContent = '⛔ Access Denied';
                    tableWrapper.innerHTML = `
                        <div class="error-state">
                            <div class="error-icon">⛔</div>
                            <div class="error-message">Admin access required</div>
                            <div style="color: #8e8e9d; margin-top: 10px;">You are not authorized to view this page.</div>
                        </div>
                    `;
                    return;
                }

                // Success
                adminStatusEl.textContent = '✅ Admin Verified';
                allUsers = data.users || [];
                filteredUsers = allUsers;
                
                // Update stats and render
                updateStats(allUsers);
                renderTable(allUsers);

            } catch (error) {
                console.error('Error fetching users:', error);
                adminStatusEl.textContent = '❌ Error';
                
                tableWrapper.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">❌</div>
                        <div class="error-message">${escapeHTML(error.message)}</div>
                        <button class="retry-btn" onclick="fetchUsers()">🔄 Try Again</button>
                    </div>
                `;
            }
        }

        // ==================== Check Admin Status on Load ====================
        (async function checkAdminOnLoad() {
            if (!initData) {
                adminStatusEl.textContent = '❌ No Telegram Data';
                tableWrapper.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">📵</div>
                        <div class="error-message">This page must be opened from Telegram</div>
                        <div style="color: #8e8e9d; margin-top: 10px;">Please use the Telegram Bot to access admin panel.</div>
                    </div>
                `;
                return;
            }

            // Fetch users immediately
            await fetchUsers();
        })();

        // Refresh data every 30 seconds (optional)
        setInterval(() => {
            if (allUsers.length > 0) { // Only refresh if we already have data
                fetchUsers();
            }
        }, 30000);
    </script>
</body>
</html>
