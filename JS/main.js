document.addEventListener("DOMContentLoaded", async () => {
    const currentUser = (typeof DB !== "undefined" && DB.getCurrentUser) ? DB.getCurrentUser() : null;
    if (currentUser?.role === "seller") {
        const path = window.location.pathname.toLowerCase();
        const onSellerPage = path.endsWith("/seller-dashboard.html") || path.endsWith("seller-dashboard.html");
        if (!onSellerPage) {
            window.location.href = getPagePath("seller-dashboard.html");
            return;
        }
    }
    if (typeof updateNavbarAuth === "function") updateNavbarAuth();
    if (typeof updateNavbarBadges === "function") updateNavbarBadges();
    if (window.NILEDRIP_I18N?.apply) window.NILEDRIP_I18N.apply(document);
    if (typeof DB !== "undefined" && typeof DB.syncUserStateFromBackend === "function") {
        DB.syncUserStateFromBackend();
    }

    const featuredGrid = document.getElementById("featuredGrid");
    if (featuredGrid && typeof Api !== "undefined") {
        featuredGrid.innerHTML = Array.from({ length: 4 }).map(() => `
            <article class="product-card">
                <div class="product-image-link" style="background:var(--bg-secondary)"></div>
                <div class="card-info"><h3>Loading...</h3><p>--</p></div>
            </article>
        `).join("");
        try {
            const productsRes = await Api.getProducts({ page: 1, limit: 8, sortBy: "newest" });
            const sellersRes = await Api.getSellers({ page: 1, limit: 200 });
            const products = productsRes.items || [];
            const sellers = sellersRes.items || [];
            if (!products.length) {
                featuredGrid.innerHTML = `<p class="no-products">No products available yet.</p>`;
            } else {
                featuredGrid.innerHTML = products.map((p) => {
                    const seller = sellers.find((s) => String(s._id || s.id) === String(p.sellerId));
                    const totalStock = (p.variants || []).reduce((sum, c) => sum + (c.sizes || []).reduce((s, z) => s + Number(z.stock || 0), 0), 0);
                    const stockLabel = totalStock <= 0 ? "Out of stock" : (totalStock <= 5 ? `Low stock (${totalStock})` : "In stock");
                    return `<article class="product-card">
                        <a href="${getPagePath(`Product.html?id=${p._id || p.id}`)}" class="product-image-link"><img src="${p.images?.[0] || ""}" alt="${p.name}"></a>
                        <span class="stock-chip ${totalStock <= 0 ? "out" : (totalStock <= 5 ? "low" : "ok")}">${stockLabel}</span>
                        <div class="card-info">
                            <h3>${p.name}</h3>
                            <p>${p.price} EGP</p>
                            <p class="rating-row">${"★".repeat(Math.round(Number(p.averageRating || 0))).padEnd(5, "☆")} <small>(${Number(p.reviewCount || 0)})</small></p>
                            <p style="display:flex;align-items:center;gap:8px;">
                                <img src="${p.sellerLogo || seller?.logo || ""}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);">
                                <a href="${getPagePath(`seller.html?sellerId=${p.sellerId}`)}">${p.sellerName || seller?.name || "Unknown Seller"}</a>
                            </p>
                        </div>
                    </article>`;
                }).join("");
            }
        } catch {
            featuredGrid.innerHTML = `<p class="no-products">Unable to load featured products.</p>`;
        }
        if (window.NILEDRIP_I18N?.apply) window.NILEDRIP_I18N.apply(featuredGrid);
    }

    const joinBtn = document.getElementById("newsJoinBtn");
    const newsEmail = document.getElementById("newsEmail");
    if (joinBtn && newsEmail) {
        joinBtn.addEventListener("click", () => {
            const email = String(newsEmail.value || "").trim().toLowerCase();
            if (!validateEmail(email)) return showToast("Please enter a valid email.", "error");
            showToast("Thanks for joining the NileDrip newsletter.", "success");
            newsEmail.value = "";
        });
    }
});
