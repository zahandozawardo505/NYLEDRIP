(function () {
    let remoteProducts = [];
    let remoteSellers = [];
    let linkedReels = [];
    let activeView = "products";
    let activeReelsPlatform = "all";
    let productPagination = { page: 1, totalPages: 1 };
    const reelProductMap = new Map();
    const viewedReelKeys = new Set();
    let reelObserver = null;
    const PAGE_SIZE = 12;

    const shopLayout = document.getElementById("shopLayout");
    const viewSwitch = document.getElementById("shopViewSwitch");
    const filterDrawerToggle = document.getElementById("filterDrawerToggle");
    const filterDrawerPanel = document.getElementById("filterDrawerPanel");
    const productsView = document.getElementById("productsView");
    const reelsView = document.getElementById("reelsView");
    const reelsPlatformSwitch = document.getElementById("reelsPlatformSwitch");

    const grid = document.getElementById("productsGrid");
    const noProducts = document.getElementById("noProducts");
    const countEl = document.getElementById("productCount");
    const sortEl = document.getElementById("sortBy");
    const priceMinRange = document.getElementById("priceMinRange");
    const priceMaxRange = document.getElementById("priceMaxRange");
    const priceMinValue = document.getElementById("priceMinValue");
    const priceMaxValue = document.getElementById("priceMaxValue");
    const resetBtn = document.getElementById("resetFilters");
    const searchInput = document.getElementById("globalSearch");
    const suggestionsBox = document.getElementById("searchSuggestions");
    const pagerEl = document.getElementById("shopPagination");
    const sellerFiltersWrap = document.getElementById("sellerFilters");
    const sizeFiltersWrap = document.getElementById("sizeFilters");
    const colorFiltersWrap = document.getElementById("colorFilters");
    const availableOnlyEl = document.getElementById("availableOnly");
    const productCountInlineEl = document.getElementById("productCountInline");

    const reelsFeed = document.getElementById("shopReelsFeed");
    const reelsEmpty = document.getElementById("shopReelsEmpty");
    const reelModal = document.getElementById("reelFullscreenModal");
    const reelModalWrap = document.getElementById("reelFullscreenFrameWrap");
    const reelModalClose = document.getElementById("reelFullscreenCloseBtn");
    const quickViewModal = document.getElementById("quickViewModal");
    const quickViewCloseBtn = document.getElementById("quickViewCloseBtn");
    const quickViewContent = document.getElementById("quickViewContent");

    const BOTTOMS_GROUP = ["Pants", "Trousers", "Jeans", "Sweatpants", "Shorts"];
    const CATEGORY_ALIAS = {
        hoodies: "Hoodies & Sweatshirts",
        tees: "Tops",
        sweatpants: "Bottoms",
        accessories: "Accessories",
        jackets: "Jackets",
        shoes: "Shoes",
        tops: "Tops",
        bottoms: "Bottoms"
    };

    function applyUrlFilters() {
        const params = new URLSearchParams(window.location.search);
        const rawCategory = String(params.get("category") || "").trim().toLowerCase();
        const rawSub = String(params.get("subcategory") || "").trim();
        const rawGender = String(params.get("gender") || "").trim();
        const q = String(params.get("q") || "").trim();

        const mappedCategory = CATEGORY_ALIAS[rawCategory] || "";
        if (mappedCategory) {
            const catCb = [...document.querySelectorAll(".category-filter")].find((el) => String(el.value) === mappedCategory);
            if (catCb) catCb.checked = true;
        }
        if (rawSub) {
            const subCb = [...document.querySelectorAll(".subcategory-filter")].find((el) => String(el.value).toLowerCase() === rawSub.toLowerCase());
            if (subCb) subCb.checked = true;
        }
        if (rawGender) {
            const gCb = [...document.querySelectorAll(".gender-filter")].find((el) => String(el.value).toLowerCase() === rawGender.toLowerCase());
            if (gCb) gCb.checked = true;
        }
        if (q && searchInput) searchInput.value = q;
    }

    function getFilters() {
        const genders = [...document.querySelectorAll(".gender-filter:checked")].map((el) => el.value);
        const categories = [...document.querySelectorAll(".category-filter:checked")].map((el) => el.value);
        const subcategories = [...document.querySelectorAll(".subcategory-filter:checked")].map((el) => el.value);
        const minPrice = Number(priceMinRange?.value || 0);
        const maxPrice = Number(priceMaxRange?.value || 100000);
        const sellers = [...document.querySelectorAll(".seller-filter:checked")].map((el) => el.value);
        const sizes = [...document.querySelectorAll(".size-filter:checked")].map((el) => el.value);
        const colors = [...document.querySelectorAll(".color-filter:checked")].map((el) => el.value.toLowerCase());
        const availableOnly = Boolean(availableOnlyEl?.checked);
        return { genders, categories, subcategories, minPrice, maxPrice, sellers, sizes, colors, availableOnly };
    }

    function updateFilterSummaryLabel() {
        if (!filterDrawerToggle) return;
        const activeCount = document.querySelectorAll(
            ".gender-filter:checked, .category-filter:checked, .subcategory-filter:checked, .seller-filter:checked, .size-filter:checked, .color-filter:checked"
        ).length + (availableOnlyEl?.checked ? 1 : 0);
        filterDrawerToggle.textContent = activeCount > 0 ? `Filters & Sort (${activeCount})` : "Filters & Sort";
    }

    function genderMatch(product, selected) {
        if (!selected.length) return true;
        return selected.includes(product.gender) || (product.gender === "Unisex" && (selected.includes("Men") || selected.includes("Women")));
    }

    function subcategoryMatch(product, selected) {
        if (!selected.length) return true;
        if (selected.includes("Pants") || selected.includes("Trousers")) return BOTTOMS_GROUP.includes(product.subcategory);
        return selected.includes(product.subcategory);
    }

    function queryMatch(product, q) {
        if (!q) return true;
        const seller = DB.getSellerById(product.sellerId);
        const blob = [product.name, product.description, product.category, product.subcategory, seller?.name, product.sellerName].join(" ").toLowerCase();
        return blob.includes(q);
    }

    function renderDynamicFilters() {
        if (sellerFiltersWrap) {
            const sellers = [...new Set(remoteProducts.map((p) => String(p.sellerName || "").trim()).filter(Boolean))].sort();
            sellerFiltersWrap.innerHTML = sellers.length
                ? sellers.map((s) => `<label class="filter-checkbox"><input type="checkbox" class="seller-filter" value="${s}"><span>${s}</span></label>`).join("")
                : `<p class="secondary-text">No sellers yet</p>`;
        }
        if (sizeFiltersWrap) {
            const sizes = [...new Set(remoteProducts.flatMap((p) => (p.variants || []).flatMap((v) => (v.sizes || []).map((s) => String(s.size || "")))))]
                .filter(Boolean);
            sizeFiltersWrap.innerHTML = sizes.length
                ? sizes.map((s) => `<label class="filter-checkbox"><input type="checkbox" class="size-filter" value="${s}"><span>${s}</span></label>`).join("")
                : `<p class="secondary-text">No sizes</p>`;
        }
        if (colorFiltersWrap) {
            const colors = [...new Set(remoteProducts.flatMap((p) => (p.variants || []).map((v) => String(v.colorName || ""))))].filter(Boolean);
            colorFiltersWrap.innerHTML = colors.length
                ? colors.map((c) => `<label class="filter-checkbox"><input type="checkbox" class="color-filter" value="${c}"><span>${c}</span></label>`).join("")
                : `<p class="secondary-text">No colors</p>`;
        }
    }

    function stockMeta(product) {
        const allSizes = (product?.variants || []).flatMap((v) => v.sizes || []);
        const total = allSizes.reduce((sum, s) => sum + Number(s.stock || 0), 0);
        return {
            total,
            out: total <= 0,
            low: total > 0 && total <= 5
        };
    }

    function renderSearchSuggestions() {
        if (!searchInput || !suggestionsBox) return;
        const q = String(searchInput.value || "").trim().toLowerCase();
        if (!q) {
            suggestionsBox.style.display = "none";
            suggestionsBox.innerHTML = "";
            return;
        }
        const productHits = remoteProducts
            .filter((p) => String(p.name || "").toLowerCase().includes(q))
            .slice(0, 4)
            .map((p) => ({ type: "product", label: p.name, id: String(p._id || p.id) }));
        const sellerHits = remoteSellers
            .filter((s) => String(s.name || "").toLowerCase().includes(q))
            .slice(0, 3)
            .map((s) => ({ type: "seller", label: s.name, id: String(s._id || s.id) }));
        const hits = [...productHits, ...sellerHits];
        if (!hits.length) {
            suggestionsBox.style.display = "none";
            suggestionsBox.innerHTML = "";
            return;
        }
        suggestionsBox.innerHTML = hits.map((h) => `<button type="button" class="suggestion-item" data-type="${h.type}" data-id="${h.id}">${h.label}<small>${h.type}</small></button>`).join("");
        suggestionsBox.style.display = "block";
    }

    function openQuickView(product) {
        if (!quickViewModal || !quickViewContent || !product) return;
        const meta = stockMeta(product);
        const badge = meta.out ? "Out of stock" : (meta.low ? `Low stock (${meta.total})` : "In stock");
        quickViewContent.innerHTML = `
            <div class="quick-view-media"><img src="${product.images?.[0] || ""}" alt="${product.name}" loading="lazy"></div>
            <div class="quick-view-info">
                <h3>${product.name}</h3>
                <p class="quick-view-price">${product.price} EGP</p>
                <span class="status-badge ${meta.out ? "pending" : "verified"}">${badge}</span>
                <p>${product.description || ""}</p>
                <div class="quick-view-actions">
                    <a class="btn btn-primary" href="./Product.html?id=${product._id || product.id}">Open Product</a>
                    <button class="btn btn-secondary quick-add-cart-btn" data-id="${product._id || product.id}" ${meta.out ? "disabled" : ""}>Add to Cart</button>
                </div>
            </div>
        `;
        quickViewModal.style.display = "block";
        quickViewModal.setAttribute("aria-hidden", "false");
    }

    function closeQuickView() {
        if (!quickViewModal || !quickViewContent) return;
        quickViewModal.style.display = "none";
        quickViewModal.setAttribute("aria-hidden", "true");
        quickViewContent.innerHTML = "";
    }

    function getAutoplayEmbedUrl(parsed) {
        if (!parsed?.embedUrl) return "";
        try {
            const url = new URL(parsed.embedUrl);
            if (parsed.platform === "tiktok") {
                url.searchParams.set("autoplay", "1");
                url.searchParams.set("muted", "1");
            } else if (parsed.platform === "instagram") {
                url.searchParams.set("autoplay", "1");
            }
            return url.toString();
        } catch (_) {
            return parsed.embedUrl;
        }
    }

    function openReelModal(src, title) {
        if (!reelModal || !reelModalWrap) return;
        reelModalWrap.innerHTML = `<iframe src="${src}" title="${title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        reelModal.style.display = "block";
        reelModal.setAttribute("aria-hidden", "false");
    }

    function closeReelModal() {
        if (!reelModal || !reelModalWrap) return;
        reelModalWrap.innerHTML = "";
        reelModal.style.display = "none";
        reelModal.setAttribute("aria-hidden", "true");
    }

    async function buildReelsData() {
        linkedReels = [];
        reelProductMap.clear();

        remoteSellers.forEach((seller) => {
            (seller?.reels || []).forEach((reel) => {
                if (!reel?.productId || !reel?.reelUrl) return;
                linkedReels.push({ seller, reel });
            });
        });
        if (!linkedReels.length) return;

        const productIds = [...new Set(linkedReels.map((x) => String(x.reel.productId)))];
        await Promise.all(productIds.map(async (id) => {
            const fromCurrentPage = remoteProducts.find((p) => String(p._id || p.id) === id);
            if (fromCurrentPage) {
                reelProductMap.set(id, fromCurrentPage);
                return;
            }
            try {
                const product = await Api.getProductById(id);
                if (product) reelProductMap.set(id, product);
            } catch (_) {
                // ignore
            }
        }));
    }

    function setupReelObserver() {
        if (!reelsFeed) return;
        if (reelObserver) reelObserver.disconnect();
        reelObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const card = entry.target;
                const iframe = card.querySelector("iframe[data-src]");
                const skeleton = card.querySelector(".reel-skeleton");
                const sellerId = card.dataset.sellerId || "";
                const reelId = card.dataset.reelId || "";
                const key = `${sellerId}:${reelId}`;

                if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
                    if (iframe && iframe.src !== iframe.dataset.src) {
                        iframe.src = iframe.dataset.src;
                    }
                    if (!viewedReelKeys.has(key) && sellerId && reelId) {
                        viewedReelKeys.add(key);
                        Api.trackSellerReelView(sellerId, reelId).catch(() => {});
                    }
                } else if (iframe && iframe.src && iframe.src !== "about:blank") {
                    iframe.src = "about:blank";
                    if (skeleton) skeleton.style.display = "block";
                }
            });
        }, { threshold: [0.55] });

        reelsFeed.querySelectorAll(".reel-card[data-reel-id]").forEach((card) => {
            const iframe = card.querySelector("iframe[data-src]");
            const skeleton = card.querySelector(".reel-skeleton");
            if (iframe && skeleton) {
                iframe.addEventListener("load", () => {
                    if (iframe.src && iframe.src !== "about:blank") skeleton.style.display = "none";
                });
            }
            reelObserver.observe(card);
        });
    }

    function renderReels() {
        if (!reelsFeed || !reelsEmpty) return;
        const q = (searchInput?.value || "").trim().toLowerCase();
        const filtered = linkedReels.filter(({ reel, seller }) => {
            const platformPass = activeReelsPlatform === "all" || String(reel.platform || "").toLowerCase() === activeReelsPlatform;
            if (!platformPass) return false;
            if (!q) return true;
            const product = reelProductMap.get(String(reel.productId || ""));
            const blob = [seller?.name || "", product?.name || "", reel?.title || ""].join(" ").toLowerCase();
            return blob.includes(q);
        });

        const cards = filtered.map(({ seller, reel }) => {
            const product = reelProductMap.get(String(reel.productId || ""));
            if (!product) return "";
            const parsed = typeof getReelEmbedInfo === "function" ? getReelEmbedInfo(reel.reelUrl, reel.platform) : null;
            const sellerId = String(seller?._id || seller?.id || "");
            const reelId = String(reel.reelId || reel._id || "");

            if (!parsed || parsed.error || !parsed.embedUrl) {
                return `
                    <article class="reel-card reel-fallback-card" data-seller-id="${sellerId}" data-reel-id="${reelId}">
                        <div class="reel-meta">
                            <h3>${product.name}</h3>
                            <p>${seller?.name || product?.sellerName || "Seller"}</p>
                        </div>
                        <div class="reel-fallback-actions">
                            <a class="btn btn-secondary" href="${reel.reelUrl}" target="_blank" rel="noopener">Open Reel</a>
                            <a class="btn btn-primary reel-product-link" data-seller-id="${sellerId}" data-reel-id="${reelId}" href="./Product.html?id=${product._id || product.id}">Shop Product</a>
                        </div>
                    </article>
                `;
            }

            const embedUrl = getAutoplayEmbedUrl(parsed);
            return `
                <article class="reel-card" data-seller-id="${sellerId}" data-reel-id="${reelId}">
                    <div class="reel-frame">
                        <div class="reel-skeleton" style="background-image:url('${product.images?.[0] || ""}');background-size:cover;background-position:center;"></div>
                        <iframe
                            src="about:blank"
                            data-src="${embedUrl}"
                            title="${product.name} reel"
                            loading="lazy"
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            allowfullscreen
                            referrerpolicy="strict-origin-when-cross-origin"
                        ></iframe>
                        <button class="reel-fullscreen-btn" type="button" data-fullscreen-src="${embedUrl}" data-fullscreen-title="${product.name} reel">Full</button>
                        <a class="reel-product-link" data-seller-id="${sellerId}" data-reel-id="${reelId}" href="./Product.html?id=${product._id || product.id}">Shop ${product.name}</a>
                    </div>
                    <div class="reel-meta">
                        <h3>${product.name}</h3>
                        <p>${seller?.name || product?.sellerName || "Seller"}</p>
                    </div>
                </article>
            `;
        }).filter(Boolean);

        reelsFeed.innerHTML = cards.join("");
        reelsEmpty.style.display = cards.length ? "none" : "block";
        setupReelObserver();
    }

    function renderProducts() {
        if (!grid) return;
        const q = (searchInput?.value || "").trim().toLowerCase();
        const { genders, categories, subcategories, minPrice, maxPrice, sellers, sizes, colors, availableOnly } = getFilters();
        let products = remoteProducts.filter((p) =>
            p.price >= minPrice &&
            p.price <= maxPrice &&
            genderMatch(p, genders) &&
            (!categories.length || categories.includes(p.category)) &&
            subcategoryMatch(p, subcategories) &&
            (!sellers.length || sellers.includes(String(p.sellerName || ""))) &&
            (!sizes.length || (p.variants || []).some((v) => (v.sizes || []).some((s) => sizes.includes(String(s.size || ""))))) &&
            (!colors.length || (p.variants || []).some((v) => colors.includes(String(v.colorName || "").toLowerCase()))) &&
            (!availableOnly || stockMeta(p).total > 0) &&
            queryMatch(p, q)
        );

        if (sortEl?.value === "price-low") products.sort((a, b) => a.price - b.price);
        else if (sortEl?.value === "price-high") products.sort((a, b) => b.price - a.price);
        else if (sortEl?.value === "rating-high") products.sort((a, b) => {
            const ra = Number(a.averageRating || 0);
            const rb = Number(b.averageRating || 0);
            if (rb !== ra) return rb - ra;
            return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
        });
        else products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        countEl && (countEl.textContent = String(products.length || 0));
        productCountInlineEl && (productCountInlineEl.textContent = `${products.length || 0} matching products`);
        noProducts && (noProducts.style.display = products.length ? "none" : "block");
        updateFilterSummaryLabel();

        const sellerResults = q ? remoteSellers.filter((s) => String(s.name || "").toLowerCase().includes(q)) : [];
        grid.innerHTML = `
            ${sellerResults.map((s) => `<article class="product-card"><div class="card-info"><h3>Seller: ${s.name}</h3><p>${s.description || ""}</p><a class="btn btn-secondary" href="./seller.html?sellerId=${s._id || s.id}">Open Seller Page</a></div></article>`).join("")}
            ${products.map((p) => {
                const sm = stockMeta(p);
                const status = sm.out ? "Out of stock" : (sm.low ? `Low stock (${sm.total})` : "In stock");
                return `
                <article class="product-card">
                    <a href="./Product.html?id=${p._id || p.id}" class="product-image-link">
                        <img src="${p.images?.[0] || ''}" alt="${p.name}" loading="lazy">
                    </a>
                    <span class="stock-chip ${sm.out ? "out" : (sm.low ? "low" : "ok")}">${status}</span>
                    <div class="card-info">
                        <h3>${p.name}</h3>
                        <p>${p.price} EGP</p>
                        <div class="rating-row">${"★".repeat(Math.round(Number(p.averageRating || 0))).padEnd(5, "☆")} <small>(${Number(p.reviewCount || 0)})</small></div>
                        <p style="display:flex;align-items:center;gap:8px;">
                            <img src="${p.sellerLogo || remoteSellers.find((s) => String(s._id || s.id) === String(p.sellerId))?.logo || ''}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);">
                            <a href="./seller.html?sellerId=${p.sellerId}">${p.sellerName || remoteSellers.find((s) => String(s._id || s.id) === String(p.sellerId))?.name || "Unknown Seller"}</a>
                        </p>
                        <div class="shop-card-actions">
                            <button class="btn btn-secondary quick-view-btn" data-id="${p._id || p.id}">Quick View</button>
                            <button class="btn btn-primary shop-add-cart" data-id="${p._id || p.id}" ${sm.out ? "disabled" : ""}>Add</button>
                        </div>
                    </div>
                </article>
            `;}).join("")}
        `;
        renderPager();
    }

    function renderPager() {
        if (!pagerEl) return;
        const page = Number(productPagination.page || 1);
        const totalPages = Number(productPagination.totalPages || 1);
        if (totalPages <= 1) {
            pagerEl.innerHTML = "";
            return;
        }
        pagerEl.innerHTML = `
            <button class="btn btn-secondary shop-page-btn" data-page="${Math.max(1, page - 1)}" ${page <= 1 ? "disabled" : ""}>Prev</button>
            <span class="shop-page-label">Page ${page} / ${totalPages}</span>
            <button class="btn btn-secondary shop-page-btn" data-page="${Math.min(totalPages, page + 1)}" ${page >= totalPages ? "disabled" : ""}>Next</button>
        `;
    }

    async function loadProducts(page = 1) {
        const query = {
            page,
            limit: PAGE_SIZE,
            sortBy: (sortEl?.value === "price-low" ? "price_low" : sortEl?.value === "price-high" ? "price_high" : "newest")
        };
        const { items, pagination } = await Api.getProducts(query);
        remoteProducts = items;
        productPagination = pagination || { page: 1, totalPages: 1 };
    }

    function setView(view) {
        activeView = view === "reels" ? "reels" : "products";
        viewSwitch?.querySelectorAll(".shop-view-btn").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.view === activeView);
        });
        productsView?.classList.toggle("active", activeView === "products");
        reelsView?.classList.toggle("active", activeView === "reels");
        if (shopLayout) shopLayout.classList.toggle("reels-mode", activeView === "reels");
        if (filterDrawerToggle) filterDrawerToggle.style.display = activeView === "reels" ? "none" : "";
        if (activeView === "reels" && filterDrawerPanel) filterDrawerPanel.style.display = "none";
        if (activeView === "reels") renderReels();
    }

    function syncPriceCaption(source = null) {
        if (!priceMinRange || !priceMaxRange) return;
        const min = Number(priceMinRange.value);
        const max = Number(priceMaxRange.value);
        if (min > max) {
            if (source === "min") priceMaxRange.value = String(min);
            else priceMinRange.value = String(max);
        }
        const finalMin = Number(priceMinRange.value);
        const finalMax = Number(priceMaxRange.value);
        if (priceMinValue) priceMinValue.textContent = String(finalMin);
        if (priceMaxValue) priceMaxValue.textContent = finalMax >= Number(priceMaxRange.max) ? "Max" : String(finalMax);
    }

    document.addEventListener("click", (e) => {
        const pagerBtn = e.target.closest(".shop-page-btn");
        if (pagerBtn) {
            (async () => {
                try {
                    await loadProducts(Number(pagerBtn.dataset.page || 1));
                    renderProducts();
                } catch (err) {
                    alert(err?.message || "Failed to load products.");
                }
            })();
            return;
        }

        const add = e.target.closest(".shop-add-cart");
        if (add) {
            const product = remoteProducts.find((p) => String(p._id || p.id) === String(add.dataset.id));
            if (!product) return;
            const firstColor = product.variants?.[0];
            const firstSize = firstColor?.sizes?.[0];
            if (!firstColor || !firstSize || firstSize.stock <= 0) return alert("This product is out of stock.");
            const cart = DB.getCart();
            const pid = String(product._id || product.id);
            const existing = cart.find((i) => i.productId === pid && i.selectedColor === firstColor.colorName && i.selectedSize === firstSize.size);
            if (existing) existing.quantity += 1;
            else cart.push({ productId: pid, sellerId: product.sellerId, name: product.name, price: product.price, image: product.images?.[0] || "", selectedColor: firstColor.colorName, selectedSize: firstSize.size, quantity: 1 });
            DB.saveCart(cart);
            updateNavbarBadges();
            alert("Added to cart.");
            return;
        }
        const quickViewBtn = e.target.closest(".quick-view-btn");
        if (quickViewBtn) {
            const product = remoteProducts.find((p) => String(p._id || p.id) === String(quickViewBtn.dataset.id));
            openQuickView(product);
            return;
        }
        const quickAddBtn = e.target.closest(".quick-add-cart-btn");
        if (quickAddBtn) {
            const product = remoteProducts.find((p) => String(p._id || p.id) === String(quickAddBtn.dataset.id));
            if (!product) return;
            const firstColor = product.variants?.[0];
            const firstSize = firstColor?.sizes?.[0];
            if (!firstColor || !firstSize || firstSize.stock <= 0) return alert("This product is out of stock.");
            const cart = DB.getCart();
            const pid = String(product._id || product.id);
            const existing = cart.find((i) => i.productId === pid && i.selectedColor === firstColor.colorName && i.selectedSize === firstSize.size);
            if (existing) existing.quantity += 1;
            else cart.push({ productId: pid, sellerId: product.sellerId, name: product.name, price: product.price, image: product.images?.[0] || "", selectedColor: firstColor.colorName, selectedSize: firstSize.size, quantity: 1 });
            DB.saveCart(cart);
            updateNavbarBadges();
            alert("Added to cart.");
            closeQuickView();
            return;
        }
        const suggestionItem = e.target.closest(".suggestion-item");
        if (suggestionItem) {
            const label = suggestionItem.textContent.replace(/(product|seller)$/i, "").trim();
            if (searchInput) searchInput.value = label;
            suggestionsBox.style.display = "none";
            renderProducts();
            return;
        }

        const viewBtn = e.target.closest(".shop-view-btn");
        if (viewBtn) {
            setView(viewBtn.dataset.view || "products");
            return;
        }

        const platformBtn = e.target.closest(".reels-platform-btn");
        if (platformBtn) {
            activeReelsPlatform = platformBtn.dataset.platform || "all";
            reelsPlatformSwitch?.querySelectorAll(".reels-platform-btn").forEach((btn) => btn.classList.toggle("active", btn === platformBtn));
            renderReels();
            return;
        }

        const fullscreenBtn = e.target.closest(".reel-fullscreen-btn");
        if (fullscreenBtn) {
            openReelModal(fullscreenBtn.dataset.fullscreenSrc || "", fullscreenBtn.dataset.fullscreenTitle || "Reel");
            return;
        }

        if (e.target.closest("[data-close-reel-modal='1']") || e.target === reelModalClose) {
            closeReelModal();
            return;
        }
        if (e.target.closest("[data-close-quick-view='1']") || e.target === quickViewCloseBtn) {
            closeQuickView();
            return;
        }

        const productLink = e.target.closest(".reel-product-link[data-seller-id][data-reel-id]");
        if (productLink) {
            const sellerId = String(productLink.dataset.sellerId || "");
            const reelId = String(productLink.dataset.reelId || "");
            if (sellerId && reelId) Api.trackSellerReelClick(sellerId, reelId).catch(() => {});
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeReelModal();
    });

    document.querySelectorAll(".gender-filter, .category-filter, .subcategory-filter").forEach((el) => el.addEventListener("change", renderProducts));
    filterDrawerToggle?.addEventListener("click", () => {
        if (!filterDrawerPanel) return;
        const isOpen = filterDrawerPanel.style.display !== "none";
        filterDrawerPanel.style.display = isOpen ? "none" : "block";
    });
    document.addEventListener("change", (e) => {
        if (e.target.matches(".seller-filter, .size-filter, .color-filter, #availableOnly")) {
            renderProducts();
        }
    });
    sortEl?.addEventListener("change", renderProducts);
    searchInput?.addEventListener("input", () => {
        renderSearchSuggestions();
        if (activeView === "products") renderProducts();
        else renderReels();
    });
    document.addEventListener("click", (e) => {
        if (!suggestionsBox || !searchInput) return;
        if (e.target === searchInput || suggestionsBox.contains(e.target)) return;
        suggestionsBox.style.display = "none";
    });
    priceMinRange?.addEventListener("input", () => { syncPriceCaption("min"); renderProducts(); });
    priceMaxRange?.addEventListener("input", () => { syncPriceCaption("max"); renderProducts(); });
    resetBtn?.addEventListener("click", () => {
        document.querySelectorAll(".gender-filter, .category-filter, .subcategory-filter, .seller-filter, .size-filter, .color-filter").forEach((el) => { el.checked = false; });
        if (availableOnlyEl) availableOnlyEl.checked = false;
        if (priceMinRange) priceMinRange.value = "0";
        if (priceMaxRange) priceMaxRange.value = "10000";
        syncPriceCaption();
        renderProducts();
        updateFilterSummaryLabel();
    });

    (async () => {
        try {
            await loadProducts(1);
            const sellersResponse = await Api.getSellers({ limit: 200 });
            remoteSellers = sellersResponse.items || [];
            renderDynamicFilters();
            await buildReelsData();
        } catch (err) {
            remoteProducts = [];
            remoteSellers = [];
            linkedReels = [];
            alert(err?.message || "Failed to load shop data.");
        }

        const maxProductPrice = Math.max(10000, ...remoteProducts.map((p) => Number(p.price || 0)));
        if (priceMinRange && priceMaxRange) {
            priceMinRange.max = String(maxProductPrice);
            priceMaxRange.max = String(maxProductPrice);
            if (Number(priceMaxRange.value) > maxProductPrice) priceMaxRange.value = String(maxProductPrice);
        }
        if (!new URLSearchParams(window.location.search).has("q") && searchInput) searchInput.value = "";
        applyUrlFilters();
        if (suggestionsBox) suggestionsBox.style.display = "none";
        syncPriceCaption();
        renderProducts();
        renderReels();
        setView("products");
        updateFilterSummaryLabel();
    })();
})();
