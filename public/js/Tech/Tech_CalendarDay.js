// Tech_CalendarDay.js

let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let selectedDay = new Date().getDate();
// Removed the default category lock here
let selectedCategory = ""; // Allow all categories by default, not locked to "General"
let currentViewDay = new Date();
let eventsDatabase = []; // Will be loaded from API
let eventsForToday = []; // To store events for the current selected day

document.addEventListener('DOMContentLoaded', function () {
    let isSyncingPickers = false;
    let flatpickr1 = null;
    let flatpickr2 = null;

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
                fetchEventsAndRender();
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
                fetchEventsAndRender();
            }
            isSyncingPickers = false;
        },
        defaultDate: new Date()
    });

    // Fetch events from server for current month/year
    fetchEventsAndRender();

    // Load user info for navbar/profile
    fetchUserInfo();

    // Sidebar toggle for mobile
    document.getElementById('toggleSidebar').addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('show');
    });

    // Optional: Close sidebar when clicking outside (mobile)
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

    // Profile click: ไปหน้า profile
    document.getElementById('profileLink').addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = "/tech/profile";
    });

    const logoutBtn = document.getElementById('logoutLink') || document.getElementById('logout-link');
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

    // Set initial category and render
    switchCategory(""); // Show all categories initially
});

function fetchUserInfo() {
    fetch('/user/me', { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error("Not logged in");
            return res.json();
        })
        .then(user => {
            document.getElementById("userName").innerText = user.name || "Unknown";
            document.getElementById("userRole").innerText = user.role || "Technician";
        })
        .catch(() => {
            document.getElementById("userName").innerText = "Unknown";
            document.getElementById("userRole").innerText = "Technician";
        });
}

function fetchEventsAndRender() {
    // API endpoint for technician's calendar
    fetch(`/tech/calendar/data?month=${selectedMonth + 1}&year=${selectedYear}`, {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            return response.json();
        })
        .then(events => {
            eventsDatabase = events || [];
            renderMiniCalendar();
            renderTodayEvents(selectedDay);
            renderDayView();
            switchView('day');
        })
        .catch(err => {
            console.error(err);
            eventsDatabase = [];
            renderMiniCalendar();
            renderTodayEvents(selectedDay);
            renderDayView();
        });
}

window.switchCategory = function (category) {
    selectedCategory = category; // category can be "" for all
    document.querySelectorAll(".category-buttons .btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".category-buttons .btn").forEach(btn => {
        if (btn.textContent.trim() === category) btn.classList.add("active");
    });
    renderDayView();
};

function getEvents(day, month, year, category) {
    const dayEvents = (eventsDatabase || []).filter(e =>
        Number(e.day) === Number(day) &&
        Number(e.month) === Number(month) &&
        Number(e.year) === Number(year) &&
        (e.status === 'Confirmed') &&
        (!category || e.category === category)
    );
    return dayEvents;
}

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
        html += `<td style="cursor:pointer" onclick="handleMiniDateClick(${day})">
                    <div class="mini-date${day === selectedDay ? ' active-date' : ''}" data-day="${day}">${day}</div>
                 </td>`;
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
}

window.handleMiniDateClick = function (day) {
    selectedDay = day;
    currentViewDay = new Date(selectedYear, selectedMonth, day);

    document.querySelectorAll(".mini-date").forEach(el => el.classList.remove("active-date"));
    document.querySelector(`.mini-date[data-day='${day}']`).classList.add("active-date");

    renderTodayEvents(day);
    document.getElementById("todayTitle").innerText = `Events on ${day}/${selectedMonth + 1}/${selectedYear}`;

    renderDayView();
}

function renderTodayEvents(day) {
    const container = document.getElementById("todayEvents");
    eventsForToday = getEvents(day, selectedMonth + 1, selectedYear, selectedCategory);

    eventsForToday.sort((a, b) => a.time.localeCompare(b.time));

    let html = "";

    if (eventsForToday.length === 0) {
        html += "<div class='text-muted'>No events.</div>";
        container.innerHTML = html;
        return;
    }

    const eventsByCategory = {};
    eventsForToday.forEach(evt => {
        if (!eventsByCategory[evt.category]) {
            eventsByCategory[evt.category] = [];
        }
        eventsByCategory[evt.category].push(evt);
    });

    const categoryColors = {
        "General": "primary",
        "Furniture": "warning",
        "Electrical": "info",
        "Plumbing": "success",
        "Air Conditioning": "danger",
        "Air": "danger"
    };

    for (const [category, events] of Object.entries(eventsByCategory)) {
        html += `<div class="mb-3">
            <span class="badge bg-${categoryColors[category] || 'secondary'} me-2" style="font-size:0.9rem;">${category.toUpperCase()}</span>
            <span style="font-size:0.95rem;">${events.length} EVENTS</span>
        </div>`;
        events.forEach(evt => {
            const room = (evt.room && evt.room !== '-') ? `Room ${evt.room}` : '';
            const dormitory = evt.dormitory || evt.place || '-';
            const location = room ? `${dormitory} - ${room}` : dormitory;
            const index = eventsForToday.indexOf(evt);

            // === เพิ่มชื่อคนแจ้งซ่อมไว้เหนือหอ/ห้อง ===
            html += `<div class="mb-2 p-2 border-start border-3 border-${evt.color || 'primary'} bg-light event-today-item"
                    style="cursor: pointer; color: #212529;"
                    data-event-index="${index}">
                    <div><strong>${evt.time || '-'}</strong></div>
                    ${evt.reporter_name ? `<div class="fw-bold">${evt.reporter_name}</div>` : ''}
                    <div>${location}</div>
                    <div>${evt.item || '-'}</div>
                </div>`;
        });
    }

    container.innerHTML = html;
    container.querySelectorAll('.event-today-item').forEach(div => {
        const idx = parseInt(div.getAttribute('data-event-index'), 10);
        div.addEventListener('click', function () {
            window.showEventDetails(eventsForToday[idx]);
        });
    });
}


function renderDayView() {
    const dayNameElement = document.getElementById("dayName");
    const dayDateElement = document.getElementById("dayDate");
    const eventsColumn = document.getElementById("eventsColumn");

    // Update day display
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    dayNameElement.textContent = dayNames[currentViewDay.getDay()];
    dayDateElement.textContent = String(currentViewDay.getDate()).padStart(2, '0');

    // Clear events
    eventsColumn.querySelectorAll('.hour-row').forEach(row => {
        row.innerHTML = '<div class="hour-events-container" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>';
    });

    // Get events for the day and selected category
    const events = getEvents(
        currentViewDay.getDate(),
        currentViewDay.getMonth() + 1,
        currentViewDay.getFullYear(),
        selectedCategory
    );

    // จัดกลุ่ม Event ตามชั่วโมง
    const eventsByHour = {};
    events.forEach(event => {
        if (!event.time) return;

        let hour;
        if (event.time.includes(':')) {
            hour = parseInt(event.time.split(':')[0]);
        } else {
            hour = parseInt(event.time);
        }

        if (!eventsByHour[hour]) {
            eventsByHour[hour] = [];
        }
        eventsByHour[hour].push(event);
    });

    // Place events in time grid
    for (const [hour, hourEvents] of Object.entries(eventsByHour)) {
        const hourTime = `${hour.toString().padStart(2, '0')}:00`;
        const hourRow = getHourRowForTime(hourTime);

        if (hourRow) {
            const container = hourRow.querySelector('.hour-events-container');

            hourEvents.sort((a, b) => {
                const timeA = a.time || '00:00';
                const timeB = b.time || '00:00';
                return timeA.localeCompare(timeB);
            });

            if (hourEvents.length > 1) {
                hourEvents.forEach(event => {
                    const eventElement = createEventElement(event);
                    eventElement.style.flex = `0 0 calc(${100 / hourEvents.length}% - 8px)`;
                    eventElement.style.maxWidth = `calc(${100 / hourEvents.length}% - 8px)`;
                    container.appendChild(eventElement);
                });
            } else {
                hourEvents.forEach(event => {
                    const eventElement = createEventElement(event);
                    eventElement.style.flex = "1 1 100%";
                    eventElement.style.maxWidth = "100%";
                    container.appendChild(eventElement);
                });
            }
        }
    }
}

function createEventElement(event) {
    const eventDiv = document.createElement('div');
    const categoryClass = (event.category || '').toLowerCase().replace(/\s+/g, '-');
    eventDiv.className = `event-item category-${categoryClass}`;
    eventDiv.style.cursor = 'pointer';

    const roomText = event.room && event.room !== '-' ? `Room ${event.room}` : '';
    const locationText = event.dormitory
        ? `${event.dormitory}${roomText ? ' - ' + roomText : ''}`
        : (roomText || '');

    eventDiv.innerHTML = `
        <div class="event-time">${event.time || ''}</div>
        <div class="event-title">${event.reporter_name || ''}</div>
        <div class="event-location">${event.item || ''}</div>
        <div class="event-location">${locationText}</div>
    `;
    eventDiv.addEventListener('click', function (e) {
        e.stopPropagation();
        window.showEventDetails(event);
    });
    return eventDiv;
}

function getHourRowForTime(timeString) {
    const hourRows = document.querySelectorAll('.hour-row');
    if (!timeString) {
        return null;
    }
    const hour = parseInt(timeString.split(':')[0], 10);
    const rowIndex = hour - 8;

    if (rowIndex >= 0 && rowIndex < hourRows.length) {
        return hourRows[rowIndex];
    }
    return null;
}

window.changeDay = function (direction) {
    currentViewDay.setDate(currentViewDay.getDate() + direction);
    selectedDay = currentViewDay.getDate();
    const newMonth = currentViewDay.getMonth();
    const newYear = currentViewDay.getFullYear();

    if (newMonth !== selectedMonth || newYear !== selectedYear) {
        selectedMonth = newMonth;
        selectedYear = newYear;
        const picker1 = document.querySelector("#monthYearPicker")._flatpickr;
        const picker2 = document.querySelector("#monthYearPicker2")._flatpickr;
        picker1.setDate(currentViewDay, false);
        picker2.setDate(currentViewDay, false);
        fetchEventsAndRender();
    } else {
        renderMiniCalendar();
        renderDayView();
        renderTodayEvents(selectedDay);
        document.getElementById("todayTitle").innerText = `Events on ${selectedDay}/${selectedMonth + 1}/${selectedYear}`;
    }
}

window.switchView = function (view) {
    document.getElementById("calendarDay").style.display = "none";

    if (view === "day") {
        document.getElementById("calendarDay").style.display = "block";
        renderDayView();
    }
    if (view === "week") {
        window.location.href = "/tech/calendarweek";
        return;
    }
    if (view === "month") {
        window.location.href = "/tech/calendarmonth";
        return;
    }

    document.querySelectorAll(".view-buttons .btn").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.view-buttons .btn[onclick*='${view}']`).classList.add("active");
}

window.showEventDetails = function (eventData) {
    const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
    const eventDate = new Date(eventData.year, eventData.month - 1, eventData.day);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    document.getElementById('eventDate').textContent = formattedDate;
    document.getElementById('eventTime').textContent = eventData.time || 'N/A';
    const statusEl = document.getElementById('eventStatus');
    statusEl.textContent = eventData.status || 'Confirmed';
    statusEl.className = 'badge bg-info text-dark';
    document.getElementById('eventDormitory').textContent = eventData.dormitory;
    document.getElementById('eventRoom').textContent = eventData.room;
    document.getElementById('eventItem').textContent = eventData.item || eventData.article || '';
    document.getElementById('eventDescription').textContent = eventData.description || 'No additional description provided';
    document.getElementById('eventTechnician').textContent = eventData.assigned_by || "-";
    document.getElementById('eventContact').textContent = eventData.contact || eventData.technician_phone || 'N/A';
    modal.show();
}

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