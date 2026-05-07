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

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid Email is required.");
            if (!license) errors.push("Please upload your Business License or ID.");
            if (bank.length < 8) errors.push("Enter a valid Bank Account number.");
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

    form?.addEventListener('submit', e => {
        e.preventDefault();
        if (validateStep(currentStep)) {
            // Save data logic
            const formData = new FormData(form);
            const application = {
                id: 'APP-' + Date.now(),
                brandName: formData.get('brandName'),
                brandDescription: formData.get('brandDescription'),
                brandCategory: formData.get('brandCategory'),
                ownerName: formData.get('ownerName'),
                ownerPhone: formData.get('ownerPhone'),
                sellerEmail: formData.get('sellerEmail'),
                bankAccount: formData.get('bankAccount'),
                appliedAt: new Date().toISOString(),
                status: 'pending'
            };

            const apps = DB.applications;
            apps.push(application);
            DB.saveApplications(apps);

            showPopUp("Success!", ["Application submitted! We'll review it in 24-48h."], true);
            form.reset();
            currentStep = 1;
            updateStepUI(1);
        }
    });

    updateStepUI(1);
})();