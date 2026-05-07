(function () {
    function safeGet(key, fallback) {
        if (typeof Store !== 'undefined' && Store.get) {
            return Store.get(key, fallback);
        }

        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    }

    function safeSet(key, value) {
        if (typeof Store !== 'undefined' && Store.set) {
            Store.set(key, value);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }

    function safeRemove(key) {
        if (typeof Store !== 'undefined' && Store.remove) {
            Store.remove(key);
        } else {
            localStorage.removeItem(key);
        }
    }

    const current = safeGet('niledrip_current_user', null);

    const greet = document.getElementById('greetText');
    const mail = document.getElementById('mailText');

    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const emailInput = document.getElementById('emailInput');

    const addressInput = document.getElementById('addressInput');
    const addressText = document.getElementById('addressText');

    if (current && current.email) {
        const fullName = [current.firstName, current.lastName].filter(Boolean).join(' ').trim();

        greet.textContent = 'Hi ' + (fullName || current.email.split('@')[0]);
        mail.textContent = current.email;

        firstNameInput.value = current.firstName || '';
        lastNameInput.value = current.lastName || '';
        emailInput.value = current.email || '';

        if (current.address) {
            addressText.textContent = current.address;
            addressInput.value = current.address;
        }
    }

    const menuLinks = document.querySelectorAll('.menu-link');
    const sections = document.querySelectorAll('.tab-section');

    menuLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            const tabId = link.dataset.tab;

            menuLinks.forEach(function (item) {
                item.classList.remove('active');
            });

            sections.forEach(function (section) {
                section.classList.remove('active');
            });

            link.classList.add('active');

            const selectedSection = document.getElementById(tabId);
            if (selectedSection) {
                selectedSection.classList.add('active');
            }
        });
    });

    const saveDetailsBtn = document.getElementById('saveDetailsBtn');

    if (saveDetailsBtn) {
        saveDetailsBtn.addEventListener('click', function () {
            const updatedUser = {
                ...(safeGet('niledrip_current_user', {}) || {}),
                firstName: firstNameInput.value.trim(),
                lastName: lastNameInput.value.trim(),
                email: emailInput.value.trim()
            };

            safeSet('niledrip_current_user', updatedUser);

            const fullName = [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(' ').trim();
            greet.textContent = 'Hi ' + (fullName || updatedUser.email.split('@')[0]);
            mail.textContent = updatedUser.email;

            alert('Details saved successfully.');
        });
    }

    const saveAddressBtn = document.getElementById('saveAddressBtn');

    if (saveAddressBtn) {
        saveAddressBtn.addEventListener('click', function () {
            const updatedUser = {
                ...(safeGet('niledrip_current_user', {}) || {}),
                address: addressInput.value.trim()
            };

            safeSet('niledrip_current_user', updatedUser);

            addressText.textContent = updatedUser.address || 'No saved address yet.';
            alert('Address saved successfully.');
        });
    }

    const findOrderBtn = document.getElementById('findOrderBtn');

    if (findOrderBtn) {
        findOrderBtn.addEventListener('click', function () {
            window.location.href = 'shop.html';
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            safeRemove('niledrip_current_user');
            window.location.href = 'login.html';
        });
    }
})();