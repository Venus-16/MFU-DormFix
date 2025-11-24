// Navbar loading
fetch('/views/Head/Navbar2/Navbar2.html')
    .then(res => res.text())
    .then(data => {
        document.getElementById('navbar-placeholder').innerHTML = data;
        const logoutBtn = document.getElementById('logoutLink');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                const modal = new bootstrap.Modal(document.getElementById('logoutConfirmModal'));
                modal.show();
            });
        }

        const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', function () {
                fetch('/logout', { method: 'POST', credentials: 'include' })
                    .then(() => window.location.href = '/login')
                    .catch(() => window.location.href = '/login');
            });
        }
        setTimeout(() => {
            const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
            const sidebar = document.querySelector('.sidebar');
            if (mobileMenuToggle && sidebar) {
                mobileMenuToggle.addEventListener('click', function () {
                    sidebar.classList.toggle('open');
                    document.body.classList.toggle('sidebar-open');
                });
            }
        }, 100);

    })
    .catch(error => {
        console.error('Error loading navbar:', error);
    });
// Improved fetch with timeout
async function fetchDashboardData(dormId) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // เปลี่ยน endpoint เป็น /head/dashboard/data
        const res = await fetch(`/head/dashboard/data?dorm_id=${dormId}`, {
            signal: controller.signal,
            credentials: 'include'
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('API Response Data:', data);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
// Enhanced update function
async function updateDashboard(dormId) {
    const elements = {
        lastUpdate: document.getElementById('lastUpdate'),
        totalRequests: document.getElementById('totalRequests'),
        pendingRequests: document.getElementById('pendingRequests'),
        confirmedRequests: document.getElementById('confirmedRequests'),
        completedRequests: document.getElementById('completedRequests'),
        cancelRequests: document.getElementById('cancelRequests'), // <--- new
        technicianTypeFilter: document.getElementById('technicianTypeFilter'),
        technicianRatingList: document.getElementById('technicianRatingList'),
        recentRequestsTableBody: document.getElementById('recentRequestsTableBody'),
        repairTypeChart: document.getElementById('repairTypeChart'),
        roomRepairChart: document.getElementById('roomRepairChart')
    };

    // Set loading state
    Object.values(elements).forEach(el => {
        if (el) el.innerHTML = el.textContent = 'Loading...';
    });

    try {
        const data = await fetchDashboardData(dormId);

        // Update summary cards
        const dateObj = new Date(data.lastUpdated);
        const formattedTime = dateObj.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const formattedDate = dateObj.toLocaleDateString('en-GB'); // day/month/year

        elements.lastUpdate.textContent = `Last Update: ${formattedDate}`;

        elements.totalRequests.textContent = data.summary.total;
        elements.pendingRequests.textContent = data.summary.pending;
        elements.confirmedRequests.textContent = data.summary.confirmed;
        elements.completedRequests.textContent = data.summary.completed;
        elements.cancelRequests.textContent = data.summary.cancel || 0; // <- show cancel count

        // Initialize or update charts
        updateChart({
            canvas: elements.repairTypeChart,
            type: 'bar',
            labels: data.repairType.labels,
            data: data.repairType.counts,
            label: 'Number of Requests',
            backgroundColor: ['#f94144', '#f3722c', '#90be6d', '#577590', '#f9c74f'],
            indexAxis: 'y'
        });

        updateChart({
            canvas: elements.roomRepairChart,
            type: 'bar',
            labels: data.topRooms.labels,
            data: data.topRooms.counts,
            label: 'Number of Repairs',
            backgroundColor: data.topRooms.labels.map(() => 'rgba(54, 162, 235, 0.7)'),
            indexAxis: 'y'
        });

        // Update technician ratings
        updateTechnicianRatings(data.technicians, data.technicianTypes || [
            { id: '1', name: 'Electrical' },
            { id: '2', name: 'Plumbing' },
            { id: '3', name: 'Furniture' },
            { id: '4', name: 'Air Conditioning' },
            { id: '5', name: 'General' }
        ], elements);

        // Update recent requests table (show up to 10)
        updateRecentRequests(data.recentRequests, elements.recentRequestsTableBody, 10);

    } catch (error) {
        console.error('Dashboard update error:', error);
        showErrorState(elements, error);
    }
}


// Helper functions
function updateChart({ canvas, type, labels, data, label, backgroundColor, indexAxis }) {
    const ctx = canvas.getContext('2d');
    const chartId = canvas.id + 'Chart';

    // Destroy chart object ก่อนสร้างใหม่
    if (window[chartId]) {
        window[chartId].destroy();
    }

    window[chartId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: Array.isArray(backgroundColor) ?
                    backgroundColor :
                    new Array(labels.length).fill(backgroundColor),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: indexAxis || 'x',
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// function updateTechnicianRatings(technicians, technicianTypes, elements) {
//     const filterSelect = elements.technicianTypeFilter;
//     const ratingList = elements.technicianRatingList;

//     // เพิ่มตรวจสอบค่า null
//     if (!technicianTypes || !technicians) {
//         ratingList.innerHTML = '<li class="list-group-item text-danger">Data not available</li>';
//         return;
//     }

//     // สร้างตัวเลือกประเภทช่าง
//     filterSelect.innerHTML = `
//         <option value="all" selected>All Categories</option>
//         ${technicianTypes.map(type => `
//             <option value="${type.id}">${type.name}</option>
//         `).join('')}
//     `;

//     // แสดงผลช่าง
//     const renderTechnicians = (categoryId = 'all') => {
//         const filteredTechs = categoryId === 'all'
//             ? technicians
//             : technicians.filter(t => t.categoryId == categoryId);

//         if (filteredTechs.length === 0) {
//             ratingList.innerHTML = '<li class="list-group-item text-muted">No technicians found</li>';
//             return;
//         }

//         ratingList.innerHTML = filteredTechs.map(tech => `
//             <li class="list-group-item">
//                 <div class="d-flex justify-content-between">
//                     <div>
//                         <h6 class="mb-1">${tech.name}</h6>
//                         <small class="text-muted">${tech.position}</small>
//                     </div>
//                     <div class="text-end">
//                         <span class="badge bg-primary">${tech.category || tech.categoryName}</span>
//                         <div class="mt-1">
//                             <span class="fw-bold">${tech.rating || '0'}</span>
//                             <small class="text-muted">/5 (${tech.reviews || '0'} reviews)</small>
//                         </div>
//                     </div>
//                 </div>
//             </li>
//         `).join('');
//     };

//     renderTechnicians();
//     filterSelect.addEventListener('change', (e) => renderTechnicians(e.target.value));
// }
function updateTechnicianRatings(technicians, technicianTypes, elements) {
    const filterSelect = elements.technicianTypeFilter;
    const ratingList = elements.technicianRatingList;

    if (!technicianTypes || !technicians) {
        ratingList.innerHTML = '<li class="list-group-item text-danger">Data not available</li>';
        return;
    }

    // สร้างตัวเลือกประเภทช่าง
    filterSelect.innerHTML = `
        <option value="all" selected>All Categories</option>
        ${technicianTypes.map(type => `
            <option value="${type.id}">${type.name}</option>
        `).join('')}
    `;

    // ฟังก์ชันนี้จะแสดงเฉพาะช่างที่มีรีวิว > 0 เท่านั้น
    const renderTechnicians = (categoryId = 'all') => {
        const filteredTechs = categoryId === 'all'
            ? technicians.filter(t => Number(t.reviews) > 0)
            : technicians.filter(t => t.categoryId == categoryId && Number(t.reviews) > 0);

        if (filteredTechs.length === 0) {
            ratingList.innerHTML = '<li class="list-group-item text-muted">No technicians found</li>';
            return;
        }

        ratingList.innerHTML = filteredTechs.map(tech => `
            <li class="list-group-item">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="mb-1">${tech.name}</h6>
                        <small class="text-muted">${tech.position}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-primary">${tech.category || tech.categoryName}</span>
                        <div class="mt-1">
                            <span class="fw-bold">${tech.rating || '0'}</span>
                            <small class="text-muted">/5 (${tech.reviews || '0'} reviews)</small>
                        </div>
                    </div>
                </div>
            </li>
        `).join('');
    };

    renderTechnicians();
    filterSelect.addEventListener('change', (e) => renderTechnicians(e.target.value));
}
function renderTechnicianList(techs, listEl) {
    if (!techs || techs.length === 0) {
        listEl.innerHTML = '<li class="list-group-item text-muted">No technicians found</li>';
        return;
    }

    listEl.innerHTML = techs.slice(0, 5).map(tech => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>${tech.name}</strong>
                <div class="text-muted small">${tech.type}</div>
            </div>
            <span class="badge bg-primary rounded-pill">
                ${tech.rating} ⭐
            </span>
        </li>
    `).join('');
}

function updateRecentRequests(requests, tableBody, maxRows = 10) {
    if (!requests || requests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No recent repair requests found
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = requests.slice(0, maxRows).map(request => `
        <tr>
            <td>${request.request_date.split(',')[0]}</td>
            <td>
                ${request.reporter_name}
                <br><small class="text-muted">${request.reporter_email}</small>
            </td>
            <td>${request.article}</td>
            <td>${request.description}</td>
            <td>${request.room_number}</td>
            <td>
                ${request.technician_name || '-'}
                ${request.technician_phone ? `<br><small>${request.technician_phone}</small>` : ''}
            </td>
            <td>
                <span class="badge bg-${getStatusColor(request.status)}">
                    ${request.status}
                </span>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    switch ((status || '').toLowerCase()) {
        case 'completed': return 'success';
        case 'confirmed': return 'info';
        case 'pending': return 'warning';
        case 'cancel': return 'danger';
        default: return 'light';
    }
}

function showErrorState(elements, error) {
    elements.lastUpdate.textContent = 'Error loading data';
    elements.technicianRatingList.innerHTML = `
        <li class="list-group-item text-danger">
            Failed to load technician ratings
            ${error.message ? `<br><small>${error.message}</small>` : ''}
        </li>
    `;
    elements.recentRequestsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-danger">
                Failed to load recent requests
                ${error.message ? `<br><small>${error.message}</small>` : ''}
            </td>
        </tr>
    `;
}
async function fetchDormitoryList() {
    const res = await fetch('/head/dormitory/list', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load dormitory list');
    return await res.json();
}

async function renderDormitoryDropdown() {
    const dormSelect = document.getElementById('dormitory');
    dormSelect.innerHTML = `<option>Loading...</option>`;
    try {
        const dorms = await fetchDormitoryList();
        dormSelect.innerHTML = dorms.map(
            dorm => `<option value="${dorm.dorm_id}">${dorm.dorm_name}</option>`
        ).join('');
        // เรียกอัปเดต dashboard ทันทีหลังโหลดหอ
        if (dorms.length > 0) updateDashboard(dorms[0].dorm_id);
    } catch (e) {
        dormSelect.innerHTML = `<option>Error loading dormitory</option>`;
    }
}

// เรียกเมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', async () => {
    await renderDormitoryDropdown();
    const dormSelect = document.getElementById('dormitory');
    dormSelect.addEventListener('change', () => {
        updateDashboard(dormSelect.value);
    });
    setInterval(() => updateDashboard(dormSelect.value), 30000);
});
// // Initialize dashboard
// document.addEventListener('DOMContentLoaded', () => {
//     const dormSelect = document.getElementById('dormitory');

//     // Initial load
//     updateDashboard(dormSelect.value);

//     // Handle dormitory change
//     dormSelect.addEventListener('change', () => {
//         updateDashboard(dormSelect.value);
//     });

//     // Refresh every 30 seconds
//     setInterval(() => updateDashboard(dormSelect.value), 30000);
// });
document.addEventListener('DOMContentLoaded', function () {
    fetch('/user/me', { credentials: "include" })
        .then(res => {
            if (!res.ok) throw new Error('Not logged in');
            return res.json();
        })
        .then(user => {
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userRole').textContent = user.role;
        })
        .catch(() => {
            document.getElementById('userName').textContent = 'Please log in to your account.';
            document.getElementById('userRole').textContent = '';
        });
});
document.addEventListener('DOMContentLoaded', function () {

    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    mobileMenuToggle?.addEventListener('click', function () {
        sidebar.classList.toggle('open');
    });
});