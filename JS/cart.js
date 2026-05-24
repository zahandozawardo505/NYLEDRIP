(function () {
    let lastTotal = 0;
    let rateCache = {};
    let promoState = { code: '', discountAmount: 0, sellerId: '' };
    function getCart() { return DB.getCart(); }
    function saveCart(cart) { DB.saveCart(cart); updateNavbarBadges(); }
    function showOrderConfirmation(orderIds = []) {
        const host = document.querySelector(".cart-section .container");
        if (!host) return;
        const ids = orderIds.map((id) => typeof escapeHTML === "function" ? escapeHTML(id) : String(id));
        const wrap = document.createElement("div");
        wrap.className = "cart-empty";
        wrap.innerHTML = `
            <h2>Order Confirmed</h2>
            <p>Your order was placed successfully${ids.length ? ` (IDs: ${ids.join(", ")})` : ""}.</p>
            <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
        `;
        host.prepend(wrap);
    }
    function setCheckoutError(message = "") {
        const el = document.getElementById("checkoutError");
        if (!el) return;
        el.textContent = message;
        el.classList.toggle("show", Boolean(message));
    }
    function getShippingAddress() {
        const fullName = String(document.getElementById("checkoutFullName")?.value || "").trim();
        const phone = String(document.getElementById("checkoutPhone")?.value || "").trim();
        const city = String(document.getElementById("checkoutCity")?.value || "").trim();
        const line1 = String(document.getElementById("checkoutAddress")?.value || "").trim();
        if (fullName.length < 3) throw new Error("Enter your full shipping name.");
        if (!/^[0-9+\-\s]{8,18}$/.test(phone)) throw new Error("Enter a valid phone number.");
        if (city.length < 2) throw new Error("Enter a valid city.");
        if (line1.length < 8) throw new Error("Enter a complete street address.");
        return { fullName, phone, city, line1, country: "Egypt", note: String(document.getElementById("cartNote")?.value || "").trim() };
    }
    function setCheckoutLoading(loading) {
        const confirmBtn = document.getElementById("confirmOrderBtn");
        const checkoutBtn = document.getElementById("checkoutBtn");
        if (confirmBtn) {
            confirmBtn.disabled = loading;
            confirmBtn.textContent = loading ? "Placing..." : "Confirm";
        }
        if (checkoutBtn) checkoutBtn.disabled = loading;
    }
    function openCheckoutModal() {
        const modal = document.getElementById("checkoutModal");
        if (!modal) return;
        const cart = getCart();
        if (!cart.length) return showToast("Your cart is empty.", "warning");
        if (typeof requireSignedInUser === "function" && !requireSignedInUser("You have to sign in to checkout.")) return;
        const previewId = `NYL-${Date.now()}`;
        const idEl = document.getElementById("modalOrderId");
        if (idEl) idEl.textContent = previewId;
        setCheckoutError("");
        modal.style.display = "flex";
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    }
    function closeCheckoutModal() {
        const modal = document.getElementById("checkoutModal");
        if (!modal) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        modal.style.display = "none";
    }
    function render() {
        const cart = getCart();
        const itemsEl = document.getElementById("cartItems");
        const emptyEl = document.getElementById("cartEmpty");
        const layoutEl = document.getElementById("cartLayout");
        if (!itemsEl) return;
        if (!cart.length) {
            if (emptyEl) emptyEl.style.display = "block";
            if (layoutEl) layoutEl.style.display = "none";
            updateSummary();
            return;
        }
        if (emptyEl) emptyEl.style.display = "none";
        if (layoutEl) layoutEl.style.display = "";
        itemsEl.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image"><img src="${item.image || ""}" alt="${item.name}"></div>
                <div class="cart-item-info"><h3>${item.name}</h3><p>${item.selectedColor || "-"} / ${item.selectedSize || "-"}</p><p><strong>${item.price} EGP</strong></p></div>
                <div class="cart-item-controls">
                    <button class="qty-btn" data-key="${item.productId}|${item.selectedColor}|${item.selectedSize}" data-delta="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" data-key="${item.productId}|${item.selectedColor}|${item.selectedSize}" data-delta="1">+</button>
                </div>
                <button class="btn btn-danger btn-small remove-btn" data-key="${item.productId}|${item.selectedColor}|${item.selectedSize}">Remove</button>
            </div>
        `).join("");
        updateSummary();
    }
    function updateSummary() {
        const cart = getCart();
        const count = cart.reduce((s, i) => s + Number(i.quantity || 0), 0);
        const subtotal = cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
        const freeShippingThreshold = 300;
        const shipping = count ? (subtotal >= freeShippingThreshold ? 0 : 50) : 0;
        const discount = Math.min(Math.max(0, Number(promoState.discountAmount || 0)), subtotal + shipping);
        const total = subtotal + shipping - discount;
        lastTotal = total;
        document.getElementById("summaryItemCount") && (document.getElementById("summaryItemCount").textContent = String(count));
        document.getElementById("summarySubtotal") && (document.getElementById("summarySubtotal").textContent = `${subtotal} EGP`);
        document.getElementById("summaryTotal") && (document.getElementById("summaryTotal").textContent = `${total} EGP`);
        const shippingRow = document.getElementById("summaryShipping");
        const shippingProgressBar = document.getElementById("shippingProgressBar");
        const shippingProgressText = document.getElementById("shippingProgressText");
        const progress = Math.max(0, Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100)));
        if (shippingProgressBar) shippingProgressBar.style.width = `${progress}%`;
        if (shippingProgressText) {
            shippingProgressText.textContent = subtotal >= freeShippingThreshold
                ? "Free shipping unlocked"
                : `Add ${freeShippingThreshold - subtotal} EGP for free shipping`;
        }
        if (shippingRow) shippingRow.textContent = `${shipping} EGP`;
        const promoApplied = document.getElementById("promoApplied");
        const promoDiscount = document.getElementById("promoDiscount");
        if (promoApplied && promoDiscount) {
            promoApplied.style.display = discount > 0 ? "flex" : "none";
            promoDiscount.textContent = discount > 0 ? `-${discount} EGP` : "0";
        }
        const eta = document.getElementById("estimatedDelivery");
        if (eta) {
            if (!count) eta.textContent = "-";
            else {
                const target = new Date();
                target.setDate(target.getDate() + 3);
                eta.textContent = target.toLocaleDateString();
            }
        }
        renderConvertedTotal();
    }
    async function renderConvertedTotal() {
        const target = document.getElementById("currencySelect")?.value || "USD";
        const out = document.getElementById("summaryConvertedTotal");
        if (!out) return;
        if (!lastTotal) {
            out.textContent = "-";
            return;
        }
        try {
            if (!rateCache[target]) {
                const payload = await Api.getCurrencyRate("EGP", target);
                rateCache[target] = Number(payload.rate || 0);
            }
            const rate = Number(rateCache[target] || 0);
            if (!rate) throw new Error("rate unavailable");
            out.textContent = `${(lastTotal * rate).toFixed(2)} ${target}`;
        } catch {
            out.textContent = "Unavailable";
        }
    }
    async function placeOrder() {
        const user = DB.getCurrentUser();
        if (!user) return showToast("Please login first.", "error");
        if (!Api.token()) return showToast("Login session missing. Please login again.", "error");
        const cart = getCart();
        if (!cart.length) return showToast("Your cart is empty.", "warning");
        let shippingAddress;
        try {
            shippingAddress = getShippingAddress();
            setCheckoutError("");
        } catch (err) {
            setCheckoutError(err.message || "Please complete shipping details.");
            showToast(err.message || "Please complete shipping details.", "error");
            return;
        }
        setCheckoutLoading(true);
        const failures = [];
        const createdOrders = [];
        for (const item of cart) {
            try {
                const product = await Api.getProductById(item.productId);
                if (!product) throw new Error("Product not found.");
                const created = await Api.createOrder({
                    productId: product._id || product.id,
                    quantity: Number(item.quantity || 0),
                    selectedColor: item.selectedColor,
                    selectedSize: item.selectedSize,
                    promoCode: promoState.code || '',
                    shippingAddress
                });
                createdOrders.push(created);
            } catch (err) {
                failures.push(`${item.name} (${item.selectedColor}/${item.selectedSize}): ${err?.message || "Failed"}`);
            }
        }
        setCheckoutLoading(false);
        if (failures.length) {
            closeCheckoutModal();
            return showToast(`Some items could not be ordered: ${failures.join(" | ")}`, "error", 7000);
        }
        saveCart([]);
        render();
        closeCheckoutModal();
        const ids = createdOrders.map(o => o?.id).filter(Boolean);
        showOrderConfirmation(ids);
        showToast(ids.length ? `Order placed successfully. Order IDs: ${ids.join(", ")}` : "Order placed successfully.", "success", 6000);
    }
    document.addEventListener("click", async (e) => {
        if (e.target.closest("#clearCartBtn")) {
            if (!confirm("Clear all items from cart?")) return;
            promoState = { code: '', discountAmount: 0, sellerId: '' };
            return saveCart([]), render();
        }
        if (e.target.closest("#checkoutBtn")) return openCheckoutModal();
        if (e.target.closest("#confirmOrderBtn")) return placeOrder();
        if (e.target.closest("#cancelCheckoutBtn")) return closeCheckoutModal();
        const qtyBtn = e.target.closest(".qty-btn");
        if (qtyBtn) {
            const [pid, color, size] = qtyBtn.dataset.key.split("|");
            const delta = Number(qtyBtn.dataset.delta);
            const cart = getCart();
            const item = cart.find(i => i.productId === pid && i.selectedColor === color && i.selectedSize === size);
            if (!item) return;
            item.quantity = Math.max(0, Number(item.quantity || 0) + delta);
            saveCart(cart.filter(i => i.quantity > 0));
            promoState = { code: '', discountAmount: 0, sellerId: '' };
            return render();
        }
        const remove = e.target.closest(".remove-btn");
        if (remove) {
            const [pid, color, size] = remove.dataset.key.split("|");
            promoState = { code: '', discountAmount: 0, sellerId: '' };
            saveCart(getCart().filter(i => !(i.productId === pid && i.selectedColor === color && i.selectedSize === size)));
            render();
        }
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeCheckoutModal();
    });
    document.getElementById("checkoutBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        openCheckoutModal();
    });
    document.getElementById("applyPromo")?.addEventListener("click", async (e) => {
        e.preventDefault();
        const code = String(document.getElementById("promoInput")?.value || "").trim().toUpperCase();
        if (!code) return showToast("Enter a promo code.", "warning");
        if (typeof requireSignedInUser === "function" && !requireSignedInUser("Sign in to apply a promo code.")) return;
        if (!Api.token()) return showToast("Login session missing. Please login again.", "error");
        const cart = getCart();
        if (!cart.length) return showToast("Your cart is empty.", "warning");
        try {
            const quote = await Api.getPromoQuote({
                promoCode: code,
                items: cart.map((item) => ({
                    productId: item.productId,
                    quantity: Number(item.quantity || 0)
                }))
            });
            promoState = {
                code,
                discountAmount: Number(quote?.discountAmount || 0),
                sellerId: String(quote?.sellerId || '')
            };
            updateSummary();
            showToast(`Promo ${code} applied.`, "success");
        } catch (err) {
            promoState = { code: '', discountAmount: 0, sellerId: '' };
            updateSummary();
            showToast(err?.message || "Promo code is invalid.", "error");
        }
    });
    document.getElementById("currencySelect")?.addEventListener("change", () => {
        renderConvertedTotal();
    });
    document.getElementById("confirmOrderBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        placeOrder();
    });
    document.getElementById("cancelCheckoutBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        closeCheckoutModal();
    });
    render();
})();
