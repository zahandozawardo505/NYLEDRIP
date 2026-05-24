const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const email = document.getElementById("email")?.value.trim().toLowerCase();
        const password = document.getElementById("password")?.value || "";
        try {
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Logging in..."; }
            const { token, user } = await Api.login({ email, password });
            Api.setToken(token);
            DB.setCurrentUser(user);
            if (user.role === "seller") window.location.href = "seller-dashboard.html";
            else if (user.role === "admin") window.location.href = "admin.html";
            else window.location.href = "shop.html";
        } catch (err) {
            showToast(err.message || "Invalid credentials.", "error");
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Login"; }
        }
    });
}

document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
        showToast('Social login is not enabled yet.', 'info');
    });
});