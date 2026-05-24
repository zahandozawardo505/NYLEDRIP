(async function () {
  const current = DB.getCurrentUser();
  if (!current || current.role !== "admin") {
    if (typeof requireRole === "function") requireRole("admin", "Admin access requires an admin account.");
    else window.location.href = "login.html";
    return;
  }
  if (!Api.token()) {
    showToast("Admin session missing. Please login again.", "error");
    window.location.href = "login.html";
    return;
  }

  let users = [];
  let sellers = [];
  let orders = [];
  let products = [];
  let applications = [];
  const TABLE_PAGE_SIZE = 10;
  let usersPage = 1;
  let sellersPage = 1;
  let appsPage = 1;

  function toCsv(headers, rows) {
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
  }
  function downloadCsv(filename, csv) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
  function renderStats() {
    const revenue = orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
    const stats = document.getElementById("adminStats");
    if (!stats) return;
    stats.innerHTML = `
      <div class="stat-card"><div class="stat-info"><h4>Total Users</h4><p class="stat-number">${users.length}</p></div></div>
      <div class="stat-card"><div class="stat-info"><h4>Total Sellers</h4><p class="stat-number">${sellers.length}</p></div></div>
      <div class="stat-card"><div class="stat-info"><h4>Total Orders</h4><p class="stat-number">${orders.length}</p></div></div>
      <div class="stat-card"><div class="stat-info"><h4>Total Revenue</h4><p class="stat-number">${revenue} EGP</p></div></div>`;
  }
  function pager(totalRows, page, targetId, cls) {
    const totalPages = Math.max(1, Math.ceil(totalRows / TABLE_PAGE_SIZE));
    const prev = Math.max(1, page - 1);
    const next = Math.min(totalPages, page + 1);
    return totalPages > 1
      ? `<div id="${targetId}" class="${cls}" style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;">
          <button class="btn btn-small btn-secondary table-page-btn" data-target="${targetId}" data-page="${prev}" ${page <= 1 ? "disabled" : ""}>Prev</button>
          <span>Page ${page} / ${totalPages}</span>
          <button class="btn btn-small btn-secondary table-page-btn" data-target="${targetId}" data-page="${next}" ${page >= totalPages ? "disabled" : ""}>Next</button>
        </div>`
      : "";
  }
  function renderUsers(q = "") {
    const tbody = document.getElementById("adminUsersTbody");
    const holder = document.getElementById("adminUsersPager");
    if (!tbody) return;
    const search = q.trim().toLowerCase();
    const rows = users.filter(u => !search || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search));
    const pageCount = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
    usersPage = Math.min(usersPage, pageCount);
    const start = (usersPage - 1) * TABLE_PAGE_SIZE;
    const paged = rows.slice(start, start + TABLE_PAGE_SIZE);
    tbody.innerHTML = paged.map(u => `
      <tr>
        <td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td>
        <td><span class="status-badge ${u.status === "BANNED" ? "pending" : "verified"}">${u.status || "ACTIVE"}</span></td>
        <td><button class="btn btn-small btn-danger admin-ban-user" data-id="${u.id}">${u.status === "BANNED" ? "Unban" : "Ban"}</button></td>
      </tr>`).join("") || '<tr><td colspan="6">No users found.</td></tr>';
    if (holder) holder.innerHTML = pager(rows.length, usersPage, "adminUsersPager", "admin-table-pager");
  }
  function renderSellers(q = "") {
    const tbody = document.getElementById("adminSellersTbody");
    const holder = document.getElementById("adminSellersPager");
    if (!tbody) return;
    const search = q.trim().toLowerCase();
    const rows = sellers.filter(s => !search || `${s.name} ${s.email} ${s.status || ""}`.toLowerCase().includes(search));
    const pageCount = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
    sellersPage = Math.min(sellersPage, pageCount);
    const start = (sellersPage - 1) * TABLE_PAGE_SIZE;
    const paged = rows.slice(start, start + TABLE_PAGE_SIZE);
    tbody.innerHTML = paged.map(s => `
      <tr>
        <td>${s.id}</td><td>${s.name}</td><td>${s.email}</td>
        <td><span class="status-badge ${String(s.status).toLowerCase() === "suspended" ? "pending" : "verified"}">${s.status || "active"}</span></td>
        <td><button class="btn btn-small btn-danger admin-suspend-seller" data-id="${s.id}">${String(s.status).toLowerCase() === "suspended" ? "Activate" : "Suspend"}</button></td>
      </tr>`).join("") || '<tr><td colspan="5">No sellers found.</td></tr>';
    if (holder) holder.innerHTML = pager(rows.length, sellersPage, "adminSellersPager", "admin-table-pager");
  }
  function renderApplications() {
    const tbody = document.getElementById("adminApplicationsTbody");
    const holder = document.getElementById("adminApplicationsPager");
    if (!tbody) return;
    const pageCount = Math.max(1, Math.ceil(applications.length / TABLE_PAGE_SIZE));
    appsPage = Math.min(appsPage, pageCount);
    const start = (appsPage - 1) * TABLE_PAGE_SIZE;
    const paged = applications.slice(start, start + TABLE_PAGE_SIZE);
    tbody.innerHTML = paged.map(a => `
      <tr>
        <td>${a.brandName}</td>
        <td>${a.ownerName}</td>
        <td>${a.sellerEmail}</td>
        <td>${a.ownerPhone}</td>
        <td><span class="status-badge ${a.status === "accepted" ? "verified" : (a.status === "rejected" ? "pending" : "active")}">${a.status}</span></td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td>${a.status === "waiting" ? `<button class="btn btn-small btn-primary app-accept" data-id="${a._id}">Accept</button> <button class="btn btn-small btn-danger app-reject" data-id="${a._id}">Reject</button>` : "-"} ${a.businessLicenseUrl ? `<a class="btn btn-small btn-secondary" href="${a.businessLicenseUrl}" target="_blank" rel="noopener">View License</a>` : ''}</td>
      </tr>`).join("") || '<tr><td colspan="7">No applications.</td></tr>';
    if (holder) holder.innerHTML = pager(applications.length, appsPage, "adminApplicationsPager", "admin-table-pager");
  }
  async function refreshData() {
    const [productsRes, sellersRes, usersRes, ordersRes, appRes] = await Promise.all([
      Api.getProducts({ page: 1, limit: 500 }),
      Api.getSellers({ page: 1, limit: 500 }),
      Api.getUsersAdmin({ page: 1, limit: 500 }),
      Api.getOrders({ page: 1, limit: 500 }),
      Api.getSellerApplications({ page: 1, limit: 500 })
    ]);
    products = productsRes.items || [];
    sellers = (sellersRes.items || []).map(s => ({ ...s, id: String(s._id || s.id) }));
    users = (usersRes.items || []).map(u => ({ ...u, id: String(u._id || u.id) }));
    orders = ordersRes.items || [];
    applications = appRes.items || [];
  }

  function wireTabs() {
    const navLinks = document.querySelectorAll("[data-tab]");
    const tabs = document.querySelectorAll(".admin-tab");
    navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const id = link.getAttribute("data-tab");
        navLinks.forEach(n => n.classList.remove("active"));
        tabs.forEach(t => { t.classList.remove("active"); t.style.display = "none"; });
        link.classList.add("active");
        const tab = document.getElementById(id);
        if (tab) { tab.classList.add("active"); tab.style.display = "block"; }
      });
    });
  }

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    DB.logout();
    Api.setToken("");
    window.location.href = "../index.html";
  });
  document.getElementById("adminUserSearch")?.addEventListener("input", (e) => renderUsers(e.target.value));
  document.getElementById("adminSellerSearch")?.addEventListener("input", (e) => renderSellers(e.target.value));

    document.addEventListener("click", async (e) => {
    const tablePageBtn = e.target.closest(".table-page-btn");
    if (tablePageBtn) {
      const target = tablePageBtn.dataset.target;
      const page = Number(tablePageBtn.dataset.page || 1);
      if (target === "adminUsersPager") usersPage = page;
      if (target === "adminSellersPager") sellersPage = page;
      if (target === "adminApplicationsPager") appsPage = page;
      renderUsers(document.getElementById("adminUserSearch")?.value || "");
      renderSellers(document.getElementById("adminSellerSearch")?.value || "");
      renderApplications();
      return;
    }
    const banBtn = e.target.closest(".admin-ban-user");
    if (banBtn) {
      const id = String(banBtn.dataset.id);
      const target = users.find(u => u.id === id);
      if (!target) return;
      const nextStatus = target.status === "BANNED" ? "ACTIVE" : "BANNED";
      if (!confirm(`${nextStatus === "BANNED" ? "Ban" : "Unban"} user ${target.email}?`)) return;
      await Api.setUserStatus(id, nextStatus);
      users = users.map(u => u.id === id ? { ...u, status: nextStatus } : u);
      renderUsers(document.getElementById("adminUserSearch")?.value || "");
      return;
    }
    const suspendBtn = e.target.closest(".admin-suspend-seller");
    if (suspendBtn) {
      const id = String(suspendBtn.dataset.id);
      const seller = sellers.find(s => s.id === id);
      if (!seller) return;
      const nextStatus = String(seller.status).toLowerCase() === "suspended" ? "active" : "suspended";
      if (!confirm(`${nextStatus === "suspended" ? "Suspend" : "Activate"} seller ${seller.name}?`)) return;
      await Api.updateSeller(id, { status: nextStatus });
      sellers = sellers.map(s => s.id === id ? { ...s, status: nextStatus } : s);
      renderSellers(document.getElementById("adminSellerSearch")?.value || "");
      return;
    }
    const acceptBtn = e.target.closest(".app-accept");
    if (acceptBtn) {
      if (!confirm("Accept this seller application?")) return;
      await Api.reviewSellerApplication(acceptBtn.dataset.id, "accept");
      applications = (await Api.getSellerApplications({ page: 1, limit: 500 })).items || [];
      sellers = ((await Api.getSellers({ page: 1, limit: 500 })).items || []).map(s => ({ ...s, id: String(s._id || s.id) }));
      renderApplications();
      renderSellers(document.getElementById("adminSellerSearch")?.value || "");
      return;
    }
    const rejectBtn = e.target.closest(".app-reject");
    if (rejectBtn) {
      if (!confirm("Reject this seller application?")) return;
      await Api.reviewSellerApplication(rejectBtn.dataset.id, "reject");
      applications = (await Api.getSellerApplications({ page: 1, limit: 500 })).items || [];
      renderApplications();
      return;
    }
  });

  document.getElementById("exportUsersBtn")?.addEventListener("click", () => {
    downloadCsv("niledrip-users.csv", toCsv(["User ID", "Name", "Email", "Role", "Status"], users.map(u => [u.id, u.name, u.email, u.role, u.status || "ACTIVE"])));
  });
  document.getElementById("exportSellersBtn")?.addEventListener("click", () => {
    downloadCsv("niledrip-sellers.csv", toCsv(["Seller ID", "Name", "Email", "Status"], sellers.map(s => [s.id, s.name, s.email, s.status || "active"])));
  });
  document.getElementById("exportOrdersBtn")?.addEventListener("click", () => {
    downloadCsv("niledrip-orders.csv", toCsv(["Order ID", "Product ID", "Seller ID", "User ID", "Qty", "Total", "Status", "Date"], orders.map(o => [o.id, o.productId, o.sellerId, o.userId, o.quantity, o.totalPrice, o.status, o.createdAt])));
  });
  document.getElementById("exportProductsBtn")?.addEventListener("click", () => {
    downloadCsv("niledrip-products.csv", toCsv(["Product ID", "Seller ID", "Name", "Category", "Subcategory", "Price"], products.map(p => [p._id || p.id, p.sellerId, p.name, p.category, p.subcategory, p.price])));
  });

  wireTabs();
  try {
    await refreshData();
    renderStats();
    renderUsers();
    renderSellers();
    renderApplications();
  } catch (err) {
    alert(err?.message || "Failed to load admin dashboard data.");
  }
})();
