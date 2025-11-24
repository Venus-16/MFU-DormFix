function getRequestIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('request_id');
}

let currentCategoryId = null;
let currentCategoryName = null; // <-- เพิ่มตัวแปรนี้

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

    // ตั้งค่า min ของ input type="date" ให้เป็นวันปัจจุบัน เพื่อให้วันย้อนหลังเป็นสีเทาและกดไม่ได้
    const dateInput = document.getElementById('repair_date_assign');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;
        dateInput.setAttribute('min', minDate);
    }
});

async function loadTechnicians(selectedName = "", categoryId = null, date = null, time = null) {
    let url = '/head/technician/available';
    const params = [];
    if (categoryId) params.push(`category_id=${categoryId}`);
    if (date) params.push(`date=${date}`);
    if (time) params.push(`time=${time}`);
    if (params.length > 0) url += "?" + params.join("&");

    const res = await fetch(url);
    const data = await res.json();
    const select = document.getElementById('technician');
    select.innerHTML = '<option value="">Select Technician</option>';
    data.forEach(tech => {
        const sel = tech.name === selectedName ? 'selected' : '';
        select.innerHTML += `<option value="${tech.name}" data-phone="${tech.phone_number}" ${sel}>${tech.name}</option>`;
    });

    // เงื่อนไขแสดงข้อความเตือนแยกแต่ละกรณี
    if (data.length === 0) {
        if (date && !time) {
            showAlert("There are no available technicians on this day. Please select a different day.");
        } else if (!date && time) {
            showAlert("There are no available technicians at this time. Please select a different time.");
        } else if (date && time) {
            showAlert("There are no available technicians for this date and time. Please select a different date or time.");
        } else {
            showAlert("There are no available technicians. Please select a different date or time.");
        }
        select.innerHTML = '<option value="">Select Technician</option>';
    }

    select.onchange = function () {
        const opt = select.selectedOptions[0];
        document.getElementById('technician_phone').value = opt && opt.value !== "" ? (opt.dataset.phone || "") : "";
        if (opt && opt.value !== "") {
            select.classList.remove("is-invalid");
            document.getElementById('technician_phone').classList.remove("is-invalid");
        }
    };

    const selected = Array.from(select.options).find(opt => opt.value === selectedName);
    if (!selectedName || !selected) {
        document.getElementById('technician_phone').value = "";
    } else {
        document.getElementById('technician_phone').value = selected.dataset.phone || "";
    }
}


async function loadRequestData() {
    const requestId = getRequestIdFromUrl();
    if (!requestId) return;

    const res = await fetch(`/head/requestlist?request_id=${requestId}`);
    const data = await res.json();
    const req = data.requests && data.requests[0];
    if (!req) return;

    currentCategoryId = req.category_id;
    currentCategoryName = req.category_name; // <-- เก็บชื่อประเภทงาน

    function dateDMYtoYMD(dateStr) {
        if (!dateStr) return "";
        if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return dateStr;
    }

    document.getElementById('request_date').value = dateDMYtoYMD(req.request_date);
    document.getElementById('dorm').value = req.dorm || "";
    document.getElementById('reporter_name').value = req.reporter_name || "";
    document.getElementById('room_number').value = req.room_number || "";
    document.getElementById('repair_type').value = req.category_name || "";
    document.getElementById('article').value = req.article || "";
    document.getElementById('description').value = req.description || "";
    if (req.image) {
        document.getElementById('issue_image').src = req.image.startsWith('uploads/') ? '/public/' + req.image : req.image;
    }
    // วัน/เวลา
    let dateVal = "";
    let timeVal = "";
    if (req.repair_date) {
        let [dateStr, timeStr] = req.repair_date.split(' ');
        dateVal = dateStr;
        if (timeStr) {
            let [hour, min] = timeStr.split(':');
            timeVal = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
        }
    }
    document.getElementById('repair_date_assign').value = dateVal ? dateVal : "";
    document.getElementById('repair_time').value = timeVal;
    document.getElementById('technician_phone').value = req.technician_phone || "";

    await loadTechnicians(req.technician_name, currentCategoryId, dateVal, timeVal);
}



// ฟังก์ชัน popup แจ้งเตือน
function showAlert(msg) {
    // Bootstrap 5 modal (ถ้ามี) หรือ alert ธรรมดา
    if (window.bootstrap && document.getElementById('formAlertModal')) {
        document.getElementById('alert-msg').textContent = msg;
        new bootstrap.Modal(document.getElementById('formAlertModal')).show();
    } else {
        alert(msg);
    }
}

async function assignRequest() {
    // Validate
    let valid = true;
    const technicianSelect = document.getElementById('technician');
    const technician = technicianSelect.value;
    const contactInput = document.getElementById('technician_phone');
    const contact = contactInput.value;
    const repairDateInput = document.getElementById('repair_date_assign');
    const repairDate = repairDateInput.value;
    const timeInput = document.getElementById('repair_time');
    const time = timeInput.value;

    // รีเซ็ต error
    [technicianSelect, contactInput, repairDateInput, timeInput].forEach(el => el.classList.remove("is-invalid"));

    // ตรวจสอบว่าเลือกวันที่ย้อนหลังหรือไม่
    if (repairDate) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const selectedDate = new Date(repairDate);
        if (selectedDate < today) {
            valid = false;
            repairDateInput.classList.add("is-invalid");
            showAlert("You cannot select a past date.");
            return;
        }
    }

    if (!repairDate) {
        valid = false;
        repairDateInput.classList.add("is-invalid");
    }
    if (!time) {
        valid = false;
        timeInput.classList.add("is-invalid");
    }
    if (!technician || technician === "") {
        valid = false;
        technicianSelect.classList.add("is-invalid");
    }
    if (!contact) {
        valid = false;
        contactInput.classList.add("is-invalid");
    }

    if (!valid) {
        showAlert("Please fill all required fields and select a technician.");
        return;
    }

    const request_id = getRequestIdFromUrl();

    const res = await fetch('/head/requestlist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, technician, contact, repairDate, time })
    });
    const result = await res.json();
    if (result.success) {
        // alert('Assigned successfully!');
        // window.location.href = "Head_Requestlist.html"; // <-- ลบทิ้งหรือคอมเมนต์ไว้
        // เพิ่ม redirect ที่ถูกต้อง:
        let cat = (currentCategoryName || '').toLowerCase();
        if (cat.includes('general')) cat = 'general';
        else if (cat.includes('furniture')) cat = 'furniture';
        else if (cat.includes('electrical')) cat = 'electrical';
        else if (cat.includes('plumbing')) cat = 'plumbing';
        else if (cat.includes('air')) cat = 'air';
        else cat = 'general';
        window.location.href = `/head/request/${cat}`;
    }
    else {
        alert(result.error || "Failed to assign");
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadRequestData();

    const dateInput = document.getElementById('repair_date_assign');
    const timeInput = document.getElementById('repair_time');

    function reloadTech() {
        const date = dateInput.value;
        const time = timeInput.value;
        loadTechnicians("", currentCategoryId, date, time);
        document.getElementById('technician_phone').value = "";
    }
    dateInput.addEventListener('change', reloadTech);
    timeInput.addEventListener('change', reloadTech);

    document.getElementById('technician').addEventListener('change', function () {
        const opt = this.selectedOptions[0];
        document.getElementById('technician_phone').value = opt && opt.value !== "" ? (opt.dataset.phone || "") : "";
        // remove red border on change
        if (opt && opt.value !== "") {
            this.classList.remove("is-invalid");
            document.getElementById('technician_phone').classList.remove("is-invalid");
        }
    });
});

// ฟังก์ชันสำหรับ handleCancel ให้ redirect ไปหน้าที่ถูกต้อง
function handleCancel() {
    // ใช้ currentCategoryName ที่ได้ตอน loadRequestData()
    let cat = (currentCategoryName || '').toLowerCase();
    if (cat.includes('general')) cat = 'general';
    else if (cat.includes('furniture')) cat = 'furniture';
    else if (cat.includes('electrical')) cat = 'electrical';
    else if (cat.includes('plumbing')) cat = 'plumbing';
    else if (cat.includes('air')) cat = 'air';
    else cat = 'general'; // fallback

    window.location.href = `/head/request/${cat}`;
}