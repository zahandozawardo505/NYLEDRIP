(function () {
    const form      = document.getElementById('sellerForm');
    const nextBtn   = document.getElementById('nextBtn');
    const prevBtn   = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const stepDots  = document.querySelectorAll('.step-dot');

    let currentStep = 1;
    const totalSteps = 3;

    // --- Pop-Up Generator ---
    function showPopUp(titleText, messages, isSuccess = false) {
        let overlay = document.getElementById('modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box">
                    <h3 id="modal-title"></h3>
                    <ul id="modal-list"></ul>
                    <button type="button" id="modal-close" class="btn btn-primary">Got it</button>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('modal-close').onclick = () => overlay.classList.remove('visible');
        }

        const title = document.getElementById('modal-title');
        const list = document.getElementById('modal-list');
        
        title.innerText = titleText;
        title.style.color = isSuccess ? '#2ecc71' : 'var(--primary-color)';
        
        list.innerHTML = '';
        messages.forEach(msg => {
            const li = document.createElement('li');
            li.innerText = msg;
            list.appendChild(li);
        });

        overlay.classList.add('visible');
    }

    // --- Full Validation Logic ---
    function validateStep(step) {
        let errors = [];

        if (step === 1) {
            const brand = document.getElementById('brandName').value.trim();
            const desc = document.getElementById('brandDescription').value.trim();
            const category = document.getElementById('brandCategory').value;
            const owner = document.getElementById('ownerName').value.trim();
            const phone = document.getElementById('ownerPhone').value.trim();

            if (brand.length < 2) errors.push("Enter a valid Brand Name.");
            if (desc.length < 15) errors.push("Description should be at least 15 characters.");
            if (!category) errors.push("Please select a Product Category.");
            if (owner.length < 3) errors.push("Please enter the Owner's Full Name.");
            
            // Phone: Digits only, 10-15 chars
            if (!/^\d+$/.test(phone)) {
                errors.push("Phone number must contain only digits.");
            } else if (phone.length < 10 || phone.length > 15) {
                errors.push("Phone number must be between 10 and 15 digits.");
            }
        }

        if (step === 2) {
            const email = document.getElementById('sellerEmail').value.trim();
            const license = document.getElementById('businessLicense').value;
            const bank = document.getElementById('bankAccount').value.trim();
            const pass = document.getElementById('sellerPassword').value;
            const confirm = document.getElementById('confirmSellerPassword').value;

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid Email is required.");
            if (!license) errors.push("Please upload your Business License or ID.");
            if (bank.length < 8) errors.push("Enter a valid Bank Account number.");
            if (!pass || pass.length < 8) errors.push("Password must be at least 8 characters.");
            if (pass !== confirm) errors.push("Password confirmation does not match.");
        }

        if (step === 3) {
            if (!document.getElementById('termsCheck').checked) errors.push("Agree to Terms & Conditions.");
            if (!document.getElementById('authenticityCheck').checked) errors.push("Confirm product authenticity.");
        }

        if (errors.length > 0) {
            showPopUp("Wait a second...", errors);
            return false;
        }
        return true;
    }

    function updateStepUI(n) {
        document.querySelectorAll('.form-step').forEach((step, i) => {
            step.classList.toggle('active', i + 1 === n);
        });
        stepDots.forEach((dot, i) => {
            dot.classList.toggle('active', i + 1 <= n);
        });
        
        if (prevBtn) prevBtn.style.display = n > 1 ? 'inline-block' : 'none';
        if (nextBtn) nextBtn.style.display = n < totalSteps ? 'inline-block' : 'none';
        if (submitBtn) submitBtn.style.display = n === totalSteps ? 'inline-block' : 'none';
    }

    nextBtn?.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepUI(currentStep);
        }
    });

    prevBtn?.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepUI(currentStep);
        }
    });

    form?.addEventListener('submit', async e => {
        e.preventDefault();
        if (validateStep(currentStep)) {
            const formData = new FormData(form);
            const brandName = String(formData.get('brandName') || '').trim();
            const sellerEmail = String(formData.get('email') || '').trim().toLowerCase();
            const password = String(formData.get('sellerPassword') || '').trim();
            const licenseFile = document.getElementById('businessLicense')?.files?.[0] || null;
            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';
                }
                if (!licenseFile) throw new Error('Business license document is required.');
                const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
                if (!allowedTypes.has(licenseFile.type)) {
                    throw new Error('Only PDF, JPG, PNG, and WEBP files are allowed.');
                }
                if (licenseFile.size > 5 * 1024 * 1024) {
                    throw new Error('File is too large. Maximum size is 5MB.');
                }
                await Api.applySellerWithFile({
                    brandName,
                    brandDescription: String(formData.get('brandDescription') || ''),
                    brandCategory: String(formData.get('brandCategory') || ''),
                    ownerName: String(formData.get('ownerName') || ''),
                    ownerPhone: String(formData.get('ownerPhone') || ''),
                    sellerEmail,
                    password,
                    bankAccount: String(formData.get('bankAccount') || '')
                }, licenseFile);
                showPopUp("Success!", ["Application submitted with status: waiting. Admin review is required before login."], true);
                form.reset();
                currentStep = 1;
                updateStepUI(1);
            } catch (err) {
                showPopUp("Error", [err.message || "Failed to create seller account"]);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Application';
                }
            }
        }
    });

    document.querySelectorAll('[data-checkbox-card]').forEach(card => {
        card.addEventListener('click', event => {
            if (event.target.closest('a') || event.target.matches('input,label')) return;
            const checkbox = document.getElementById(card.dataset.checkboxCard);
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    updateStepUI(1);
})();