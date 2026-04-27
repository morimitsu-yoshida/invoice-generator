const STORAGE_KEY = 'invoiceDraft_v1';

const sampleItems = [
    { desc: '作業', qty: 2, unit: '人工', unitPrice: 19000 },
    { desc: 'トラック', qty: '', unit: '日', unitPrice: '' },
    { desc: '機械代', qty: '', unit: '日', unitPrice: '' },
    { desc: '重機', qty: 1, unit: '日', unitPrice: 5000 },
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('issueDate').value = new Date().toISOString().split('T')[0];
    renderItemsHeader();
    sampleItems.forEach(addItemRow);
    bindEvents();
    renderPreview();
});

function bindEvents() {
    document.getElementById('addItemBtn').addEventListener('click', () => {
        addItemRow({ desc: '', qty: '', unit: '', unitPrice: '' });
        renderPreview();
    });
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('saveBtn').addEventListener('click', saveDraft);
    document.getElementById('loadBtn').addEventListener('click', loadDraft);
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('入力をリセットしますか？')) location.reload();
    });

    document.getElementById('invoiceForm').addEventListener('input', renderPreview);
}

function renderItemsHeader() {
    const c = document.getElementById('itemsContainer');
    const h = document.createElement('div');
    h.className = 'items-header';
    h.innerHTML = '<div>No</div><div>摘要</div><div>数量</div><div>単位</div><div>単価</div><div></div>';
    c.appendChild(h);
}

function addItemRow(item) {
    const container = document.getElementById('itemsContainer');
    const row = document.createElement('div');
    row.className = 'item-row';
    const idx = container.querySelectorAll('.item-row').length + 1;
    row.innerHTML = `
        <div class="item-no">${idx}</div>
        <input type="text" class="item-desc" value="${item.desc || ''}" placeholder="摘要">
        <input type="number" class="item-qty" value="${item.qty ?? ''}" placeholder="数量" step="any">
        <input type="text" class="item-unit" value="${item.unit || ''}" placeholder="単位">
        <input type="number" class="item-unitprice" value="${item.unitPrice ?? ''}" placeholder="単価" step="any">
        <button type="button" class="item-remove" title="削除">×</button>
    `;
    row.querySelector('.item-remove').addEventListener('click', () => {
        row.remove();
        renumberItems();
        renderPreview();
    });
    container.appendChild(row);
}

function renumberItems() {
    document.querySelectorAll('#itemsContainer .item-row').forEach((r, i) => {
        r.querySelector('.item-no').textContent = i + 1;
    });
}

function getFormData() {
    const items = Array.from(document.querySelectorAll('#itemsContainer .item-row')).map(r => ({
        desc: r.querySelector('.item-desc').value,
        qty: r.querySelector('.item-qty').value,
        unit: r.querySelector('.item-unit').value,
        unitPrice: r.querySelector('.item-unitprice').value,
    }));
    return {
        issueDate: document.getElementById('issueDate').value,
        recipient: document.getElementById('recipient').value,
        subject: document.getElementById('subject').value,
        taxRate: parseFloat(document.getElementById('taxRate').value) || 0,
        adjustment: parseFloat(document.getElementById('adjustment').value) || 0,
        notes: document.getElementById('notes').value,
        issuerName: document.getElementById('issuerName').value,
        issuerPerson: document.getElementById('issuerPerson').value,
        issuerZip: document.getElementById('issuerZip').value,
        issuerAddress: document.getElementById('issuerAddress').value,
        issuerTel: document.getElementById('issuerTel').value,
        bankName: document.getElementById('bankName').value,
        bankBranch: document.getElementById('bankBranch').value,
        bankAccountType: document.getElementById('bankAccountType').value,
        bankAccountNumber: document.getElementById('bankAccountNumber').value,
        bankAccountHolder: document.getElementById('bankAccountHolder').value,
        items,
    };
}

function setFormData(d) {
    if (!d) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    set('issueDate', d.issueDate);
    set('recipient', d.recipient);
    set('subject', d.subject);
    set('taxRate', d.taxRate);
    set('adjustment', d.adjustment);
    set('notes', d.notes);
    set('issuerName', d.issuerName);
    set('issuerPerson', d.issuerPerson);
    set('issuerZip', d.issuerZip);
    set('issuerAddress', d.issuerAddress);
    set('issuerTel', d.issuerTel);
    set('bankName', d.bankName);
    set('bankBranch', d.bankBranch);
    set('bankAccountType', d.bankAccountType);
    set('bankAccountNumber', d.bankAccountNumber);
    set('bankAccountHolder', d.bankAccountHolder);

    const c = document.getElementById('itemsContainer');
    c.querySelectorAll('.item-row').forEach(r => r.remove());
    (d.items || []).forEach(addItemRow);
}

function fmtYen(n) {
    if (n == null || isNaN(n)) return '';
    return '¥' + Math.round(n).toLocaleString('ja-JP');
}

function fmtNum(n) {
    if (n === '' || n == null || isNaN(n)) return '';
    return Number(n).toLocaleString('ja-JP');
}

function fmtDate(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${y}/${m}/${d}`;
}

function calcRowAmount(item) {
    const q = parseFloat(item.qty);
    const p = parseFloat(item.unitPrice);
    if (isNaN(q) || isNaN(p)) return null;
    return q * p;
}

function renderPreview() {
    const d = getFormData();
    const subtotal = d.items.reduce((sum, it) => sum + (calcRowAmount(it) || 0), 0);
    const tax = Math.floor(subtotal * (d.taxRate / 100));
    const total = subtotal + tax + (d.adjustment || 0);

    const itemRowsHTML = d.items.map((it, i) => {
        const amt = calcRowAmount(it);
        return `
            <tr>
                <td class="no">${i + 1}</td>
                <td class="desc">${escapeHTML(it.desc)}</td>
                <td class="qty">${fmtNum(it.qty)}${it.unit ? ' ' + escapeHTML(it.unit) : ''}</td>
                <td class="unit-price">${fmtNum(it.unitPrice)}</td>
                <td class="amount">${amt != null ? fmtYen(amt) : ''}</td>
            </tr>`;
    }).join('');

    const blanksNeeded = Math.max(0, 6 - d.items.length);
    const blankRows = Array(blanksNeeded).fill(
        '<tr><td class="no"></td><td class="desc"></td><td class="qty"></td><td class="unit-price"></td><td class="amount"></td></tr>'
    ).join('');

    const adjRow = d.adjustment !== 0 ? `
        <tr class="summary"><td colspan="4" class="label">差額調整</td><td class="amount">${fmtYen(d.adjustment)}</td></tr>
    ` : `
        <tr><td colspan="4" style="text-align:right;">差額調整</td><td class="amount"></td></tr>
    `;

    const html = `
        <div class="inv-title">請　求　書</div>

        <div class="inv-top">
            <div>
                <div class="inv-recipient">
                    <span class="name">${escapeHTML(d.recipient)}</span><span class="sama">様</span>
                </div>
                ${d.subject ? `
                <div class="inv-subject">件名：${escapeHTML(d.subject)}</div>
                <div class="inv-subject-sub">下記の通り、ご請求申し上げます。</div>
                ` : '<div class="inv-subject-sub" style="margin-top:16px;">下記の通り、ご請求申し上げます。</div>'}
            </div>
            <div class="inv-issuer">
                <div class="issue-date"><span class="label">請求日</span><span class="value">${fmtDate(d.issueDate)}</span></div>
                <div>${escapeHTML(d.issuerZip)}</div>
                <div>${escapeHTML(d.issuerAddress)}</div>
                <div>TEL：${escapeHTML(d.issuerTel)}</div>
                <div style="margin-top:8px;">${escapeHTML(d.issuerName)}</div>
                <div>担当：${escapeHTML(d.issuerPerson)}</div>
            </div>
        </div>

        <div class="inv-total-box">
            <span class="label">合計金額</span>
            <span class="value">${fmtYen(total)}</span>
            <span class="tax-incl">（税込）</span>
        </div>

        <table class="inv-items">
            <thead>
                <tr>
                    <th>No.</th><th>摘要</th><th>数量</th><th>単価</th><th>金額</th>
                </tr>
            </thead>
            <tbody>
                ${itemRowsHTML}
                ${blankRows}
                ${adjRow}
                <tr class="summary"><td colspan="4" class="label">小計</td><td class="amount">${fmtYen(subtotal)}</td></tr>
                <tr class="summary"><td colspan="4" class="label">消費税</td><td class="amount">${fmtYen(tax)}</td></tr>
                <tr class="summary"><td colspan="4" class="label">合計</td><td class="amount">${fmtYen(total)}</td></tr>
            </tbody>
        </table>

        <div class="inv-bottom">
            <div class="inv-bank">
                <div class="label">お振込先</div>
                <div class="row">${escapeHTML(d.bankName)}</div>
                <div class="row">口座名義　${escapeHTML(d.bankAccountHolder)}</div>
                <div class="row">口座番号　${escapeHTML(d.bankBranch)} ${escapeHTML(d.bankAccountType)} ${escapeHTML(d.bankAccountNumber)}</div>
            </div>
            <div class="inv-remarks">
                <div class="label">備考</div>
                <div class="body">${escapeHTML(d.notes)}</div>
            </div>
        </div>
    `;

    document.getElementById('invoicePreview').innerHTML = html;
}

function escapeHTML(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormData()));
    alert('下書きを保存しました');
}

function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { alert('保存された下書きはありません'); return; }
    setFormData(JSON.parse(raw));
    renderPreview();
}
