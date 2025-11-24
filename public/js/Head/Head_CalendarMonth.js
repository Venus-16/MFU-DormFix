document.addEventListener('DOMContentLoaded', function () {
    const calendarMonth = document.getElementById("calendarMonth");
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let selectedCategory = "General";
    let lastSelectedDay = null;
    let flatpickr1 = null;
    let flatpickr2 = null;
    let isSyncingPickers = false;
    let allEvents = []; // Store events fetched from backend

    // Fetch events from backend API
    async function fetchEvents() {
        try {
            const res = await fetch(`/head/calendar?month=${selectedMonth + 1}&year=${selectedYear}`, { credentials: 'include' });
            const data = await res.json();
            allEvents = Array.isArray(data) ? data : [];
            renderCalendar();
        } catch (err) {
            allEvents = [];
            renderCalendar();
        }
    }

    // Helper to filter events by day, month, year, and category
    function getEvents(day, month, year, category) {
        return allEvents.filter(e =>
            Number(e.day) === Number(day)
            && Number(e.month) === Number(month)
            && Number(e.year) === Number(year)
            && (category ? e.category === category : true)
        );
    }

    // Flatpickr setup
    flatpickr1 = flatpickr("#monthYearPicker", {
        plugins: [
            new monthSelectPlugin({
                shorthand: true,
                dateFormat: "F Y",
                altFormat: "F Y"
            })
        ],
        onChange: function (selectedDates) {
            if (isSyncingPickers) return;
            isSyncingPickers = true;
            const date = selectedDates[0];
            if (date) {
                selectedMonth = date.getMonth();
                selectedYear = date.getFullYear();
                flatpickr2.setDate(date, true);
                fetchEvents();
            }
            isSyncingPickers = false;
        },
        defaultDate: new Date()
    });

    flatpickr2 = flatpickr("#monthYearPicker2", {
        plugins: [
            new monthSelectPlugin({
                shorthand: true,
                dateFormat: "F Y",
                altFormat: "F Y"
            })
        ],
        onChange: function (selectedDates) {
            if (isSyncingPickers) return;
            isSyncingPickers = true;
            const date = selectedDates[0];
            if (date) {
                selectedMonth = date.getMonth();
                selectedYear = date.getFullYear();
                flatpickr1.setDate(date, true);
                fetchEvents();
            }
            isSyncingPickers = false;
        },
        defaultDate: new Date()
    });

    window.switchCategory = function (category) {
        selectedCategory = category;
        document.querySelectorAll(".category-buttons .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.category-buttons .btn[onclick*='${category}']`).classList.add("active");
        renderCalendar();
        const dayToShow = lastSelectedDay || new Date().getDate();
        renderTodayEvents(dayToShow);
        document.getElementById("todayTitle").innerText = `Events on ${dayToShow}/${selectedMonth + 1}/${selectedYear}`;
    };

    window.renderCalendar = function () {
        const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
        const lastDate = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        calendarMonth.innerHTML = `
<div class="fw-bold text-center">Sun</div>
<div class="fw-bold text-center">Mon</div>
<div class="fw-bold text-center">Tue</div>
<div class="fw-bold text-center">Wed</div>
<div class="fw-bold text-center">Thu</div>
<div class="fw-bold text-center">Fri</div>
<div class="fw-bold text-center">Sat</div>
`;

        for (let i = 0; i < firstDay; i++) {
            calendarMonth.innerHTML += `<div class="calendar-day empty"></div>`;
        }

        for (let d = 1; d <= lastDate; d++) {
            const dayEvents = getEvents(d, selectedMonth + 1, selectedYear, selectedCategory);

            // เรียง events ตามเวลา (ascending)
            const sortedEvents = [...dayEvents].sort((a, b) => {
                const t1 = (a.time || "").padStart(5, "0");
                const t2 = (b.time || "").padStart(5, "0");
                return t1.localeCompare(t2);
            });

            const dayOfWeek = new Date(selectedYear, selectedMonth, d).getDay();
            let holidayClass = dayOfWeek === 0 ? 'holiday' : '';

            let html = `<div class='calendar-day ${holidayClass}' data-day="${d}">`;
            html += `<div class='date-number'>${d}</div>`;

            const maxShow = 3;
            sortedEvents.slice(0, maxShow).forEach((evt, idx) => {
                const location = `${evt.dormitory || ''}${evt.room ? ' - ' + evt.room : ''}`;
                html += `
            <div class='event ${evt.color || ""}' 
                data-idx="${idx}" data-day="${d}">
                <div class="event-time"><strong>${evt.time || ""}</strong></div>
                <div class="event-title">${evt.technician_name || evt.name || ""}</div>
                <div class="event-location">${location}</div>
                <div class="event-item">${evt.item || evt.article || ""}</div>
            </div>
        `;
            });
            if (sortedEvents.length > maxShow) {
                html += `<div class="calendar-event-more" data-day="${d}">${sortedEvents.length - maxShow} more event(s)</div>`;
            }

            html += `</div>`;
            calendarMonth.innerHTML += html;
        }

        renderMiniCalendar();

        // Bind bubble event click
        setTimeout(() => {
            document.querySelectorAll('.calendar-day .event').forEach(el => {
                el.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const day = parseInt(this.dataset.day, 10);
                    const idx = parseInt(this.dataset.idx, 10);
                    const events = getEvents(day, selectedMonth + 1, selectedYear, selectedCategory);
                    if (events[idx]) showEventDetails(events[idx]);
                });
            });
            document.querySelectorAll('.calendar-event-more').forEach(el => {
                el.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const day = parseInt(this.dataset.day, 10);
                    showAllEventsPopup(day);
                });
            });
        }, 30);
        const today = new Date();
        if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
            const dayToShow = lastSelectedDay || today.getDate();
            renderTodayEvents(dayToShow);
            document.getElementById("todayTitle").innerText = `Events on ${dayToShow}/${selectedMonth + 1}/${selectedYear}`;
        }
    };
    window.showAllEventsPopup = function (day) {
        const allEvents = getEvents(day, selectedMonth + 1, selectedYear, selectedCategory);

        // เรียงเวลา ascending
        const sortedEvents = [...allEvents].sort((a, b) => {
            // ถ้ามีเวลาเป็น "HH:MM" หรือ "H:MM"
            const t1 = (a.time || "").padStart(5, "0");
            const t2 = (b.time || "").padStart(5, "0");
            return t1.localeCompare(t2);
        });

        let html = `
    <div class="calendar-modal-popup wide">
        <div class="calendar-modal-header">
            <span class="calendar-modal-date">${day}/${selectedMonth + 1}/${selectedYear}</span>
            <button class="calendar-modal-close" onclick="document.getElementById('popup-overlay').style.display='none'">&times;</button>
        </div>
        <div class="calendar-modal-list">
    `;
        if (sortedEvents.length === 0) {
            html += `<div class="calendar-modal-empty">No events found</div>`;
        }
        sortedEvents.forEach((evt, idx) => {
            const dormitory = evt.dormitory || 'N/A';
            const room = evt.room ? + evt.room : '';
            const item = evt.item || evt.article || 'N/A';

            html += `
        <div class="calendar-modal-bubble" data-idx="${idx}" data-day="${day}" title="View Details">
            <span class="calendar-modal-dot"></span>
            <span class="calendar-modal-time">${evt.time || ""}</span>
            <div class="calendar-modal-details">
                <div class="calendar-modal-title">${evt.technician_name || evt.name || ""}</div>
                <div class="calendar-modal-item"><strong>Item:</strong> ${item}</div>
                <div class="calendar-modal-dormitory"><strong>Dormitory:</strong> ${dormitory}</div>
                ${room ? `<div class="calendar-modal-room"><strong>Room:</strong> ${room}</div>` : ''}
            </div>
        </div>
        `;
        });
        html += `</div></div>`;

        let overlay = document.getElementById('popup-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'popup-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = html;
        overlay.style.cssText = `
        position: fixed; left:0; right:0; top:0; bottom:0; background: rgba(0,0,0,0.22);
        z-index: 9999; display: flex; align-items: center; justify-content: center;
    `;

        // ปิด popup เมื่อคลิกข้างนอก modal
        overlay.onclick = function (e) {
            if (e.target === overlay) overlay.style.display = 'none';
        };

        // Bind click ใน popup (bubble event)
        overlay.querySelectorAll('.calendar-modal-bubble').forEach((el, i) => {
            el.addEventListener('click', function (e) {
                e.stopPropagation();
                if (sortedEvents[i]) showEventDetails(sortedEvents[i]);
                overlay.style.display = 'none';
            });
        });

        overlay.style.display = 'flex';
    };

    function renderMiniCalendar() {
        const miniBody = document.getElementById("miniCalendarBody");
        miniBody.innerHTML = "";

        const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
        const lastDate = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        let html = "<tr>";
        let dayCounter = 0;

        for (let i = 0; i < firstDay; i++) {
            html += "<td></td>";
            dayCounter++;
        }

        for (let day = 1; day <= lastDate; day++) {
            html += `<td style="cursor:pointer" onclick="handleMiniDateClick(${day})"><div class="mini-date" data-day="${day}">${day}</div></td>`;
            dayCounter++;
            if (dayCounter % 7 === 0 && day !== lastDate) {
                html += "</tr><tr>";
            }
        }

        while (dayCounter % 7 !== 0) {
            html += "<td></td>";
            dayCounter++;
        }

        html += "</tr>";
        miniBody.innerHTML = html;

        // ไฮไลท์วันที่เลือก
        const today = new Date();
        const highlightDay = lastSelectedDay || today.getDate();
        document.querySelectorAll(".mini-date").forEach(el => {
            if (parseInt(el.textContent) === highlightDay) {
                el.classList.add("active-date");
            }
        });
    }

    window.handleMiniDateClick = function (day) {
        lastSelectedDay = day;
        document.querySelectorAll(".mini-date").forEach(el => el.classList.remove("active-date"));
        document.querySelectorAll(".mini-date").forEach(el => {
            if (el.textContent == day) {
                el.classList.add("active-date");
            }
        });
        renderTodayEvents(day);
        document.getElementById("todayTitle").innerText = `Events on ${day}/${selectedMonth + 1}/${selectedYear}`;
    };
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
            fetch('/logout', { method: 'GET', credentials: 'include' })
                .then(() => window.location.href = '/login')
                .catch(() => window.location.href = '/login');
        });
    }
   function renderTodayEvents(day) {
    const container = document.getElementById("todayEvents");
    const dayEvents = getEvents(day, selectedMonth + 1, selectedYear);

    if (dayEvents.length === 0) {
        container.innerHTML = "<div class='text-muted'>No events.</div>";
        return;
    }
    // Group by category
    const eventsByCategory = {};
    dayEvents.forEach(evt => {
        if (!eventsByCategory[evt.category]) {
            eventsByCategory[evt.category] = [];
        }
        eventsByCategory[evt.category].push(evt);
    });

    // ล้าง container ก่อน
    container.innerHTML = "";

    const categoryColors = {
        "General": "primary",
        "Furniture": "warning",
        "Electrical": "info",
        "Plumbing": "success",
        "Air Conditioning": "danger",
        "Air": "danger"
    };

    for (const [category, events] of Object.entries(eventsByCategory)) {
        // เรียง events ตามเวลา (ascending)
        const sortedEvents = [...events].sort((a, b) => {
            const t1 = (a.time || "").padStart(5, "0");
            const t2 = (b.time || "").padStart(5, "0");
            return t1.localeCompare(t2);
        });

        // Header
        const headerDiv = document.createElement("div");
        headerDiv.className = "mb-3";
        headerDiv.innerHTML = `
            <h6 class="text-uppercase small d-flex align-items-center">
                <span class="badge bg-${categoryColors[category] || 'secondary'} me-2">${category}</span>
                <span>${sortedEvents.length} events</span>
            </h6>
        `;
        container.appendChild(headerDiv);

        // Event list
        sortedEvents.forEach((evt, idx) => {
            const room = (evt.room && evt.room !== '-') ? `Room ${evt.room}` : '';
            const dormitory = evt.dormitory || evt.place || '-';
            const location = room ? `${dormitory} - ${room}` : dormitory;

            // สร้าง div ด้วย JS แล้ว bind click event
            const eventDiv = document.createElement("div");
            eventDiv.className = `mb-2 p-2 border-start border-3 border-${evt.color || 'secondary'} bg-light event-today-item`;
            eventDiv.style.cursor = "pointer";
            eventDiv.innerHTML = `
                <div><strong>${evt.time || ""}</strong></div>
                <div>${evt.technician_name || evt.name || ""}</div>
                <div>${location}</div>
                <div>${evt.item || evt.article || ""}</div>
            `;
            eventDiv.addEventListener('click', function(e) {
                e.stopPropagation();
                window.showEventDetails(evt);
            });
            container.appendChild(eventDiv);
        });
    }
}
    window.showAllEventsModal = function (day) {
        const allEvents = getEvents(day, selectedMonth + 1, selectedYear, selectedCategory);
        let html = `<h5>All events on ${day}/${selectedMonth + 1}/${selectedYear}</h5>`;
        allEvents.forEach(evt => {
            const location = `${evt.dormitory || ''}${evt.room ? ' - ' + evt.room : ''}`;
            html += `
        <div class='calendar-event mb-2 ${evt.color || ""}'>
            <div class="event-time"><strong>${evt.time || ""}</strong></div>
            <div class="event-title">${evt.technician_name || evt.name || ""}</div>
            <div class="event-location">${location}</div>
            <div class="event-item">${evt.item || evt.article || ""}</div>
        </div>
        `;
        });
        // แสดงใน modal (คุณอาจต้องมี modalTemplate ซ่อนอยู่ใน html)
        const modalContent = document.getElementById('allEventsModalContent');
        modalContent.innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('allEventsModal'));
        modal.show();
    };
    window.showEventDetails = function (eventData) {
        const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
        const eventDate = new Date(selectedYear, selectedMonth, eventData.day);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        document.getElementById('eventDate').textContent = formattedDate;
        document.getElementById('eventTime').textContent = eventData.time || '';
        const statusEl = document.getElementById('eventStatus');
        statusEl.textContent = eventData.status || 'Confirm';
        statusEl.className = 'badge bg-info text-dark';
        document.getElementById('eventCategory').textContent = eventData.category;
        document.getElementById('eventCategory').className = `badge bg-${getCategoryColorClass(eventData.category)}`;
        document.getElementById('eventDormitory').textContent = eventData.dormitory;
        document.getElementById('eventRoom').textContent = eventData.room;
        document.getElementById('eventItem').textContent = eventData.item || eventData.article || '';
        document.getElementById('eventDescription').textContent = eventData.description || 'No additional description provided';
        document.getElementById('eventTechnician').textContent = eventData.technician_name || eventData.name || '';
        document.getElementById('eventContact').textContent = eventData.contact || eventData.technician_phone || 'N/A';

        modal.show();
    };

    function getCategoryColorClass(category) {
        const colors = {
            "General": "primary",
            "Furniture": "warning",
            "Electrical": "info",
            "Plumbing": "success",
            "Air Conditioning": "danger",
            "Air": "danger"
        };
        return colors[category] || 'secondary';
    }

    window.switchView = function (view) {
        if (view === "day") {
            window.location.href = "/head/calendarday";
            return;
        }
        if (view === "week") {
            window.location.href = "/head/calendarweek";
            return;
        }
        document.querySelectorAll(".view-buttons .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.view-buttons .btn[onclick*='${view}']`).classList.add("active");
        document.getElementById("calendarDay").style.display = "none";
        document.getElementById("calendarWeek").style.display = "none";
        document.getElementById("calendarMonth").style.display = "none";
        if (view === "month") {
            document.getElementById("calendarMonth").style.display = "grid";
        }
    };
    // ให้ปุ่ม Logout ทำงาน
    document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });

    // Sidebar toggle for mobile
    document.getElementById('toggleSidebar').addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('show');
    });
    window.addEventListener('click', function (e) {
        var sidebar = document.getElementById('sidebar');
        var toggle = document.getElementById('toggleSidebar');
        if (
            sidebar.classList.contains('show')
            && !sidebar.contains(e.target)
            && e.target !== toggle
            && !toggle.contains(e.target)
        ) {
            sidebar.classList.remove('show');
        }
    });

    // Initial fetch
    fetchEvents();
});