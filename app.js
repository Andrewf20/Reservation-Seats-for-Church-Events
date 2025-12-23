// ===== BASIC CONFIG =====
const defaultConfig = {
    church_name: "الكنيسة الأرثوذكسية",
    church_tagline: "مرحباً بكم في بيت الرب",
    book_now_button: "احجز الآن",
    confirm_button: "تأكيد الحجز",
    cancel_button: "إلغاء",
    background_color: "#D4AF37",
    surface_color: "#ffffff",
    text_color: "#495057",
    primary_action_color: "#5D3A7A",
    secondary_action_color: "#10b981"
};

const ADMIN_EMAIL = "admin@church.com";
const ADMIN_PASSWORD = "Church2026";

let SEATS_CONFIG = {
    vip:    { rows: 5, seatsPerRow: 10, price: 150, prefix: 'V' },
    regular:{ rows: 8, seatsPerRow: 15, price: 100, prefix: 'R' },
    back:   { rows: 7, seatsPerRow: 20, price: 75,  prefix: 'B' }
};

const COMPANION_PRICES = { 0: 0, 1: 50, 2: 100, 3: 150 };

let currentUser = null;
let allBookings = [];
let selectedSeat = null;
let selectedPaymentMethod = null;
let currentStep = 1;
let bookingData = {};
let currentView = 'dashboard';

// ===== LOCAL STORAGE HELPERS =====
function loadSeatConfig() {
    const saved = localStorage.getItem('seatConfig');
    if (saved) {
        const cfg = JSON.parse(saved);
        ['vip','regular','back'].forEach(zone => {
            if (cfg[zone]) {
                SEATS_CONFIG[zone].price       = cfg[zone].price       ?? SEATS_CONFIG[zone].price;
                SEATS_CONFIG[zone].rows        = cfg[zone].rows        ?? SEATS_CONFIG[zone].rows;
                SEATS_CONFIG[zone].seatsPerRow = cfg[zone].seatsPerRow ?? SEATS_CONFIG[zone].seatsPerRow;
            }
        });
    }
}

function saveSeatConfig() {
    const cfg = {
        vip: {
            price: SEATS_CONFIG.vip.price,
            rows: SEATS_CONFIG.vip.rows,
            seatsPerRow: SEATS_CONFIG.vip.seatsPerRow
        },
        regular: {
            price: SEATS_CONFIG.regular.price,
            rows: SEATS_CONFIG.regular.rows,
            seatsPerRow: SEATS_CONFIG.regular.seatsPerRow
        },
        back: {
            price: SEATS_CONFIG.back.price,
            rows: SEATS_CONFIG.back.rows,
            seatsPerRow: SEATS_CONFIG.back.seatsPerRow
        }
    };
    localStorage.setItem('seatConfig', JSON.stringify(cfg));
}


function loadBookingsFromStorage() {
    const saved = localStorage.getItem('bookings');
    allBookings = saved ? JSON.parse(saved) : [];
}

function saveBookingsToStorage() {
    localStorage.setItem('bookings', JSON.stringify(allBookings));
}

// ===== SEATS GENERATION =====
function generateAllSeats() {
    const seats = [];
    Object.entries(SEATS_CONFIG).forEach(([zone, config]) => {
        for (let row = 1; row <= config.rows; row++) {
            for (let seat = 1; seat <= config.seatsPerRow; seat++) {
                seats.push({
                    number: `${config.prefix}${row}-${seat}`,
                    zone: zone,
                    price: config.price
                });
            }
        }
    });
    return seats;
}

let ALL_SEATS = generateAllSeats();

// ===== APP INIT =====
async function initApp() {
   loadSeatConfig();
    ALL_SEATS = generateAllSeats();
    loadBookingsFromStorage();

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        renderCurrentView();
    } else {
        renderLogin();
    }
}

// ===== LOGIN / HEADER =====
function renderLogin() {
    const config = defaultConfig;
    const app = document.getElementById('app');
    document.getElementById('mainFooter').style.display = 'none';
    app.innerHTML = `
        <div class="login-container">
            <svg class="login-cross" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#5D3A7A;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#8B0000;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="42" y="15" width="16" height="70" fill="url(#crossGradient)" rx="3"/>
                <rect x="20" y="37" width="60" height="16" fill="url(#crossGradient)" rx="3"/>
                <circle cx="50" cy="45" r="6" fill="#ffffff"/>
                <circle cx="50" cy="30" r="3" fill="#ffffff" opacity="0.7"/>
                <circle cx="50" cy="60" r="3" fill="#ffffff" opacity="0.7"/>
                <circle cx="35" cy="45" r="3" fill="#ffffff" opacity="0.7"/>
                <circle cx="65" cy="45" r="3" fill="#ffffff" opacity="0.7"/>
            </svg>
            <div class="login-title">${config.church_name}</div>
            <div class="login-subtitle">${config.church_tagline}</div>
            <div class="input-group">
                <label class="input-label" for="loginEmail">البريد الإلكتروني</label>
                <input type="email" class="input-field" id="loginEmail" placeholder="أدخل بريدك الإلكتروني">
            </div>
            <div class="input-group">
                <label class="input-label" for="loginPassword">كلمة المرور</label>
                <input type="password" class="input-field" id="loginPassword" placeholder="أدخل كلمة المرور">
            </div>
            <button class="login-btn" id="loginBtn">تسجيل الدخول</button>
        </div>
    `;

    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast("يرجى إدخال البريد الإلكتروني وكلمة المرور");
        return;
    }

    const role = (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) ? 'admin' : 'customer';
    currentUser = { email, role };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    currentView = 'dashboard';
    renderCurrentView();
}

function renderCurrentView() {
    if (!currentUser) {
        renderLogin();
        return;
    }

    if (currentUser.role === 'admin') {
        if (currentView === 'settings') {
            renderAdminSettings();
        } else {
            renderAdminPanel();
        }
    } else {
        renderCustomerView();
    }
}

function renderHeader() {
    const config = defaultConfig;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit', minute: '2-digit'
    });

    const isAdmin = currentUser.role === 'admin';

    return `
        <div class="main-header">
            <div class="header-top">
                <div class="header-right">
                    <svg class="orthodox-cross" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="headerCrossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:0.9" />
                            </linearGradient>
                        </defs>
                        <rect x="42" y="15" width="16" height="70" fill="url(#headerCrossGradient)" rx="3"/>
                        <rect x="20" y="37" width="60" height="16" fill="url(#headerCrossGradient)" rx="3"/>
                        <circle cx="50" cy="45" r="6" fill="#D4AF37"/>
                    </svg>
                    <div class="church-info">
                        <h1 class="church-name">${config.church_name}</h1>
                        <p class="church-tagline">${config.church_tagline}</p>
                    </div>
                </div>
                <div class="header-left">
                    <div class="header-info-item">
                        <span class="header-icon">📅</span>
                        <span>${dateStr}</span>
                    </div>
                    <div class="header-info-item">
                        <span class="header-icon">🕐</span>
                        <span>${timeStr}</span>
                    </div>
                    <div class="header-info-item">
                        <span class="header-icon">👤</span>
                        <span>${currentUser.email}</span>
                    </div>
                    <button class="logout-btn" id="logoutBtn">تسجيل الخروج</button>
                </div>
            </div>
            <div class="header-nav">
                <button class="nav-item ${currentView === 'dashboard' ? 'active' : ''}" id="navDashboard">
                    <span>📊</span>
                    <span>${isAdmin ? 'لوحة التحكم' : 'الحجز'}</span>
                </button>
                ${isAdmin ? `
                <button class="nav-item ${currentView === 'settings' ? 'active' : ''}" id="navSettings">
                    <span>⚙️</span>
                    <span>الإعدادات</span>
                </button>` : ''}
            </div>
        </div>
    `;
}

// ===== ADMIN SETTINGS =====
function renderAdminSettings() {
    const app = document.getElementById('app');

    app.innerHTML = `
        ${renderHeader()}
        <div class="main-content">
            <div class="settings-section">
                <div class="settings-title">⚙️ إعدادات النظام</div>
                <div class="settings-card">
  <div class="settings-card-title">
    <span>💰</span>
    <span>تحديث أسعار وعدد المقاعد</span>
  </div>
  <table class="price-table">
    <tr>
      <td style="font-weight:700;color:#5D3A7A;">منطقة VIP:</td>
      <td>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <span>Rows</span>
          <input type="number" class="price-input" id="vipRows" value="${SEATS_CONFIG.vip.rows}" min="1">
          <span>Seats/Row</span>
          <input type="number" class="price-input" id="vipSeatsPerRow" value="${SEATS_CONFIG.vip.seatsPerRow}" min="1">
          <span>Price</span>
          <input type="number" class="price-input" id="priceVip" value="${SEATS_CONFIG.vip.price}" min="0">
          <span style="font-weight:600;color:#6c757d;">EGP</span>
        </div>
      </td>
    </tr>
    <tr>
      <td style="font-weight:700;color:#5D3A7A;">منطقة Regular:</td>
      <td>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <span>Rows</span>
          <input type="number" class="price-input" id="regularRows" value="${SEATS_CONFIG.regular.rows}" min="1">
          <span>Seats/Row</span>
          <input type="number" class="price-input" id="regularSeatsPerRow" value="${SEATS_CONFIG.regular.seatsPerRow}" min="1">
          <span>Price</span>
          <input type="number" class="price-input" id="priceRegular" value="${SEATS_CONFIG.regular.price}" min="0">
          <span style="font-weight:600;color:#6c757d;">EGP</span>
        </div>
      </td>
    </tr>
    <tr>
      <td style="font-weight:700;color:#5D3A7A;">منطقة Back:</td>
      <td>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
          <span>Rows</span>
          <input type="number" class="price-input" id="backRows" value="${SEATS_CONFIG.back.rows}" min="1">
          <span>Seats/Row</span>
          <input type="number" class="price-input" id="backSeatsPerRow" value="${SEATS_CONFIG.back.seatsPerRow}" min="1">
          <span>Price</span>
          <input type="number" class="price-input" id="priceBack" value="${SEATS_CONFIG.back.price}" min="0">
          <span style="font-weight:600;color:#6c757d;">EGP</span>
        </div>
      </td>
    </tr>
  </table>
</div>


                <div class="settings-card">
                    <div class="settings-card-title">
                        <span>🔐</span>
                        <span>تغيير كلمة المرور (عرض فقط)</span>
                    </div>
                    <div class="input-group">
                        <label class="input-label" for="currentPassword">كلمة المرور الحالية</label>
                        <input type="password" class="input-field" id="currentPassword" placeholder="أدخل كلمة المرور الحالية">
                    </div>
                    <div class="input-group">
                        <label class="input-label" for="newPassword">كلمة المرور الجديدة</label>
                        <input type="password" class="input-field" id="newPassword" placeholder="أدخل كلمة المرور الجديدة">
                    </div>
                    <div class="input-group">
                        <label class="input-label" for="confirmPassword">تأكيد كلمة المرور</label>
                        <input type="password" class="input-field" id="confirmPassword" placeholder="أعد إدخال كلمة المرور الجديدة">
                    </div>
                </div>

                <button class="save-settings-btn" id="saveSettingsBtn">💾 حفظ التغييرات</button>
            </div>
        </div>
    `;

    document.getElementById('mainFooter').style.display = 'block';
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('navDashboard').addEventListener('click', () => {
        currentView = 'dashboard';
        renderCurrentView();
    });
    document.getElementById('navSettings').addEventListener('click', () => {
        currentView = 'settings';
        renderCurrentView();
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

function saveSettings() {
    const vipPrice   = parseInt(document.getElementById('priceVip').value);
    const regularPrice = parseInt(document.getElementById('priceRegular').value);
    const backPrice  = parseInt(document.getElementById('priceBack').value);

    const vipRows    = parseInt(document.getElementById('vipRows').value);
    const vipSeats   = parseInt(document.getElementById('vipSeatsPerRow').value);
    const regRows    = parseInt(document.getElementById('regularRows').value);
    const regSeats   = parseInt(document.getElementById('regularSeatsPerRow').value);
    const backRows   = parseInt(document.getElementById('backRows').value);
    const backSeats  = parseInt(document.getElementById('backSeatsPerRow').value);

    if (vipPrice>0 && regularPrice>0 && backPrice>0 &&
        vipRows>0 && vipSeats>0 && regRows>0 && regSeats>0 && backRows>0 && backSeats>0) {

        SEATS_CONFIG.vip.price       = vipPrice;
        SEATS_CONFIG.regular.price   = regularPrice;
        SEATS_CONFIG.back.price      = backPrice;

        SEATS_CONFIG.vip.rows        = vipRows;
        SEATS_CONFIG.vip.seatsPerRow = vipSeats;

        SEATS_CONFIG.regular.rows        = regRows;
        SEATS_CONFIG.regular.seatsPerRow = regSeats;

        SEATS_CONFIG.back.rows        = backRows;
        SEATS_CONFIG.back.seatsPerRow = backSeats;

        saveSeatConfig();
        ALL_SEATS = generateAllSeats();
        showToast("تم تحديث الأسعار وعدد المقاعد بنجاح!");
    }

    // جزء كلمة المرور يفضل يفضل زي ما هو (واجهة فقط)
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (currentPassword || newPassword || confirmPassword) {
        showToast("تغيير كلمة المرور غير متاح في نسخة GitHub (واجهة فقط)");
    }
}

// ===== ADMIN PANEL =====
function renderAdminPanel() {
    const app = document.getElementById('app');

    const stats = {
        total: ALL_SEATS.length,
        booked: allBookings.length,
        available: ALL_SEATS.length - allBookings.length,
        pending: allBookings.filter(b => b.status === 'pending').length,
        approved: allBookings.filter(b => b.status === 'approved').length,
        revenue: allBookings
            .filter(b => b.status === 'approved')
            .reduce((sum, b) => sum + b.price, 0)
    };

    app.innerHTML = `
        ${renderHeader()}
        <div class="main-content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">🪑</div>
                    <div class="stat-number">${stats.total}</div>
                    <div class="stat-label">إجمالي المقاعد</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-number">${stats.booked}</div>
                    <div class="stat-label">محجوز</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🟢</div>
                    <div class="stat-number">${stats.available}</div>
                    <div class="stat-label">متاح</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-number">${stats.pending}</div>
                    <div class="stat-label">قيد الانتظار</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✓</div>
                    <div class="stat-number">${stats.approved}</div>
                    <div class="stat-label">مؤكد</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-number">${stats.revenue}</div>
                    <div class="stat-label">الإيرادات (EGP)</div>
                </div>
            </div>
            <div class="admin-table-wrapper">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>المقعد</th>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>البريد</th>
                            <th>المرافقين</th>
                            <th>الدفع</th>
                            <th>السعر</th>
                            <th>كود التتبع</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="bookingsTableBody"></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('mainFooter').style.display = 'block';
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('navDashboard').addEventListener('click', () => {
        currentView = 'dashboard';
        renderCurrentView();
    });
    document.getElementById('navSettings')?.addEventListener('click', () => {
        currentView = 'settings';
        renderCurrentView();
    });
    renderBookingsTable();
}

function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');

    if (allBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #6c757d;">لا توجد حجوزات حتى الآن</td></tr>';
        return;
    }

    const sortedBookings = [...allBookings].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    tbody.innerHTML = sortedBookings.map(booking => {
        const statusClass = `status-${booking.status}`;
        const statusText = booking.status === 'pending' ? 'قيد الانتظار' :
            booking.status === 'approved' ? 'مؤكد' : 'مرفوض';

        const companionText = booking.companions === 0 ? 'بدون' :
            booking.companions === 1 ? 'مرافق واحد' :
            booking.companions === 2 ? 'مرافقان' :
                `${booking.companions} مرافقين`;

        return `
            <tr>
                <td style="font-weight: 700; color: #5D3A7A;">${booking.seat_number}</td>
                <td><div class="table-cell-wrap">${booking.customer_name}</div></td>
                <td><div class="table-cell-phone">${booking.phone}</div></td>
                <td><div class="table-cell-email" title="${booking.email}">${booking.email}</div></td>
                <td style="text-align: center;">${companionText}</td>
                <td>${booking.payment_method}</td>
                <td style="font-weight: 700; color: #D4AF37;">${booking.price} EGP</td>
                <td style="font-family: 'Courier New', monospace; font-weight: 700;">${booking.tracking_code}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn approve-btn" data-id="${booking.backendId}"
                            ${booking.status !== 'pending' ? 'disabled' : ''}>
                            موافقة
                        </button>
                        <button class="action-btn reject-btn" data-id="${booking.backendId}"
                            ${booking.status !== 'pending' ? 'disabled' : ''}>
                            رفض
                        </button>
                        <button class="action-btn whatsapp-btn" data-id="${booking.backendId}">
                            واتساب
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            updateBookingStatus(id, 'approved');
        });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            updateBookingStatus(id, 'rejected');
        });
    });

    document.querySelectorAll('.whatsapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            sendWhatsApp(id);
        });
    });
}

function updateBookingStatus(backendId, newStatus) {
    const booking = allBookings.find(b => b.backendId === backendId);
    if (!booking) return;

    booking.status = newStatus;
    saveBookingsToStorage();
    showToast(`تم ${newStatus === 'approved' ? 'الموافقة على' : 'رفض'} الحجز`);
    renderAdminPanel();
    if (newStatus === 'approved') {
        sendWhatsApp(backendId);
    }
}

function sendWhatsApp(backendId) {
    const booking = allBookings.find(b => b.backendId === backendId);
    if (!booking) return;

    let cleanPhone = booking.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '20' + cleanPhone.substring(1);
    }
    if (!cleanPhone.startsWith('20')) {
        cleanPhone = '20' + cleanPhone;
    }

    let message = '';
    if (booking.status === 'approved') {
        message =
            `مرحباً ${booking.customer_name}، 🙏\n\n` +
            `✅ تم تأكيد حجزك بنجاح!\n\n` +
            `📍 رقم المقعد: ${booking.seat_number}\n` +
            `🎫 كود الحجز: ${booking.tracking_code}\n` +
            `💰 المبلغ: ${booking.price} جنيه\n\n` +
            `الرجاء إرسال إثبات الدفع.\n\n` +
            `نتطلع لرؤيتك! 🙏`;
    } else if (booking.status === 'rejected') {
        message =
            `مرحباً ${booking.customer_name}، 🙏\n\n` +
            `❌ نأسف لإبلاغك بأن حجزك تم رفضه\n\n` +
            `📍 رقم المقعد: ${booking.seat_number}\n` +
            `🎫 كود الحجز: ${booking.tracking_code}\n\n` +
            `يمكنك التواصل معنا لمزيد من المعلومات.\n\n` +
            `شكراً لتفهمك 🙏`;
    } else {
        message =
            `مرحباً ${booking.customer_name}، 🙏\n\n` +
            `📝 تم استلام طلب حجزك!\n\n` +
            `📍 رقم المقعد: ${booking.seat_number}\n` +
            `🎫 كود الحجز: ${booking.tracking_code}\n` +
            `💰 المبلغ: ${booking.price} جنيه\n\n` +
            `⏳ سيتم مراجعة طلبك قريباً\n\n` +
            `شكراً لك! 🙏`;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

// ===== CUSTOMER VIEW / SEATS =====
function renderCustomerView() {
    const app = document.getElementById('app');
    app.innerHTML = `
        ${renderHeader()}
        <div class="main-content">
            ${renderTheaterSection()}
        </div>
    `;

    document.getElementById('mainFooter').style.display = 'block';
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('navDashboard')?.addEventListener('click', () => {
        currentView = 'dashboard';
        renderCurrentView();
    });
    attachSeatListeners();
    attachQuickActionListeners();
}

function renderTheaterSection() {
    const bookedSeats = new Set(allBookings.map(b => b.seat_number));

    return `
        <div class="theater-section">
            <div class="altar-container">
                <div class="altar-image">
                    <div class="altar-text">✝ كورال مارفرام السريانى ✝</div>
                </div>
            </div>

            <div class="legend-container">
                <div class="legend-item">
                    <div class="legend-box" style="background: #f0fdf4; border-color: #86efac;"></div>
                    <span class="legend-text">متاح</span>
                </div>
                <div class="legend-item">
                    <div class="legend-box" style="background: #fef2f2; border-color: #fca5a5;"></div>
                    <span class="legend-text">محجوز</span>
                </div>
                <div class="legend-item">
                    <div class="legend-box" style="background: #667eea;"></div>
                    <span class="legend-text">مختار</span>
                </div>
                <div class="legend-item">
                    <div class="legend-box" style="background: #fef3c7; border-color: #fbbf24;"></div>
                    <span class="legend-text">VIP</span>
                </div>
            </div>

            <div class="quick-actions">
                <button class="quick-btn" id="randomSelectBtn">
                    <span>🎲</span>
                    <span>اختر عشوائي</span>
                </button>
                <button class="quick-btn" id="clearSelectionBtn">
                    <span>🔄</span>
                    <span>مسح الاختيار</span>
                </button>
                <button class="quick-btn" id="showAvailableBtn">
                    <span>👁️</span>
                    <span>عرض المتاح فقط</span>
                </button>
            </div>

            ${renderZone('vip', 'VIP Front - المقاعد الأمامية', bookedSeats)}
            ${renderZone('regular', 'Regular Middle - المقاعد الوسطى', bookedSeats)}
            ${renderZone('back', 'Back - المقاعد الخلفية', bookedSeats)}
        </div>
    `;
}

function renderZone(zoneType, zoneTitle, bookedSeats) {
    const config = SEATS_CONFIG[zoneType];
    let html = `
        <div class="zone-section">
            <div class="zone-title zone-${zoneType}">${zoneTitle} - ${config.price} EGP</div>
            <div class="seats-grid">
    `;

    for (let row = 1; row <= config.rows; row++) {
        html += '<div class="seats-row">';
        for (let seat = 1; seat <= config.seatsPerRow; seat++) {
            const seatNumber = `${config.prefix}${row}-${seat}`;
            const isBooked = bookedSeats.has(seatNumber);
            const isSelected = selectedSeat === seatNumber;

            let seatClass = 'seat';
            if (zoneType === 'vip') seatClass += ' vip';
            if (isBooked) seatClass += ' booked';
            else if (isSelected) seatClass += ' selected';
            else seatClass += ' available';

            html += `<div class="seat ${seatClass}" data-seat="${seatNumber}" data-zone="${zoneType}" data-price="${config.price}">${seatNumber}</div>`;
        }
        html += '</div>';
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

function attachSeatListeners() {
    document.querySelectorAll('.seat.available, .seat.vip:not(.booked)').forEach(seat => {
        seat.addEventListener('click', () => {
            const seatNumber = seat.dataset.seat;
            const zone = seat.dataset.zone;
            const price = parseInt(seat.dataset.price);

            selectedSeat = seatNumber;
            bookingData = {
                seat_number: seatNumber,
                seat_zone: zone,
                base_price: price,
                price: price,
                companions: 0
            };

            renderCustomerView();
            openBookingModal();
        });
    });
}

function attachQuickActionListeners() {
    document.getElementById('randomSelectBtn')?.addEventListener('click', () => {
        const availableSeats = ALL_SEATS.filter(s =>
            !allBookings.some(b => b.seat_number === s.number)
        );
        if (availableSeats.length > 0) {
            const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
            selectedSeat = randomSeat.number;
            bookingData = {
                seat_number: randomSeat.number,
                seat_zone: randomSeat.zone,
                base_price: randomSeat.price,
                price: randomSeat.price,
                companions: 0
            };
            renderCustomerView();
            openBookingModal();
        }
    });

    document.getElementById('clearSelectionBtn')?.addEventListener('click', () => {
        selectedSeat = null;
        bookingData = {};
        renderCustomerView();
    });

    document.getElementById('showAvailableBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.seat.booked').forEach(seat => {
            seat.style.display = seat.style.display === 'none' ? 'flex' : 'none';
        });
    });
}

// ===== MODAL & BOOKING FLOW =====
function openBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.add('show');
    currentStep = 1;
    updateModalStep();
    populateStep1();
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.classList.remove('show');
    currentStep = 1;
    selectedPaymentMethod = null;
}

function updateModalStep() {
    for (let i = 1; i <= 4; i++) {
        const stepContent = document.getElementById(`step${i}`);
        const stepCircle = document.getElementById(`stepCircle${i}`);

        if (i === currentStep) {
            stepContent.classList.add('active');
            stepCircle.classList.add('active');
            stepCircle.classList.remove('completed');
        } else if (i < currentStep) {
            stepContent.classList.remove('active');
            stepCircle.classList.remove('active');
            stepCircle.classList.add('completed');
            stepCircle.textContent = '✓';
        } else {
            stepContent.classList.remove('active');
            stepCircle.classList.remove('active', 'completed');
            stepCircle.textContent = i;
        }
    }
}

function populateStep1() {
    document.getElementById('previewSeatNumber').textContent = bookingData.seat_number;
    document.getElementById('previewZone').textContent = getZoneNameAr(bookingData.seat_zone);
    document.getElementById('previewPrice').textContent = `${bookingData.base_price} EGP`;
}

function getZoneNameAr(zone) {
    const names = {
        vip: 'VIP - أمامي',
        regular: 'عادي - وسط',
        back: 'خلفي'
    };
    return names[zone] || zone;
}

function updateTotalPrice() {
    const companions = parseInt(document.getElementById('companions').value);
    const companionPrice = COMPANION_PRICES[companions];
    const totalPrice = bookingData.base_price + companionPrice;
    bookingData.price = totalPrice;
    bookingData.companions = companions;
    document.getElementById('totalPriceDisplay').textContent = `${totalPrice} EGP`;

    document.getElementById('phoneCashAmount').textContent = `${totalPrice} EGP`;
    document.getElementById('instaPayAmount').textContent = `${totalPrice} EGP`;
}

// Step 1
document.getElementById('cancelStep1')?.addEventListener('click', closeBookingModal);
document.getElementById('nextStep1')?.addEventListener('click', () => {
    currentStep = 2;
    updateModalStep();
    updateTotalPrice();
});

// Step 2
document.getElementById('companions')?.addEventListener('change', updateTotalPrice);

document.getElementById('backStep2')?.addEventListener('click', () => {
    currentStep = 1;
    updateModalStep();
});

['customerName', 'customerPhone', 'customerEmail'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        document.getElementById('nextStep2').disabled = !(name && phone && email);
    });
});

document.getElementById('nextStep2')?.addEventListener('click', () => {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!name || !phone || !email) {
        showToast('يرجى إدخال جميع البيانات المطلوبة');
        return;
    }

    bookingData.customer_name = name;
    bookingData.phone = phone;
    bookingData.email = email;
    bookingData.notes = notes;

    currentStep = 3;
    updateModalStep();
});

// Step 3: payment
document.querySelectorAll('.payment-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.payment-card').forEach(c =>
            c.classList.remove('selected')
        );
        card.classList.add('selected');
        selectedPaymentMethod = card.dataset.method;
        bookingData.payment_method = selectedPaymentMethod === 'phone_cash' ? 'Phone Cash' : 'InstaPay';
        document.getElementById('nextStep3').disabled = false;

        const qrContainer = document.getElementById('qrCodeContainer');
        qrContainer.style.display = 'block';
        const qrElement = document.getElementById('qrcode');
        qrElement.innerHTML = '';
        const paymentInfo =
            selectedPaymentMethod === 'phone_cash'
                ? `ادفع عبر Phone Cash على الرقم 01234567890 بمبلغ ${bookingData.price} EGP`
                : `ادفع عبر InstaPay على @church بمبلغ ${bookingData.price} EGP`;
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrElement, {
                text: paymentInfo,
                width: 200,
                height: 200
            });
        }
    });
});

document.getElementById('copyPaymentInfo')?.addEventListener('click', async () => {
    const paymentInfo =
        selectedPaymentMethod === 'phone_cash'
            ? `Phone Cash: 01234567890 - Amount: ${bookingData.price} EGP`
            : `InstaPay: @church - Amount: ${bookingData.price} EGP`;
    try {
        await navigator.clipboard.writeText(paymentInfo);
        showToast('تم نسخ معلومات الدفع');
    } catch {
        showToast('تعذر نسخ معلومات الدفع');
    }
});

document.getElementById('backStep3')?.addEventListener('click', () => {
    currentStep = 2;
    updateModalStep();
});

document.getElementById('nextStep3')?.addEventListener('click', () => {
    if (!selectedPaymentMethod) {
        showToast('يرجى اختيار طريقة الدفع');
        return;
    }

    currentStep = 4;
    updateModalStep();
    populateSummary();
});

// Step 4: summary & confirm
function populateSummary() {
    document.getElementById('summarySeats').textContent = bookingData.seat_number;
    document.getElementById('summaryZone').textContent = getZoneNameAr(bookingData.seat_zone);
    document.getElementById('summaryName').textContent = bookingData.customer_name;
    document.getElementById('summaryPhone').textContent = bookingData.phone;
    document.getElementById('summaryEmail').textContent = bookingData.email;
    document.getElementById('summaryCompanions').textContent =
        bookingData.companions === 0
            ? 'بدون مرافقين'
            : bookingData.companions === 1
                ? 'مرافق واحد'
                : bookingData.companions === 2
                    ? 'مرافقان'
                    : `${bookingData.companions} مرافقين`;
    document.getElementById('summaryPayment').textContent = bookingData.payment_method;
    document.getElementById('summaryTotal').textContent = `${bookingData.price} EGP`;

    const trackingCode = generateTrackingCode();
    bookingData.tracking_code = trackingCode;
    document.getElementById('previewTrackingCode').textContent = trackingCode;
}

function generateTrackingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

document.getElementById('copyPreviewTrackingBtn')?.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(bookingData.tracking_code || '');
        showToast('تم نسخ كود التتبع');
    } catch {
        showToast('تعذر نسخ كود التتبع');
    }
});

document.getElementById('backStep4')?.addEventListener('click', () => {
    currentStep = 3;
    updateModalStep();
});

document.getElementById('confirmBooking')?.addEventListener('click', async () => {
    document.getElementById('confirmBooking').disabled = true;

    const newBooking = {
        ...bookingData,
        status: 'pending',
        created_at: new Date().toISOString(),
        backendId: Date.now().toString()
    };

    allBookings.push(newBooking);
    saveBookingsToStorage();
    showToast('تم تسجيل الحجز بنجاح، محفوظ محلياً في هذا المتصفح فقط');
    closeBookingModal();
    showSuccessModal(bookingData.tracking_code, bookingData.price);
    selectedSeat = null;
    bookingData = {};
});

// ===== SUCCESS MODAL & UTIL =====
function showSuccessModal(trackingCode, amount) {
    document.getElementById('successTrackingCode').textContent = trackingCode;
    document.getElementById('successModal').classList.add('show');

    document.getElementById('copyTrackingBtn').onclick = async () => {
        try {
            await navigator.clipboard.writeText(trackingCode);
            showToast('تم نسخ كود التتبع');
        } catch {
            showToast('تعذر نسخ كود التتبع');
        }
    };

    document.getElementById('shareWhatsAppBtn').onclick = () => {
        const message =
            `كود تتبع الحجز الخاص بي: ${trackingCode}\n` +
            `المبلغ المدفوع/المطلوب: ${amount} EGP`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    document.getElementById('closeSuccessBtn').onclick = () => {
        document.getElementById('successModal').classList.remove('show');
        renderCustomerView();
    };
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    currentView = 'dashboard';
    renderLogin();
}

// ===== START APP =====
initApp();
