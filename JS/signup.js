const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const firstName = document.getElementById("firstName")?.value.trim() || "";
        const lastName = document.getElementById("lastName")?.value.trim() || "";
        const email = document.getElementById("signupEmail")?.value.trim().toLowerCase() || "";
        const password = document.getElementById("signupPassword")?.value || "";
        const confirmPassword = document.getElementById("confirmPassword")?.value || "";
        if (!validateEmail(email)) return showToast("Please enter a valid email.", "error");
        if (!validatePassword(password)) return showToast("Password must be at least 8 characters.", "error");
        if (password !== confirmPassword) return showToast("Passwords do not match.", "error");
        try {
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating..."; }
            const { token, user } = await Api.signup({ name: `${firstName} ${lastName}`.trim() || "User", email, password, role: "user" });
            Api.setToken(token);
            DB.setCurrentUser(user);
            window.location.href = "shop.html";
        } catch (err) {
            showToast(err.message || "Signup failed.", "error");
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create Account"; }
        }
    });
}



function togglePasswordById(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (!input || !btn) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
    btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
}

document.getElementById("toggleSignupPassword")?.addEventListener("click", () => togglePasswordById("signupPassword", "toggleSignupPassword"));