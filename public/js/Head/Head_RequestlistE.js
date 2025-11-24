let requests = [];
let reviews = {};
let filteredRequests = [];
let currentPage = 1;
const itemsPerPage = 9;
let currentPhotoIndex = 0;
let currentPhotos = [];

// Navbar loading (unchanged)
fetch('/views/Head/Navbar2/Navbar2.html')
    .then(res => res.text())
    .then(data => {
        document.getElementById('navbar-placeholder').innerHTML = data;
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        navbarPlaceholder.innerHTML = data;
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
        const currentPath = window.location.pathname;
        const sidebarLinks = navbarPlaceholder.querySelectorAll('.sidebar .menu li a');

        sidebarLinks.forEach(link => {
            const linkPath = link.pathname.replace(/^\/|\/$/g, '');
            const currentPathNormalized = currentPath.replace(/^\/|\/$/g, '');
            if (currentPathNormalized.includes(linkPath) && linkPath !== '') {
                link.parentElement.classList.add('active');
            } else if (currentPathNormalized === '' && linkPath === 'Head_Dashboard.html') {
                link.parentElement.classList.add('active');
            }
        });
    })
    .catch(error => {
        console.error('Error loading navbar:', error);
    });
fetch('/user/me', { credentials: 'include' })
    .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
    })
    .then(user => {
        const nameDiv = document.getElementById('userName');
        const roleDiv = document.getElementById('userRole');
        if (nameDiv && roleDiv) {
            nameDiv.textContent = user.name;
            roleDiv.textContent = user.role;
        }
    })
    .catch(() => {
        const nameDiv = document.getElementById('userName');
        const roleDiv = document.getElementById('userRole');
        if (nameDiv && roleDiv) {
            nameDiv.textContent = 'Please log in to your account.';
            roleDiv.textContent = '';
        }
    });
// Fetch repair request data from API
async function fetchRequests() {
    try {
        const dormId = 6; // default
        const res = await fetch(`/head/requestlist?dorm_id=${dormId}`);
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        // กรองเฉพาะประเภททั่วไป (category_id == 5)
        requests = (data.requests || []).filter(r => r.category_id == 1 || r.category_name === "Electrical");
        reviews = data.reviews || {};
        filteredRequests = [...requests];
        generateTable(filteredRequests);
    } catch (e) {
        console.error(e);
        document.getElementById('requestTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">Unable to load data</td></tr>`;
    }
}
function getImageSrc(photo) {
    if (!photo) return '';
    // Remove leading /public/ if exists
    photo = photo.replace(/^\/?public\//, '');
    // Remove leading /uploads/ if exists (for duplicate prefix)
    photo = photo.replace(/^\/?uploads\//, '');
    // If already a full URL (http/https), use as is
    if (photo.startsWith('http')) return photo;
    // If only the filename, prepend /uploads/
    return '/uploads/' + photo;
}
// Helper: Sort by date (newest first)
function sortRequestsByDate(requestsArray) {
    return requestsArray.sort((a, b) => {
        const dateA = new Date(formatDateForSort(a.request_date || a.date));
        const dateB = new Date(formatDateForSort(b.request_date || b.date));
        return dateB - dateA;
    });
}
function formatDateForSort(dateStr) {
    // Accepts "DD/MM/YYYY" or ISO
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr;
}

function generateTable(requestsToShow = requests) {
    const tbody = document.getElementById("requestTableBody");
    tbody.innerHTML = "";

    const sortedRequests = sortRequestsByDate(requestsToShow);
    const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);
    updatePagination(totalPages);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

    if (paginatedRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">No requests found</td></tr>`;
        return;
    }

    paginatedRequests.forEach((req, i) => {
        const key = `${req.request_date || req.date}_${req.reporter_name || req.reporter}`;
        const canReview = (req.status === "Completed" || req.status === "completed") && reviews[key];
        const starIcon = `<i class="bi bi-star-fill text-warning fs-3 ${canReview ? 'cursor-pointer' : 'opacity-50'}" 
            ${canReview ? `style="cursor: pointer;" onclick="openReviewModal('${req.request_date || req.date}', '${req.reporter_name || req.reporter}')"` : `style="cursor: not-allowed;"`} ></i>`;

        let statusClass = "bg-secondary";
        if (req.status === "Completed" || req.status === "completed") statusClass = "bg-success";
        else if (req.status === "Confirmed" || req.status === "confirmed") statusClass = "bg-info text-dark";
        else if (req.status === "Pending" || req.status === "pending") statusClass = "bg-warning";
        else if (req.status === "Cancelled" || req.status === "Cancel" || req.status === "cancelled") statusClass = "bg-danger";

        const isEditable = !(["Completed", "Confirmed", "Cancelled", "completed", "confirmed", "cancelled", "Cancel"].includes(req.status));

        const editIcon = isEditable
            ? `<a href="/head/assign?request_id=${req.request_id}" title="Edit">
                    <i class="bi bi-pencil-square text-purple me-2 fs-3"></i>
               </a>`
            : `<i class="bi bi-pencil-square text-muted me-2 fs-3" style="cursor: not-allowed;" title="Not editable"></i>`;

        const row = `
            <tr>
                <td>${req.request_date || req.date || '-'}</td>
                <td>${req.reporter_name || req.reporter || '-'}</td>
                <td>${req.article || '-'}</td>
                <td>${req.description || req.issue || '-'}</td>
                <td>${req.work_description || req.solution || '-'}</td>
                <td>${req.technician_name || req.technician || '-'}<br><small>${req.technician_phone || req.contact || ''}</small></td>
                <td>${formatDateDisplay(req.repair_date || req.repairDate)}<br>${formatTimeDisplay(req.repair_date || req.repairDate)}</td>
                <td><span class="badge ${statusClass}">${req.status}</span></td>
                <td>
                    ${editIcon}
                    <i class="bi bi-list-ul text-primary me-2 fs-3" style="cursor: pointer;" onclick="openDetailModal(${requests.indexOf(req)})" title="View Details"></i>
                    ${starIcon}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    // Previous button
    const prevItem = document.createElement('li');
    prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevItem.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>`;
    pagination.appendChild(prevItem);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageItem.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
        pagination.appendChild(pageItem);
    }

    // Next button
    const nextItem = document.createElement('li');
    nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextItem.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>`;
    pagination.appendChild(nextItem);
}

function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredRequests.length / itemsPerPage)) return;
    currentPage = page;
    generateTable(filteredRequests);
}

function filterByDate() {
    const dateInput = document.getElementById('dateSearchInput').value;
    currentPage = 1;
    if (!dateInput) {
        filteredRequests = [...requests];
        generateTable(filteredRequests);
        return;
    }
    const parts = dateInput.split('-');
    const searchDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    filteredRequests = requests.filter(req => (req.request_date || req.date) === searchDate);
    generateTable(filteredRequests);
}

function filterByName() {
    const searchTerm = document.getElementById('nameSearchInput').value.toLowerCase();
    currentPage = 1;
    if (!searchTerm) {
        filteredRequests = [...requests];
        generateTable(filteredRequests);
        return;
    }
    filteredRequests = requests.filter(req =>
        (req.reporter_name || req.reporter || '').toLowerCase().includes(searchTerm)
    );
    generateTable(filteredRequests);
}

function filterByIssue() {
    const searchTerm = document.getElementById('issueSearchInput').value.toLowerCase();
    currentPage = 1;
    if (!searchTerm) {
        filteredRequests = [...requests];
        generateTable(filteredRequests);
        return;
    }
    filteredRequests = requests.filter(req =>
        (req.description || req.issue || '').toLowerCase().includes(searchTerm)
    );
    generateTable(filteredRequests);
}

function filterByStatus() {
    const status = document.getElementById('statusFilter').value;
    currentPage = 1;
    if (!status) {
        filteredRequests = [...requests];
        generateTable(filteredRequests);
        return;
    }
    let statusMap = {
        'completed': ['completed', 'complete'],
        'confirmed': ['confirmed'],
        'pending': ['pending'],
        'cancel': ['cancel', 'cancelled'],
        'cancelled': ['cancel', 'cancelled'],
    };
    let statusKey = status.toLowerCase();
    let statusList = statusMap[statusKey] || [statusKey];
    filteredRequests = requests.filter(req => statusList.includes((req.status || '').toLowerCase()));
    generateTable(filteredRequests);
}
function showAllRequests() {
    document.getElementById('dateSearchInput').value = '';
    document.getElementById('nameSearchInput').value = '';
    document.getElementById('issueSearchInput').value = '';
    document.getElementById('statusFilter').value = '';
    currentPage = 1;
    filteredRequests = [...requests];
    generateTable(filteredRequests);
}

// Review modal
function openReviewModal(date, name) {
    const key = `${date}_${name}`;
    const review = reviews[key];
    if (!review || review.rating === 0) return;

    const starsContainer = document.getElementById("reviewStars");
    const commentContainer = document.getElementById("reviewComment");
    starsContainer.innerHTML = "";
    for (let i = 0; i < review.rating; i++) {
        starsContainer.innerHTML += `<i class="bi bi-star-fill text-warning"></i>`;
    }
    commentContainer.textContent = review.comment;
    const modal = new bootstrap.Modal(document.getElementById("reviewModal"));
    modal.show();
}
// async function loadTechniciansToDetailModal(selectedName = "") {
//     const res = await fetch('/head/technician/list');
//     const data = await res.json();
//     const select = document.getElementById('detailTechnicianInput'); // เปลี่ยนจาก 'technician' เป็น 'detailTechnicianInput'
//     select.innerHTML = '<option value="">Select Technician</option>';
//     data.forEach(tech => {
//         const sel = tech.name === selectedName ? 'selected' : '';
//         select.innerHTML += `<option value="${tech.name}" data-phone="${tech.phone_number}" ${sel}>${tech.name}</option>`;
//     });
//     select.onchange = function () {
//         const opt = select.selectedOptions[0];
//         document.getElementById('detailContactInput').value = opt.dataset.phone || "";
//     };
//     // ตั้งค่าเบอร์โทรทันทีถ้ามีชื่อเดิม
//     if (selectedName) {
//         const selected = Array.from(select.options).find(opt => opt.value === selectedName);
//         if (selected) {
//             document.getElementById('detailContactInput').value = selected.dataset.phone || "";
//         }
//     }
// }
async function loadTechniciansToDetailModal(selectedName = "") {
    const res = await fetch('/head/technician/list');
    let data = await res.json();
    // กรองเฉพาะช่างประเภท General เท่านั้น (category_id = 5)
    data = data.filter(tech => tech.category_id == 1 || tech.category_name === "Electrical");

    const select = document.getElementById('detailTechnicianInput');
    select.innerHTML = '<option value="">Select Technician</option>';
    data.forEach(tech => {
        const sel = tech.name === selectedName ? 'selected' : '';
        select.innerHTML += `<option value="${tech.name}" data-phone="${tech.phone_number}" ${sel}>${tech.name}</option>`;
    });
    select.onchange = function () {
        const opt = select.selectedOptions[0];
        document.getElementById('detailContactInput').value = opt.dataset.phone || "";
    };
    // ตั้งค่าเบอร์โทรทันทีถ้ามีชื่อเดิม
    if (selectedName) {
        const selected = Array.from(select.options).find(opt => opt.value === selectedName);
        if (selected) {
            document.getElementById('detailContactInput').value = selected.dataset.phone || "";
        }
    }
}
async function enableEditing() {
    document.getElementById("detailTechnicianDisplay").classList.add("d-none");
    document.getElementById("detailTechnicianInput").classList.remove("d-none");
    document.getElementById("detailContactDisplay").classList.add("d-none");
    document.getElementById("detailContactInput").classList.remove("d-none");
    document.getElementById("detailRepairDateDisplay").classList.add("d-none");
    document.getElementById("detailRepairDateInput").classList.remove("d-none");
    document.getElementById("detailTimeDisplay").classList.add("d-none");
    document.getElementById("detailTimeInput").classList.remove("d-none");

    // ตั้งค่า min ของวันที่ให้เป็นวันปัจจุบัน
    const repairDateInput = document.getElementById('detailRepairDateInput');
    if (repairDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;
        repairDateInput.setAttribute('min', minDate);
    }

    const timeInput = document.getElementById("detailTimeInput");
    timeInput.classList.remove("d-none");
    timeInput.value = formatTimeForInput(document.getElementById("detailTimeDisplay").textContent.trim());

    document.getElementById("editButton").classList.add("d-none");
    document.getElementById("editSaveButton").classList.remove("d-none");

    await loadTechniciansToDetailModal(document.getElementById("detailTechnicianDisplay").textContent.trim());
}

// Detail modal
function openDetailModal(index) {
    const req = requests[index];
    const isInProgress = req.status === "Confirmed" || req.status === "confirmed";
    document.getElementById("detailTimeDisplay").textContent = formatTimeDisplay(req.repair_date || req.repairDate);
    document.getElementById("detailTimeInput").value = formatTimeForInput(req.repair_date || req.repairDate);
    document.getElementById("detailDate").textContent = req.request_date || req.date || '-';
    document.getElementById("detailReporter").textContent = req.reporter_name || req.reporter || '-';
    document.getElementById("detailDorm").textContent = req.dorm || '-';
    document.getElementById("detailRoom").textContent = req.room_number || req.room || '-';
    document.getElementById("detailArticle").textContent = req.article || '-';
    document.getElementById("detailType").textContent = req.category_name || req.type || '-';
    document.getElementById("detailIssue").textContent = req.description || req.issue || '-';

    // Photos
    let photosHTML = "No photos";
    let photosArr = [];
    if (req.image) {
        photosArr = [req.image];
    }
    if (photosArr.length > 0) {
        photosHTML = photosArr.map(photo => {
            const src = getImageSrc(photo);
            return `<img src="${src}" class="img-thumbnail me-2 photo-thumbnail" 
                    style="max-height: 100px; cursor: pointer;" 
                    onclick="openPhotoModal('${photo}', ${index})">`;
        }).join("");
        currentPhotos = photosArr;
    }
    document.getElementById("detailPhotos").innerHTML = photosHTML;

    document.getElementById("detailSolution").textContent = req.work_description || req.solution || '-';
    const completionDate = req.complete_date || req.completionDate || '-';

    if (completionDate === '-') {
        document.getElementById("detailCompletionDate").textContent = '-';
    } else {
        const formattedDate = formatDateDisplay(completionDate);
        const formattedTime = formatTimeDisplay(completionDate);
        document.getElementById("detailCompletionDate").textContent = `${formattedDate} ${formattedTime}`;
    }

    document.getElementById("detailStatus").textContent = req.status || '-';

    // ===== Schedule Status =====
    let scheduleStatus = "";
    let statusColor = "#666";
    if ((req.status && req.status.toLowerCase() === "completed") && req.repair_date && req.complete_date) {
        scheduleStatus = getRepairOnTimeStatus(req.repair_date, req.complete_date);
        if (scheduleStatus === "On time") statusColor = "#30BD71";
        else if (scheduleStatus.startsWith("Late")) statusColor = "#dc3545";
        else if (scheduleStatus === "Completed ahead of schedule") statusColor = "#007bff";
    }
    // ห้ามใช้ textContent กับ detailScheduleStatus
    const scheduleStatusElem = document.getElementById("detailScheduleStatusText");
    scheduleStatusElem.textContent = scheduleStatus ? scheduleStatus : "-";
    scheduleStatusElem.style.color = statusColor;
    scheduleStatusElem.style.fontWeight = "bold";
    // ==========================

    document.getElementById("detailTechnicianDisplay").textContent = req.technician_name || req.technician || '-';
    document.getElementById("detailTechnicianInput").value = req.technician_name || req.technician || '';
    document.getElementById("detailContactDisplay").textContent = req.technician_phone || req.contact || '';
    document.getElementById("detailContactInput").value = req.technician_phone || req.contact || '';
    document.getElementById("detailRepairDateDisplay").textContent = formatDateDisplay(req.repair_date || req.repairDate);
    document.getElementById("detailRepairDateInput").value = formatDateForInput(req.repair_date || req.repairDate);
    document.getElementById("detailTimeDisplay").textContent = formatTimeDisplay(req.repair_date || req.repairDate);
    document.getElementById("detailTimeInput").value = formatTimeForInput(req.repair_date || req.repairDate);

    // Edit logic
    const editButton = document.getElementById("editButton");
    const editSaveButton = document.getElementById("editSaveButton");
    if (isInProgress) {
        editButton.classList.remove("d-none");
        editButton.onclick = function () { enableEditing(); };
    } else {
        editButton.classList.add("d-none");
    }
    editSaveButton.classList.add("d-none");
    editSaveButton.onclick = function () { saveChanges(index); };
    disableEditing();

    const modal = new bootstrap.Modal(document.getElementById("detailModal"));
    modal.show();
}

function getRepairOnTimeStatus(repairDateStr, completeDateStr) {
    // Accepts two date strings (repairDate and completeDate)
    if (!repairDateStr || !completeDateStr) return "";
    const repair = new Date(repairDateStr);
    const complete = new Date(completeDateStr);
    if (isNaN(repair) || isNaN(complete)) return "";

    // ตัดเวลาเหลือแค่ วัน/เดือน/ปี
    const repairDay = new Date(repair.getFullYear(), repair.getMonth(), repair.getDate());
    const completeDay = new Date(complete.getFullYear(), complete.getMonth(), complete.getDate());

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((completeDay - repairDay) / msPerDay);

    if (diffDays < 0) return "Completed ahead of schedule";
    if (diffDays === 0) return "On time";
    return `Late (${diffDays} day${diffDays > 1 ? "s" : ""})`;
}
// Photo modal
function openPhotoModal(photoName, requestIndex) {
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
    if (detailModal) detailModal.hide();
    const photoSrc = getImageSrc(photoName);
    document.getElementById('enlargedPhoto').src = photoSrc;
    currentPhotoIndex = 0;
    currentPhotos = [photoName];
    updatePhotoCounter();
    const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
    photoModal.show();
    document.getElementById('photoModal').addEventListener('hidden.bs.modal', function () {
        if (detailModal) detailModal.show();
    });
}
function updatePhotoCounter() {
    const counter = document.getElementById('photoCounter');
    counter.textContent = `${currentPhotoIndex + 1} of ${currentPhotos.length}`;
}
function showNextPhoto() {
    if (currentPhotoIndex < currentPhotos.length - 1) {
        currentPhotoIndex++;
        let src = currentPhotos[currentPhotoIndex];
        if (!src.startsWith('http') && !src.startsWith('uploads/')) {
            if (!src.startsWith('/')) src = '/' + src;
        } else {
            src = '/' + src;
        }
        src = src.replace(/^\/?img\//, '/public/img/');
        document.getElementById('enlargedPhoto').src = src;
        updatePhotoCounter();
    }
}
function showPreviousPhoto() {
    if (currentPhotoIndex > 0) {
        currentPhotoIndex--;
        let src = currentPhotos[currentPhotoIndex];
        if (!src.startsWith('http') && !src.startsWith('uploads/')) {
            if (!src.startsWith('/')) src = '/' + src;
        } else {
            src = '/' + src;
        }
        src = src.replace(/^\/?img\//, '/public/img/');
        document.getElementById('enlargedPhoto').src = src;
        updatePhotoCounter();
    }
}

// Edit logic
function formatDateForInput(dateString) {
    if (!dateString || dateString === "-") return "";
    if (dateString.includes("/")) {
        const parts = dateString.split('/');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateString.slice(0, 10);
}
function formatDateDisplay(dateString) {
    if (!dateString || dateString === "-") return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // fallback if not valid date
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
function formatTimeForInput(timeString) {
    if (!timeString || timeString === "") return "";
    if (timeString.includes(':')) return timeString.slice(0, 5);
    if (timeString.includes('.')) {
        const [h, m] = timeString.split('.');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    return timeString;
}
function formatTimeDisplay(dtString) {
    if (!dtString) return '';
    const date = new Date(dtString);
    if (isNaN(date.getTime())) return ''; // fallback

    let hours = date.getHours();
    let minutes = date.getMinutes();

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function disableEditing() {
    document.getElementById("detailTechnicianDisplay").classList.remove("d-none");
    document.getElementById("detailTechnicianInput").classList.add("d-none");
    document.getElementById("detailContactDisplay").classList.remove("d-none");
    document.getElementById("detailContactInput").classList.add("d-none");
    document.getElementById("detailRepairDateDisplay").classList.remove("d-none");
    document.getElementById("detailRepairDateInput").classList.add("d-none");
    document.getElementById("detailTimeInput").classList.add("d-none");

}

// Save logic
function saveChanges(index) {
    // Validation: Check required fields
    const technicianInput = document.getElementById("detailTechnicianInput");
    const contactInput = document.getElementById("detailContactInput");
    const repairDateInput = document.getElementById("detailRepairDateInput");
    const timeInput = document.getElementById("detailTimeInput");

    let isValid = true;

    function setInvalid(input) {
        input.classList.add("is-invalid");
        isValid = false;
    }
    function resetInvalid(input) {
        input.classList.remove("is-invalid");
    }

    [technicianInput, contactInput, repairDateInput, timeInput].forEach(resetInvalid);

    if (!technicianInput.value.trim()) setInvalid(technicianInput);
    if (!contactInput.value.trim()) setInvalid(contactInput);
    if (!repairDateInput.value.trim()) setInvalid(repairDateInput);
    if (!timeInput.value.trim()) setInvalid(timeInput);

    if (!isValid) {
        // Show Bootstrap Modal instead of alert
        const errorModal = new bootstrap.Modal(document.getElementById('fieldErrorModal'));
        errorModal.show();
        return;
    }

    const confirmModal = new bootstrap.Modal(document.getElementById('confirmSaveModal'));
    confirmModal.show();

    document.getElementById('confirmSaveButton').onclick = async function () {
        const technician = technicianInput.value;
        const contact = contactInput.value;
        const repairDate = repairDateInput.value;
        const time = timeInput.value;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(repairDate);
        if (selectedDate < today) {
            // ใช้ modal เดิมได้เลย
            document.querySelector('#fieldErrorModal .modal-body p').innerHTML = "You cannot select a past date.";
            const errorModal = new bootstrap.Modal(document.getElementById('fieldErrorModal'));
            errorModal.show();
            confirmModal.hide();
            return;
        }

        try {
            const req = requests[index];
            const payload = {
                request_id: req.request_id,
                technician,
                contact,
                repairDate,
                time
            };
            const res = await fetch('/head/requestlist/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update');
            await fetchRequests();
            confirmModal.hide();
            const detailModal = bootstrap.Modal.getInstance(document.getElementById("detailModal"));
            if (detailModal) detailModal.hide();
        } catch (err) {
            document.querySelector('#fieldErrorModal .modal-body p').innerHTML = "Failed to save changes.";
            const errorModal = new bootstrap.Modal(document.getElementById('fieldErrorModal'));
            errorModal.show();
            confirmModal.hide();
        }
    };
}

// Search filter UI
function showSearch(type, btn) {
    document.getElementById('search-date').classList.add('d-none');
    document.getElementById('search-name').classList.add('d-none');
    document.getElementById('search-issue').classList.add('d-none');
    setActiveFilterButton(btn);
    if (type === 'all') {
        showAllRequests();
    } else {
        document.getElementById(`search-${type}`).classList.remove('d-none');
    }
}
function setActiveFilterButton(btn) {
    document.querySelectorAll('#search-filter-buttons button').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');
}

// Photo zoom
document.addEventListener('DOMContentLoaded', function () {
    fetchRequests();
    document.getElementById('prevPhotoBtn').addEventListener('click', showPreviousPhoto);
    document.getElementById('nextPhotoBtn').addEventListener('click', showNextPhoto);
    // Zoom แบบคลิกแล้วซูม-ย่อ, ไม่ต้องออก modal
    const enlargedPhoto = document.getElementById('enlargedPhoto');
    if (enlargedPhoto) {
        enlargedPhoto.addEventListener('click', function () {
            this.classList.toggle('zoomed');
        });
    }
    // เพิ่ม mousewheel/pinch zoom
    let scale = 1;
    function setZoom(factor) {
        scale = Math.max(1, Math.min(4, scale * factor));
        enlargedPhoto.style.transform = `scale(${scale})`;
        enlargedPhoto.style.transition = 'transform 0.2s';
        enlargedPhoto.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
    }
    enlargedPhoto.addEventListener('wheel', function (e) {
        e.preventDefault();
        setZoom(e.deltaY < 0 ? 1.2 : 0.8);
    });
    // Double click to reset zoom
    enlargedPhoto.addEventListener('dblclick', function () {
        scale = 1;
        enlargedPhoto.style.transform = '';
        enlargedPhoto.style.cursor = 'zoom-in';
    });
    // Reset zoom when modal hidden
    const photoModalElement = document.getElementById('photoModal');
    if (photoModalElement) {
        photoModalElement.addEventListener('hidden.bs.modal', function () {
            scale = 1;
            enlargedPhoto.style.transform = '';
            enlargedPhoto.classList.remove('zoomed');
            enlargedPhoto.style.cursor = 'zoom-in';
        });
    }
    // Tabbar
    const currentPath = window.location.pathname;
    setTimeout(() => {
        const links = document.querySelectorAll('.sidebar .menu li a');
        links.forEach(link => {
            if (link.pathname === currentPath) {
                link.parentElement.classList.add('active');
            }
        });
    }, 100);
    // Sidebar responsive
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const contentContainer = document.querySelector('.content-container');
    const SIDEBAR_WIDTH_PERCENT = 20;
    const SIDEBAR_WIDTH_PERCENT_LG = 15;
    if (mobileMenuToggle && sidebar && contentContainer) {
        mobileMenuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            document.body.classList.toggle('sidebar-open');
            if (window.innerWidth <= 991) {
                const width = sidebar.classList.contains('open')
                    ? `${SIDEBAR_WIDTH_PERCENT}vw`
                    : '0';
                contentContainer.style.marginLeft = width;
                contentContainer.style.width = `calc(100% - ${width})`;
            }
        });
        function handleResize() {
            if (window.innerWidth > 991) {
                contentContainer.style.marginLeft = `${SIDEBAR_WIDTH_PERCENT_LG}vw`;
                contentContainer.style.width = `calc(100% - ${SIDEBAR_WIDTH_PERCENT_LG}vw)`;
            } else {
                const width = sidebar.classList.contains('open')
                    ? `${SIDEBAR_WIDTH_PERCENT}vw`
                    : '0';
                contentContainer.style.marginLeft = width;
                contentContainer.style.width = `calc(100% - ${width})`;
            }
        }
        window.addEventListener('resize', handleResize);
        handleResize();
    }
});

// ---- Add padding-top to content to prevent overlap ----
document.addEventListener('DOMContentLoaded', function () {
    // Detect height of navbar and add padding to .content-container
    setTimeout(() => {
        const navbar = document.querySelector('.navbar, #navbar-placeholder .navbar');
        const container = document.querySelector('.content-container');
        if (navbar && container) {
            const navHeight = navbar.offsetHeight;
            if (navHeight > 0) {
                container.style.paddingTop = (navHeight + 24) + 'px'; // 24px for extra gap
            } else {
                container.style.paddingTop = '72px'; // default fallback
            }
        }
    }, 300);
});

// ตัวอย่างโค้ดปรับ margin-left อัตโนมัติถ้า sidebar เปิด/ปิด
document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content-container');
    function adjustMargin() {
        if (window.innerWidth > 991 && sidebar && sidebar.classList.contains('open')) {
            content.style.marginLeft = '180px'; // หรือเท่ากับ sidebar จริง
        } else if (window.innerWidth > 991) {
            content.style.marginLeft = '180px'; // ถ้า sidebar ติดตลอด
        } else {
            content.style.marginLeft = '0';
        }
    }
    window.addEventListener('resize', adjustMargin);
    adjustMargin();
});