/**
 * QuoteCraft - Premium Edition
 * Full application logic with custom Modals.
 */

const ui = {
    alert(title, message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-actions"><button class="btn btn-primary" id="modal-ok">OK</button></div>
                </div>`;
            document.getElementById('modal-container').appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
            
            document.getElementById('modal-ok').onclick = () => {
                overlay.classList.remove('show');
                setTimeout(() => { overlay.remove(); resolve(); }, 300);
            };
        });
    },
    confirm(title, message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
                        <button class="btn btn-primary" style="background:#ef4444;" id="modal-confirm">Delete</button>
                    </div>
                </div>`;
            document.getElementById('modal-container').appendChild(overlay);
            setTimeout(() => overlay.classList.add('show'), 10);
            
            document.getElementById('modal-cancel').onclick = () => {
                overlay.classList.remove('show');
                setTimeout(() => { overlay.remove(); resolve(false); }, 300);
            };
            document.getElementById('modal-confirm').onclick = () => {
                overlay.classList.remove('show');
                setTimeout(() => { overlay.remove(); resolve(true); }, 300);
            };
        });
    }
};

const app = {
    data: {
        items: [],
        currencyFormat: new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }),
        currencySymbol: '৳'
    },

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.loadProfile();
        this.loadDashboardData();
        this.renderQuotationsTable();
        if(this.data.items.length === 0) this.addLineItem(); 
        
        document.getElementById('quotation-form').addEventListener('input', () => {
            this.calculateTotals();
            this.updatePreview();
        });
    },

    cacheDOM() {
        this.sidebar = document.getElementById('sidebar');
        this.views = document.querySelectorAll('.view');
        this.itemsTbody = document.getElementById('items-tbody');
    },

    bindEvents() {
        document.getElementById('mobile-menu-btn').addEventListener('click', () => this.sidebar.classList.add('open'));
        document.getElementById('close-sidebar-btn').addEventListener('click', () => this.sidebar.classList.remove('open'));
        
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(e.currentTarget.getAttribute('data-view'));
                if (window.innerWidth <= 768) this.sidebar.classList.remove('open');
            });
        });

        document.getElementById('quote-currency').addEventListener('change', (e) => {
            const symMap = { BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
            this.data.currencySymbol = symMap[e.target.value] || '';
            this.calculateTotals();
            this.updatePreview();
        });

        document.getElementById('profile-logo').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById('profile-logo-img').src = ev.target.result;
                    document.getElementById('profile-logo-img').classList.remove('hidden');
                    document.getElementById('profile-logo-icon').classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    },

    switchView(viewName) {
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-links a[data-view="${viewName}"]`).classList.add('active');
        this.views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active');
        if (viewName === 'quotations') this.renderQuotationsTable();
        if (viewName === 'dashboard') this.loadDashboardData();
    },

    addLineItem() {
        const id = 'item-' + Date.now();
        this.data.items.push({ id, desc: '', qty: 1, price: 0 });
        this.renderItems();
    },

    removeItem(id) {
        this.data.items = this.data.items.filter(item => item.id !== id);
        this.renderItems();
        this.calculateTotals();
        this.updatePreview();
    },

    updateItem(id, field, value) {
        const item = this.data.items.find(i => i.id === id);
        if (item) {
            item[field] = field === 'desc' ? value : parseFloat(value) || 0;
            if(item.qty < 0) item.qty = 0;
            if(item.price < 0) item.price = 0;
            
            const totalCell = document.getElementById(`total-${id}`);
            if(totalCell) totalCell.textContent = this.formatMoney(item.qty * item.price);
        }
        this.calculateTotals();
        this.updatePreview();
    },

    renderItems() {
        this.itemsTbody.innerHTML = '';
        this.data.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" placeholder="Item description" value="${item.desc}" oninput="app.updateItem('${item.id}', 'desc', this.value)"></td>
                <td><input type="number" min="0" value="${item.qty}" oninput="app.updateItem('${item.id}', 'qty', this.value)"></td>
                <td><input type="number" min="0" step="0.01" value="${item.price}" oninput="app.updateItem('${item.id}', 'price', this.value)"></td>
                <td class="text-right" id="total-${item.id}">${this.formatMoney(item.qty * item.price)}</td>
                <td><button type="button" class="icon-btn" style="color:#ef4444;" onclick="app.removeItem('${item.id}')"><i class="ph ph-trash"></i></button></td>
            `;
            this.itemsTbody.appendChild(tr);
        });
    },

    calculateTotals() {
        let subtotal = this.data.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
        
        const discType = document.getElementById('discount-type').value;
        let discVal = parseFloat(document.getElementById('discount-value').value) || 0;
        let discount = discType === 'percent' ? (subtotal * (discVal / 100)) : discVal;
        if (discount > subtotal) discount = subtotal;

        let afterDiscount = subtotal - discount;
        let taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
        let tax = afterDiscount * (taxRate / 100);
        let extra = parseFloat(document.getElementById('extra-charge').value) || 0;
        let grandTotal = afterDiscount + tax + extra;

        document.getElementById('calc-subtotal').textContent = this.formatMoney(subtotal);
        document.getElementById('calc-grand-total').textContent = this.formatMoney(grandTotal);

        return { subtotal, discount, tax, extra, grandTotal };
    },

    formatMoney(amount) {
        return this.data.currencySymbol + ' ' + this.data.currencyFormat.format(amount);
    },

    updatePreview() {
        const val = (id) => document.getElementById(id).value || '';
        
        document.getElementById('doc-business-name').textContent = val('business-name') || 'Your Business Name';
        const bContact = [val('business-email'), val('business-phone'), val('business-address')].filter(Boolean).join('\n');
        document.getElementById('doc-business-contact').innerText = bContact;
        
        document.getElementById('doc-title-display').textContent = val('quote-title').toUpperCase() || 'QUOTATION';
        document.getElementById('doc-quote-number').textContent = val('quote-number');
        document.getElementById('doc-issue-date').textContent = val('quote-issue-date');
        document.getElementById('doc-expiry-date').textContent = val('quote-expiry-date');

        document.getElementById('doc-client-name').textContent = val('client-name') || 'Client Name';
        const cContact = [val('client-email'), val('client-phone'), val('client-address')].filter(Boolean).join('\n');
        document.getElementById('doc-client-contact').innerText = cContact;

        const tbody = document.getElementById('doc-items-body');
        tbody.innerHTML = '';
        this.data.items.forEach(item => {
            if(item.desc.trim() === '' && item.price === 0) return;
            tbody.innerHTML += `<tr>
                <td>${item.desc}</td><td>${item.qty}</td><td>${this.formatMoney(item.price)}</td><td class="text-right">${this.formatMoney(item.qty * item.price)}</td>
            </tr>`;
        });

        const totals = this.calculateTotals();
        document.getElementById('doc-subtotal').textContent = this.formatMoney(totals.subtotal);
        document.getElementById('doc-grand-total').textContent = this.formatMoney(totals.grandTotal);
        
        document.getElementById('doc-discount').textContent = '-' + this.formatMoney(totals.discount);
        document.getElementById('doc-discount-row').style.display = totals.discount > 0 ? 'flex' : 'none';
        
        document.getElementById('doc-tax').textContent = this.formatMoney(totals.tax);
        document.getElementById('doc-tax-row').style.display = totals.tax > 0 ? 'flex' : 'none';
        
        document.getElementById('doc-extra').textContent = this.formatMoney(totals.extra);
        document.getElementById('doc-extra-row').style.display = totals.extra > 0 ? 'flex' : 'none';

        document.getElementById('doc-terms').innerText = val('quote-terms');
        document.getElementById('doc-terms-block').style.display = val('quote-terms') ? 'block' : 'none';
        document.getElementById('doc-notes').innerText = val('quote-notes');
        document.getElementById('doc-notes-block').style.display = val('quote-notes') ? 'block' : 'none';
    },

    changeTemplate(templateClass) {
        const preview = document.getElementById('a4-preview');
        preview.className = 'a4-document ' + templateClass;
    },
    
    async setDefaultTemplate(templateClass) {
        document.getElementById('preview-template-selector').value = templateClass;
        this.changeTemplate(templateClass);
        await ui.alert('Success', 'Default template style updated!');
    },

    resetForm() {
        document.getElementById('quotation-form').reset();
        document.getElementById('quote-id').value = '';
        this.data.items = [];
        
        const year = new Date().getFullYear();
        document.getElementById('quote-number').value = `QT-${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const today = new Date();
        document.getElementById('quote-issue-date').value = today.toISOString().split('T')[0];
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('quote-expiry-date').value = nextWeek.toISOString().split('T')[0];
        
        const profile = JSON.parse(localStorage.getItem('qc_profile') || '{}');
        if(profile.name) document.getElementById('business-name').value = profile.name;
        if(profile.email) document.getElementById('business-email').value = profile.email;
        if(profile.phone) document.getElementById('business-phone').value = profile.phone;
        if(profile.address) document.getElementById('business-address').value = profile.address;
        
        if(profile.logo) {
            document.getElementById('doc-logo').src = profile.logo;
            document.getElementById('doc-logo').style.display = 'block';
        } else {
            document.getElementById('doc-logo').style.display = 'none';
        }

        this.addLineItem();
        this.updatePreview();
    },

    async saveProfile() {
        const logoImg = document.getElementById('profile-logo-img').src;
        const profile = {
            name: document.getElementById('prof-name').value,
            email: document.getElementById('prof-email').value,
            phone: document.getElementById('prof-phone').value,
            address: document.getElementById('prof-address').value,
            website: document.getElementById('prof-website').value,
            logo: logoImg.length > 100 ? logoImg : null
        };
        localStorage.setItem('qc_profile', JSON.stringify(profile));
        await ui.alert('Profile Saved', 'Your business profile has been updated locally.');
    },

    loadProfile() {
        const profile = JSON.parse(localStorage.getItem('qc_profile') || '{}');
        if(profile.name) document.getElementById('prof-name').value = profile.name;
        if(profile.email) document.getElementById('prof-email').value = profile.email;
        if(profile.phone) document.getElementById('prof-phone').value = profile.phone;
        if(profile.address) document.getElementById('prof-address').value = profile.address;
        if(profile.website) document.getElementById('prof-website').value = profile.website;
        if(profile.logo) {
            document.getElementById('profile-logo-img').src = profile.logo;
            document.getElementById('profile-logo-img').classList.remove('hidden');
            document.getElementById('profile-logo-icon').classList.add('hidden');
        }
    },

    async saveQuotation(status) {
        if(!document.getElementById('quotation-form').checkValidity()) {
            document.getElementById('quotation-form').reportValidity();
            return;
        }

        const quoteId = document.getElementById('quote-id').value || 'q_' + Date.now();
        const totals = this.calculateTotals();
        
        const quoteData = {
            id: quoteId,
            status: status,
            number: document.getElementById('quote-number').value,
            client: document.getElementById('client-name').value,
            date: document.getElementById('quote-issue-date').value,
            total: totals.grandTotal,
            currencySymbol: this.data.currencySymbol,
            formState: {
                currency: document.getElementById('quote-currency').value,
                title: document.getElementById('quote-title').value,
                expiry: document.getElementById('quote-expiry-date').value,
                bName: document.getElementById('business-name').value,
                bEmail: document.getElementById('business-email').value,
                bPhone: document.getElementById('business-phone').value,
                bAddress: document.getElementById('business-address').value,
                cEmail: document.getElementById('client-email').value,
                cPhone: document.getElementById('client-phone').value,
                cAddress: document.getElementById('client-address').value,
                items: this.data.items,
                discType: document.getElementById('discount-type').value,
                discVal: document.getElementById('discount-value').value,
                tax: document.getElementById('tax-rate').value,
                extra: document.getElementById('extra-charge').value,
                terms: document.getElementById('quote-terms').value,
                notes: document.getElementById('quote-notes').value,
                template: document.getElementById('preview-template-selector').value
            }
        };

        let quotations = JSON.parse(localStorage.getItem('qc_quotations') || '[]');
        const existingIndex = quotations.findIndex(q => q.id === quoteId);
        if(existingIndex >= 0) {
            quotations[existingIndex] = quoteData;
        } else {
            quotations.unshift(quoteData);
        }

        localStorage.setItem('qc_quotations', JSON.stringify(quotations));
        await ui.alert('Saved', 'Quotation successfully saved!');
        this.switchView('dashboard');
    },

    loadQuotation(id) {
        const quotations = JSON.parse(localStorage.getItem('qc_quotations') || '[]');
        const quote = quotations.find(q => q.id === id);
        if(!quote) return;

        this.switchView('create');
        document.getElementById('create-view-title').textContent = 'Edit Quotation';
        
        document.getElementById('quote-id').value = quote.id;
        document.getElementById('quote-number').value = quote.number;
        document.getElementById('client-name').value = quote.client;
        document.getElementById('quote-issue-date').value = quote.date;
        
        const f = quote.formState;
        document.getElementById('quote-currency').value = f.currency;
        document.getElementById('quote-title').value = f.title;
        document.getElementById('quote-expiry-date').value = f.expiry;
        document.getElementById('business-name').value = f.bName;
        document.getElementById('business-email').value = f.bEmail;
        document.getElementById('business-phone').value = f.bPhone;
        document.getElementById('business-address').value = f.bAddress;
        document.getElementById('client-email').value = f.cEmail;
        document.getElementById('client-phone').value = f.cPhone;
        document.getElementById('client-address').value = f.cAddress;
        
        this.data.items = f.items;
        this.renderItems();
        
        document.getElementById('discount-type').value = f.discType;
        document.getElementById('discount-value').value = f.discVal;
        document.getElementById('tax-rate').value = f.tax;
        document.getElementById('extra-charge').value = f.extra;
        document.getElementById('quote-terms').value = f.terms;
        document.getElementById('quote-notes').value = f.notes;
        
        document.getElementById('preview-template-selector').value = f.template;
        this.changeTemplate(f.template);
        
        document.getElementById('quote-currency').dispatchEvent(new Event('change'));
    },

    async deleteQuotation(id) {
        const confirmDelete = await ui.confirm('Delete Quotation', 'Are you sure you want to permanently delete this quotation?');
        if(confirmDelete) {
            let quotations = JSON.parse(localStorage.getItem('qc_quotations') || '[]');
            quotations = quotations.filter(q => q.id !== id);
            localStorage.setItem('qc_quotations', JSON.stringify(quotations));
            this.loadDashboardData();
            this.renderQuotationsTable();
        }
    },

    loadDashboardData() {
        const quotations = JSON.parse(localStorage.getItem('qc_quotations') || '[]');
        document.getElementById('stat-total').textContent = quotations.length;
        document.getElementById('stat-completed').textContent = quotations.filter(q => q.status !== 'draft').length;
        
        // Calculate Total Revenue
        let rev = quotations.reduce((sum, q) => sum + q.total, 0);
        document.getElementById('stat-revenue').textContent = this.data.currencyFormat.format(rev);

        const tbody = document.getElementById('recent-quotations-body');
        tbody.innerHTML = '';
        
        if (quotations.length === 0) {
            document.getElementById('dashboard-empty-state').classList.remove('hidden');
            document.getElementById('dashboard-table-container').classList.add('hidden');
        } else {
            document.getElementById('dashboard-empty-state').classList.add('hidden');
            document.getElementById('dashboard-table-container').classList.remove('hidden');
            quotations.slice(0,5).forEach(q => tbody.appendChild(this.createQuoteRow(q)));
        }
    },

    renderQuotationsTable() {
        const quotations = JSON.parse(localStorage.getItem('qc_quotations') || '[]');
        const tbody = document.getElementById('all-quotations-body');
        tbody.innerHTML = '';
        quotations.forEach(q => tbody.appendChild(this.createQuoteRow(q)));
    },

    createQuoteRow(q) {
        const tr = document.createElement('tr');
        const totalFormatted = q.currencySymbol + ' ' + this.data.currencyFormat.format(q.total);
        tr.innerHTML = `
            <td><strong>${q.number}</strong></td>
            <td>${q.client}</td>
            <td>${q.date}</td>
            <td><strong>${totalFormatted}</strong></td>
            <td><span style="background:#f4f4f5; color:#09090b; padding:4px 12px; border-radius:99px; font-size:12px; font-weight:600;">${q.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" style="padding:4px 12px;" onclick="app.loadQuotation('${q.id}')">Edit</button>
                <button class="icon-btn" style="color:#ef4444;" onclick="app.deleteQuotation('${q.id}')"><i class="ph ph-trash"></i></button>
            </td>
        `;
        return tr;
    },
    
    async clearAllData() {
        const confirmClear = await ui.confirm('Wipe All Data?', 'WARNING: This will permanently delete all quotations and profile data from this browser. Are you absolutely sure?');
        if(confirmClear) {
            localStorage.removeItem('qc_quotations');
            localStorage.removeItem('qc_profile');
            location.reload();
        }
    },

    printPreview() {
        this.updatePreview();
        const printContainer = document.getElementById('print-container');
        printContainer.innerHTML = '';
        const clonedA4 = document.getElementById('a4-preview').cloneNode(true);
        printContainer.appendChild(clonedA4);
        window.print();
    },

    exportPDF() {
        this.updatePreview();
        const element = document.getElementById('a4-preview');
        const quoteNumber = document.getElementById('quote-number').value || 'Quotation';
        
        const opt = {
            margin:       [0, 0, 0, 0],
            filename:     `${quoteNumber}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
