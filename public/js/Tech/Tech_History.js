window.addEventListener("DOMContentLoaded", () => {
    // Load navbar and sidebar
    fetch('/views/Tech/Tech_Navbar.html')
        .then(res => res.text())
        .then(data => {
            document.getElementById('navbar-placeholder').innerHTML = data;
            const navbarPlaceholder = document.getElementById('navbar-placeholder');
            navbarPlaceholder.innerHTML = data;
            const script = document.createElement('script');
            script.src = '/public/js/Tech/Tech.navbar-notification.js';
            document.body.appendChild(script);
            // หลัง navbar render แล้ว fetch /user/me
            fetch('/user/me', { credentials: "include" })
                .then(res => res.json())
                .then(user => {
                    const nameDiv = navbarPlaceholder.querySelector('#userName');
                    const roleDiv = navbarPlaceholder.querySelector('#userRole');
                    if (nameDiv) nameDiv.textContent = user.name;
                    if (roleDiv) roleDiv.textContent = user.role;
                })
                .catch(() => {
                    const nameDiv = navbarPlaceholder.querySelector('#userName');
                    const roleDiv = navbarPlaceholder.querySelector('#userRole');
                    if (nameDiv) nameDiv.textContent = 'Please log in to your account.';
                    if (roleDiv) roleDiv.textContent = '';
                });

            // Logout logic
            const logoutBtn = document.getElementById('logout-link');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    const modal = new bootstrap.Modal(document.getElementById('logoutConfirmModal'));
                    modal.show();
                });
            }
            // ปุ่มยืนยันในโมเดล ถึงจะ logout จริง
            const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
            if (confirmLogoutBtn) {
                confirmLogoutBtn.addEventListener('click', function () {
                    fetch('/logout', { method: 'GET', credentials: 'include' })
                        .then(() => window.location.href = '/login')
                        .catch(() => window.location.href = '/login');
                });
            }

            const mobileMenuToggle = navbarPlaceholder.querySelector('.mobile-menu-toggle');
            const sidebar = navbarPlaceholder.querySelector('.sidebar');
            if (mobileMenuToggle && sidebar) {
                mobileMenuToggle.addEventListener('click', function () {
                    sidebar.classList.toggle('open');
                    document.body.classList.toggle('sidebar-open');
                });
            }
            navbarPlaceholder.querySelectorAll('.dropdown-toggle').forEach(dropdownToggleEl => {
                new bootstrap.Dropdown(dropdownToggleEl);
            });
            // Highlight current page
            setTimeout(() => {
                const links = document.querySelectorAll('.sidebar .menu li a');
                const currentPath = window.location.pathname;
                links.forEach(link => {
                    const tempAnchor = document.createElement('a');
                    tempAnchor.href = link.getAttribute('href');
                    if (tempAnchor.pathname === currentPath) {
                        link.parentElement.classList.add('active');
                    }
                });
            }, 100);
        });

    // Load dormitory list from backend for dormitoryFilter
    fetch('/dormitories')
        .then(res => res.json())
        .then(data => {
            const dormSelect = document.getElementById('dormitoryFilter');
            dormSelect.innerHTML = '<option value="">All Dormitories</option>';
            data.forEach(dorm => {
                dormSelect.innerHTML += `<option value="${dorm.dorm_name}">${dorm.dorm_name}</option>`;
            });
        })
        .catch(() => {
            // fallback
            const dormSelect = document.getElementById('dormitoryFilter');
            dormSelect.innerHTML = `
                <option value="">All Dormitories</option>
                <option value="Lamduan 7">Lamduan 7</option>
                <option value="Lamduan 6">Lamduan 6</option>
                <option value="Lamduan 5">Lamduan 5</option>
                <option value="Lamduan 4">Lamduan 4</option>
                <option value="Lamduan 3">Lamduan 3</option>
                <option value="Lamduan 2">Lamduan 2</option>
                <option value="Lamduan 1">Lamduan 1</option>
            `;
        });

    // Initial load all reports
    loadAllReports();

    // Register events for new filter UI
    document.getElementById('dateSearchInput').addEventListener('change', filterAndRender);
    document.getElementById('dormitoryFilter').addEventListener('change', filterAndRender);
    document.getElementById('nameSearchInput').addEventListener('input', filterAndRender);
    document.getElementById('issueSearchInput').addEventListener('input', filterAndRender);
});

// Global for all loaded reports
let _allReports = [];

function loadAllReports() {
    fetch('/tech/history-data')
        .then(res => {
            if (!res.ok) throw new Error('No history found.');
            return res.json();
        })
        .then(data => {
            _allReports = data;
            filterAndRender();
        })
        .catch(err => {
            document.getElementById("card-container").innerHTML =
                `<div class="alert alert-info">${err.message}</div>`;
        });
}

function filterAndRender() {
    let filtered = [..._allReports];

    // Which filter is visible
    const dateVisible = !document.getElementById('search-date').classList.contains('d-none');
    const nameVisible = !document.getElementById('search-name').classList.contains('d-none');
    const issueVisible = !document.getElementById('search-issue').classList.contains('d-none');

    if (dateVisible) {
        const date = document.getElementById('dateSearchInput').value;
        if (date) {
            filtered = filtered.filter(r => {
                // assuming r.request_date is ISO string
                if (!r.request_date) return false;
                const reqDate = new Date(r.request_date);
                const filterDate = new Date(date);
                return reqDate.getFullYear() === filterDate.getFullYear() &&
                    reqDate.getMonth() === filterDate.getMonth() &&
                    reqDate.getDate() === filterDate.getDate();
            });
        }
        const dormitory = document.getElementById('dormitoryFilter').value;
        if (dormitory) {
            filtered = filtered.filter(r => (r.dorm || '') === dormitory);
        }
    } else if (nameVisible) {
        const name = document.getElementById('nameSearchInput').value.trim().toLowerCase();
        if (name) {
            filtered = filtered.filter(r => (r.student_name || '').toLowerCase().includes(name));
        }
    } else if (issueVisible) {
        const issue = document.getElementById('issueSearchInput').value.trim().toLowerCase();
        if (issue) {
            filtered = filtered.filter(r =>
                ((r.category || '') + ' ' + (r.article || '') + ' ' + (r.description || '') + ' ' + (r.work_description || '')).toLowerCase().includes(issue)
            );
        }
    }
    renderHistoryCards(filtered);
}

function filterByDate() {
    filterAndRender();
}
function filterByDormitory() {
    filterAndRender();
}
function filterByName() {
    filterAndRender();
}
function filterByIssue() {
    filterAndRender();
}

function generateStars(score) {
    const rating = parseInt(score);
    if (isNaN(rating)) return "No feedback";
    let stars = "";
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating
            ? '<i class="fa-solid fa-star" style="color: #ffc107;"></i>'
            : '<i class="fa-regular fa-star" style="color: #ccc;"></i>';
    }
    return stars;
}

function getRepairOnTimeStatus(report) {
    if (!report.repair_date || !report.complete_date) return "";
    const repair = new Date(report.repair_date);
    const complete = new Date(report.complete_date);
    if (isNaN(repair) || isNaN(complete)) return "";

    // ตัดเวลาเหลือแค่ วัน/เดือน/ปี
    const repairDate = new Date(repair.getFullYear(), repair.getMonth(), repair.getDate());
    const completeDate = new Date(complete.getFullYear(), complete.getMonth(), complete.getDate());

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((completeDate - repairDate) / msPerDay);

    if (diffDays < 0) return "Completed ahead of schedule";
    if (diffDays === 0) return "On time";
    return `Late (${diffDays} day${diffDays > 1 ? "s" : ""})`;
}

function renderHistoryCards(reports) {
    const container = document.getElementById("card-container");
    container.innerHTML = "";

    if (!reports || reports.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No completed or cancelled repair history found.</div>';
        return;
    }

    reports.forEach(report => {
        const isCanceled = report.status && report.status.toLowerCase() === "cancel";
        const isCompleted = report.status && report.status.toLowerCase() === "completed";
        if (!isCanceled && !isCompleted) return;

        let imageSrc = report.image || '';
        if (imageSrc && imageSrc.startsWith('uploads/')) {
            imageSrc = '/public/' + imageSrc;
        }
        if (!imageSrc) {
            imageSrc = '/public/img/no-image.png';
        }

        const feedbackScore = report.feedback_score || report.rating;
        const feedbackComment = report.feedback_comment || report.comment;
        const technicianName = report.technician_name || '-';
        const technicianPhone = report.technician_phone || report.phone_number || '-';
        const assignedBy = report.assigned_by || "-";

        // ====== ADD: Repair Date on-time status display ======
        let repairStatusMsg = "";
        if (isCompleted && report.repair_date && report.request_date) {
            repairStatusMsg = getRepairOnTimeStatus(report);
        }
        // =====================================

        const card = document.createElement("div");
        card.className = "card shadow-sm mx-auto";
        card.style.background = "#e9e9e9";
        card.style.borderRadius = "15px";
        card.style.padding = "20px";
        card.style.width = "1100px";

        const statusColor = isCanceled ? "#dc3545" : "#30BD71";

        // เลือกสีข้อความ
        let repairStatusColor = "#666";
        if (repairStatusMsg === "On time") repairStatusColor = "#30BD71";
        else if (repairStatusMsg.startsWith("Late")) repairStatusColor = "#dc3545";
        else if (repairStatusMsg === "Invalid date") repairStatusColor = "#666";

        card.innerHTML = `
<div class="row align-items-start" style="font-size: 0.85rem; line-height: 1.8;">
    <div class="col-4 d-flex justify-content-center align-items-center">
        <img src="${imageSrc}" alt="Image"
             style="width: 100%; border-radius: 12px; max-height: 250px; object-fit: cover;">
    </div>
    <div class="col-3 d-flex flex-column justify-content-start">
        <div style="height: 1.8rem;"></div> 
        <p class="mb-1"><strong>Name:</strong> ${report.student_name || '-'}</p> 
        <p class="mb-1"><strong>Dormitory:</strong> ${report.dorm || '-'}</p>   
        <p class="mb-1"><strong>Room:</strong> ${report.room_number || '-'}</p> 
        <p class="mb-1"><strong>Request Date:</strong> ${formatDate(report.request_date)}</p> <!-- บรรทัดที่ 5 -->
        ${isCompleted ? `<p class="mb-1"><strong>Repair Date:</strong> ${formatDate(report.repair_date) || "-"}</p>` : ""} 
        ${isCompleted ? `<p class="mb-1"><strong>Completed Date:</strong> ${formatDate(report.complete_date) || "-"}</p>` : ""} 
        <p class="mb-1"><strong>Assigned By:</strong> ${assignedBy}</p>
    </div>
    <div class="col-5 d-flex flex-column justify-content-start">
        <div style="display: flex; justify-content: flex-end;">
            ${isCompleted && repairStatusMsg
                ? `<span style="font-size: 1rem; font-weight: 600; color: ${repairStatusColor};">
                    ${repairStatusMsg}
                   </span>` : ''
            }
        </div>
        ${isCompleted && technicianName !== '-' ? `<p class="mb-1"><strong>Technician:</strong> ${technicianName}</p>` : ""}
        ${isCompleted && technicianPhone !== '-' ? `<p class="mb-1"><strong>Phone:</strong> ${technicianPhone}</p>` : ""}
        <p class="mb-1"><strong>Repair Type:</strong> ${report.category || '-'}</p>
        <p class="mb-1"><strong>Item:</strong> ${report.article || '-'}</p>
        <p class="mb-1"><strong>Damage Description:</strong> ${report.description || '-'}</p>
        ${isCompleted && report.work_description ? `<p class="mb-1"><strong>Work Description:</strong> ${report.work_description}</p>` : ""}
        ${isCompleted && feedbackScore ? `<div class="mb-1"><strong>Feedback:</strong> ${generateStars(feedbackScore)}${feedbackComment ? `<br><small>${feedbackComment}</small>` : ""}</div>` : ""}
        <div class="mt-3">
            <span style="display: inline-block; background-color: ${statusColor}; color: white; font-weight: 600; border-radius: 20px; padding: 6px 20px; width: 150px; text-align: center;">
                ${report.status}
            </span>
        </div>
    </div>
</div>
`;

        container.appendChild(card);
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 => 12
    return `${day}/${month}/${year}, ${hour}:${minute} ${ampm}`;
}