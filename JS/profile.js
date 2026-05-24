(async function () {
    const user = DB.getCurrentUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    if (!Api.token()) {
        alert("Session missing. Please login again.");
        window.location.href = "login.html";
        return;
    }

    const state = {
        user: null,
        orders: [],
        addresses: [],
        selectedAvatarFile: null,
        reviewTargetProductId: "",
        reviewRating: 0
    };

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value ?? "");
    };

    const setInput = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? "";
    };

    function splitName(fullName) {
        const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
        return {
            first: parts[0] || "",
            last: parts.slice(1).join(" ")
        };
    }

    function renderAvatar() {
        const avatar = document.getElementById("avatarPreview");
        if (!avatar) return;
        const name = state.user?.name || "User";
        if (state.user?.avatarUrl) {
            avatar.src = state.user.avatarUrl;
        } else {
            avatar.removeAttribute("src");
            avatar.alt = name;
        }
    }

    function statusClass(status) {
        const s = String(status || "pending").toLowerCase();
        if (s === "shipped" || s === "accepted") return "status-pill";
        if (s === "ignored") return "status-pill";
        return "status-pill";
    }

    function renderOrders() {
        const list = document.getElementById("ordersList");
        if (!list) return;
        if (!state.orders.length) {
            list.innerHTML = `<p class="profile-sub">No orders yet.</p>`;
            return;
        }
        const eligible = new Set(["shipped", "delivered", "completed"]);
        list.innerHTML = state.orders.map((order) => `
            <div class="order-item">
                <div class="profile-section-head">
                    <strong>Order #${order.id || order._id}</strong>
                    <span class="${statusClass(order.status)}">${String(order.status || "pending").replaceAll("_", " ")}</span>
                </div>
                <p class="profile-sub">Date: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</p>
                <p class="profile-sub">Product: ${order.productId || "-"} | Qty: ${order.quantity || 0} | Total: ${order.totalPrice || 0} EGP</p>
                <p class="profile-sub">Variant: ${order.selectedColor || "-"} / ${order.selectedSize || "-"}</p>
                ${eligible.has(String(order.status || "").toLowerCase()) ? `<button class="btn btn-secondary btn-small review-order-btn" data-product-id="${order.productId}">Review product</button>` : `<p class="profile-sub">You can review this item after your order is delivered.</p>`}
            </div>
        `).join("");
    }

    function addressItemTemplate(address) {
        return `
            <div class="address-item" data-address-id="${address._id}">
                <div class="profile-section-head">
                    <strong>${address.label || "Address"}</strong>
                    ${address.isDefault ? `<span class="status-pill">Default</span>` : ""}
                </div>
                <p class="profile-sub">${address.fullName} - ${address.phone}</p>
                <p class="profile-sub">${address.line1}${address.line2 ? `, ${address.line2}` : ""}</p>
                <p class="profile-sub">${address.city}${address.state ? `, ${address.state}` : ""}, ${address.postalCode} - ${address.country}</p>
                <div class="profile-actions">
                    ${!address.isDefault ? `<button class="btn btn-secondary btn-small set-default-address-btn" data-id="${address._id}">Set Default</button>` : ""}
                    <button class="btn btn-danger btn-small delete-address-btn" data-id="${address._id}">Delete</button>
                </div>
            </div>
        `;
    }

    function renderAddresses() {
        const list = document.getElementById("addressesList");
        if (!list) return;
        if (!state.addresses.length) {
            list.innerHTML = `<p class="profile-sub">No addresses saved.</p>`;
            return;
        }
        list.innerHTML = state.addresses.map(addressItemTemplate).join("");
    }

    function hydrateUserForm() {
        const userRecord = state.user || {};
        const name = splitName(userRecord.name);
        setText("greetText", `Hi ${userRecord.name || "User"}`);
        setText("mailText", userRecord.email || "");
        setText("lastLoginText", userRecord.lastLoginAt ? `Last login: ${new Date(userRecord.lastLoginAt).toLocaleString()}` : "Last login: -");
        setInput("firstNameInput", name.first);
        setInput("lastNameInput", name.last);
        setInput("emailInput", userRecord.email || "");
        setInput("phoneInput", userRecord.phone || "");

        const pref = userRecord.preferences || {};
        const notifications = pref.notifications || {};
        const lang = pref.language || "en";
        const prefLang = document.getElementById("prefLanguage");
        const prefOrder = document.getElementById("prefOrderUpdates");
        const prefMarketing = document.getElementById("prefMarketingEmails");
        if (prefLang) prefLang.value = lang;
        if (prefOrder) prefOrder.checked = Boolean(notifications.orderUpdates);
        if (prefMarketing) prefMarketing.checked = Boolean(notifications.marketingEmails);
        renderAvatar();
    }

    function updateStats() {
        setText("ordersCount", state.orders.length);
        setText("wishlistCount", DB.getWishlist().length);
        setText("cartCount", DB.getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0));
    }

    async function loadProfile() {
        const me = await Api.getCurrentUser();
        const ordersRes = await Api.getOrders({ page: 1, limit: 200 });
        const [addresses, wishlist, cart] = await Promise.all([
            Api.getAddresses().catch(() => []),
            Api.getMyWishlist().catch(() => DB.getWishlist()),
            Api.getMyCart().catch(() => DB.getCart())
        ]);
        state.user = { ...me, id: String(me._id || me.id) };
        state.orders = ordersRes.items || [];
        state.addresses = Array.isArray(addresses) ? addresses : [];
        DB.setCurrentUser(state.user);
        DB.saveWishlist(Array.isArray(wishlist) ? wishlist : []);
        DB.saveCart(Array.isArray(cart) ? cart : []);
        hydrateUserForm();
        renderOrders();
        renderAddresses();
        updateStats();
    }

    function validateAddressPayload(payload) {
        if (!payload.fullName || !payload.phone || !payload.line1 || !payload.city || !payload.postalCode) {
            return "Please complete full name, phone, line1, city, and postal code.";
        }
        if (!/^\d{8,15}$/.test(String(payload.phone || ""))) {
            return "Address phone must be 8 to 15 digits.";
        }
        return "";
    }

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        DB.logout();
        Api.setToken("");
        window.location.href = "login.html";
    });

    document.getElementById("logoutAllBtn")?.addEventListener("click", async () => {
        try {
            await Api.logoutAllSessions();
            DB.logout();
            Api.setToken("");
            alert("All sessions were logged out. Please login again.");
            window.location.href = "login.html";
        } catch (err) {
            alert(err?.message || "Failed to logout all sessions.");
        }
    });

    document.getElementById("saveDetailsBtn")?.addEventListener("click", async () => {
        const first = String(document.getElementById("firstNameInput")?.value || "").trim();
        const last = String(document.getElementById("lastNameInput")?.value || "").trim();
        const email = String(document.getElementById("emailInput")?.value || "").trim().toLowerCase();
        const phone = String(document.getElementById("phoneInput")?.value || "").trim();
        if (!first || !last) return alert("Please enter first and last name.");
        if (!validateEmail(email)) return alert("Please enter a valid email.");
        if (phone && !/^\d{8,15}$/.test(phone)) return alert("Phone must be 8 to 15 digits.");
        try {
            const updated = await Api.updateCurrentUser({ name: `${first} ${last}`.trim(), email, phone });
            state.user = { ...state.user, ...updated, id: String(updated._id || updated.id) };
            DB.setCurrentUser(state.user);
            hydrateUserForm();
            alert("Profile updated.");
        } catch (err) {
            alert(err?.message || "Failed to update profile.");
        }
    });

    document.getElementById("avatarInput")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0] || null;
        state.selectedAvatarFile = file;
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            state.selectedAvatarFile = null;
            e.target.value = "";
            alert("Please select an image file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            state.selectedAvatarFile = null;
            e.target.value = "";
            alert("Avatar file must be <= 2MB.");
            return;
        }
    });

    document.getElementById("uploadAvatarBtn")?.addEventListener("click", async () => {
        try {
            if (!state.selectedAvatarFile) return alert("Choose an avatar file first.");
            const payload = await Api.uploadAvatar(state.selectedAvatarFile);
            state.user = { ...state.user, ...(payload.user || {}), avatarUrl: payload.avatarUrl || payload.user?.avatarUrl || "" };
            DB.setCurrentUser(state.user);
            renderAvatar();
            alert("Avatar uploaded.");
        } catch (err) {
            alert(err?.message || "Failed to upload avatar.");
        }
    });

    document.getElementById("changePasswordBtn")?.addEventListener("click", async () => {
        const currentPassword = String(document.getElementById("currentPasswordInput")?.value || "");
        const newPassword = String(document.getElementById("newPasswordInput")?.value || "");
        const confirmPassword = String(document.getElementById("confirmPasswordInput")?.value || "");
        if (!currentPassword || !newPassword || !confirmPassword) return alert("Please fill all password fields.");
        if (newPassword.length < 8) return alert("New password must be at least 8 characters.");
        if (newPassword !== confirmPassword) return alert("Password confirmation does not match.");
        try {
            await Api.changePassword({ currentPassword, newPassword, confirmPassword });
            DB.logout();
            Api.setToken("");
            alert("Password updated. Please login again.");
            window.location.href = "login.html";
        } catch (err) {
            alert(err?.message || "Failed to update password.");
        }
    });

    document.getElementById("savePreferencesBtn")?.addEventListener("click", async () => {
        const language = String(document.getElementById("prefLanguage")?.value || "en");
        const notifications = {
            orderUpdates: Boolean(document.getElementById("prefOrderUpdates")?.checked),
            marketingEmails: Boolean(document.getElementById("prefMarketingEmails")?.checked)
        };
        try {
            const payload = await Api.updatePreferences({ language, notifications });
            state.user.preferences = payload.preferences || { language, notifications };
            DB.setCurrentUser(state.user);
            if (window.NILEDRIP_I18N && typeof window.NILEDRIP_I18N.setLocale === "function") {
                window.NILEDRIP_I18N.setLocale(language);
                return;
            }
            alert("Preferences saved.");
        } catch (err) {
            alert(err?.message || "Failed to save preferences.");
        }
    });

    document.getElementById("addAddressBtn")?.addEventListener("click", async () => {
        const payload = {
            label: String(document.getElementById("addrLabel")?.value || "Home").trim(),
            fullName: String(document.getElementById("addrFullName")?.value || "").trim(),
            phone: String(document.getElementById("addrPhone")?.value || "").trim(),
            line1: String(document.getElementById("addrLine1")?.value || "").trim(),
            line2: String(document.getElementById("addrLine2")?.value || "").trim(),
            city: String(document.getElementById("addrCity")?.value || "").trim(),
            state: String(document.getElementById("addrState")?.value || "").trim(),
            postalCode: String(document.getElementById("addrPostalCode")?.value || "").trim(),
            country: String(document.getElementById("addrCountry")?.value || "Egypt").trim(),
            isDefault: Boolean(document.getElementById("addrDefault")?.checked)
        };
        const validationError = validateAddressPayload(payload);
        if (validationError) return alert(validationError);
        try {
            state.addresses = await Api.addAddress(payload);
            renderAddresses();
            alert("Address added.");
        } catch (err) {
            alert(err?.message || "Failed to add address.");
        }
    });

    document.getElementById("addressesList")?.addEventListener("click", async (e) => {
        const defaultBtn = e.target.closest(".set-default-address-btn");
        if (defaultBtn) {
            try {
                state.addresses = await Api.setDefaultAddress(defaultBtn.dataset.id);
                renderAddresses();
                alert("Default address updated.");
            } catch (err) {
                alert(err?.message || "Failed to set default address.");
            }
            return;
        }
        const deleteBtn = e.target.closest(".delete-address-btn");
        if (deleteBtn) {
            try {
                state.addresses = await Api.deleteAddress(deleteBtn.dataset.id);
                renderAddresses();
                alert("Address deleted.");
            } catch (err) {
                alert(err?.message || "Failed to delete address.");
            }
        }
    });

    document.getElementById("syncStateBtn")?.addEventListener("click", async () => {
        try {
            await Promise.all([
                Api.updateMyWishlist(DB.getWishlist()),
                Api.updateMyCart(DB.getCart())
            ]);
            await DB.syncUserStateFromBackend();
            updateStats();
            alert("Cart and wishlist synced.");
        } catch (err) {
            alert(err?.message || "Failed to sync cart/wishlist.");
        }
    });

    function setupProfileStars() {
        const wrap = document.getElementById("profileReviewStars");
        if (!wrap) return;
        wrap.innerHTML = [1,2,3,4,5].map((n) => `<button type="button" class="star-btn" data-value="${n}" aria-label="${n} stars">☆</button>`).join("");
        const paint = (value) => wrap.querySelectorAll(".star-btn").forEach((b, idx) => { b.textContent = idx < value ? "★" : "☆"; b.classList.toggle("active", idx < value); });
        wrap.addEventListener("click", (e) => {
            const btn = e.target.closest(".star-btn");
            if (!btn) return;
            state.reviewRating = Number(btn.dataset.value || 0);
            paint(state.reviewRating);
        });
        paint(0);
    }

    function toggleRatingModal(open, productId = "") {
        const modal = document.getElementById("profileRatingModal");
        const productText = document.getElementById("profileRatingProductText");
        if (!modal) return;
        state.reviewTargetProductId = productId;
        if (!open) {
            state.reviewRating = 0;
            document.getElementById("profileReviewComment").value = "";
            modal.classList.remove("open");
            modal.setAttribute("aria-hidden", "true");
            document.querySelectorAll("#profileReviewStars .star-btn").forEach((b) => { b.textContent = "☆"; b.classList.remove("active"); });
            return;
        }
        if (productText) productText.textContent = `Product ID: ${productId}`;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }

    document.getElementById("ordersList")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".review-order-btn");
        if (!btn) return;
        toggleRatingModal(true, String(btn.dataset.productId || ""));
    });

    document.getElementById("cancelProfileRatingBtn")?.addEventListener("click", () => toggleRatingModal(false));
    document.getElementById("submitProfileRatingBtn")?.addEventListener("click", async () => {
        if (state.reviewRating < 1 || state.reviewRating > 5) return alert("Please select a star rating.");
        try {
            const comment = String(document.getElementById("profileReviewComment")?.value || "").trim();
            await Api.createReview({ productId: state.reviewTargetProductId, rating: state.reviewRating, comment });
            alert("Review submitted.");
            toggleRatingModal(false);
        } catch (err) {
            alert(err?.message || "Failed to submit review.");
        }
    });

    setupProfileStars();

    try {
        await loadProfile();
    } catch (err) {
        const msg = String(err?.message || "Failed to load profile.");
        if (/route not found/i.test(msg)) {
            alert("Profile API endpoint is unavailable on the running backend. Please restart backend and try again.");
            return;
        }
        alert(msg);
    }
})();