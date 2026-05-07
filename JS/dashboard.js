// dashboard.js  (Admin panel)

document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('[data-tab]');
    const tabs     = document.querySelectorAll('.admin-tab');

    if (!navLinks.length || !tabs.length) return;

    // Initial Load
    loadUsersTable();
    loadSellersTable();
    loadVerificationQueue();

    // ── TAB SWITCHING ──────────────────────────────────────────────────────
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabs.forEach(tab => {
                const isActive = tab.id === tabId;
                tab.classList.toggle('active', isActive);
                tab.style.display = isActive ? 'block' : 'none';
            });

            if (tabId === 'users') loadUsersTable();
            if (tabId === 'sellers') loadSellersTable();
            if (tabId === 'verification') loadVerificationQueue();
        });
    });

    // ── LOGOUT ─────────────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = '../index.html';
            }
        });
    }

    // ── MOBILE MENU ────────────────────────────────────────────────────────
    const hamburger  = document.getElementById('hamburger');
    const navbarMenu = document.getElementById('navbarMenu');
    if (hamburger && navbarMenu) {
        hamburger.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
});

// ── USER TABLE ─────────────────────────────────────────────────────────────
function loadUsersTable() {
    const tbody = document.querySelector('#users table tbody');
    if (!tbody) return;
    const users = DB.users;
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>#${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.joinDate || 'N/A'}</td>
            <td>${user.orders || 0}</td>
            <td><span class="status-badge active">${user.status || 'ACTIVE'}</span></td>
            <td>
                <button class="btn btn-small btn-danger" onclick="banUser('${user.id}')">Ban</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7">No users found.</td></tr>';
}

// ── SELLER TABLE ───────────────────────────────────────────────────────────
function loadSellersTable() {
    const tbody = document.querySelector('#sellers table tbody');
    if (!tbody) return;
    const sellers = DB.sellers;
    tbody.innerHTML = sellers.map(s => `
        <tr>
            <td>${s.brandName}</td>
            <td>${s.owner}</td>
            <td>${s.products || 0}</td>
            <td>${s.revenue || '0 EGP'}</td>
            <td>${s.rating || 'N/A'}</td>
            <td><span class="status-badge verified">${s.status.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-small btn-danger" onclick="suspendSeller('${s.id}')">Suspend</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7">No sellers found.</td></tr>';
}

// ── VERIFICATION QUEUE ─────────────────────────────────────────────────────
function loadVerificationQueue() {
    const container = document.querySelector('.verification-cards');
    if (!container) return;

    const apps = DB.applications.filter(a => a.status === 'pending');

    if (apps.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary);">No pending applications.</div>';
        return;
    }

    container.innerHTML = apps.map(app => `
        <div class="verification-card" id="card-${app.id}">
            <div class="verification-header">
                <h4>${app.brandName}</h4>
                <span class="status-badge pending">Pending</span>
            </div>
            <div class="verification-details">
                <p><strong>Owner:</strong> ${app.ownerName}</p>
                <p><strong>Email:</strong> ${app.sellerEmail}</p>
                <p><strong>Phone:</strong> ${app.ownerPhone}</p>
                <p><strong>Category:</strong> ${app.brandCategory}</p>
                <p><strong>Applied:</strong> ${new Date(app.appliedAt).toLocaleDateString()}</p>
            </div>
            <div class="verification-actions">
                <button class="btn btn-primary" onclick="processApp('${app.id}', 'approve')">Approve</button>
                <button class="btn btn-danger" onclick="processApp('${app.id}', 'reject')">Reject</button>
            </div>
        </div>
    `).join('');
}

window.processApp = (id, action) => {
    const apps = DB.applications;
    const appIndex = apps.findIndex(a => a.id === id);
    if (appIndex === -1) return;

    if (action === 'approve') {
        const app = apps[appIndex];
        const sellers = DB.sellers;
        sellers.push({
            id: 'S-' + Date.now(),
            brandName: app.brandName,
            owner: app.ownerName,
            email: app.sellerEmail,
            products: 0,
            revenue: '0 EGP',
            rating: '★★★☆☆ (0)',
            status: 'verified'
        });
        DB.save('niledrip_sellers', sellers);
        showToast(`Brand "${app.brandName}" approved!`);
    } else {
        showToast(`Application rejected.`, "error");
    }

    // Remove from applications or update status
    apps.splice(appIndex, 1);
    DB.saveApplications(apps);
    loadVerificationQueue();
    loadSellersTable();
};
