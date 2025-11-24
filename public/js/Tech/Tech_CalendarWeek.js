document.addEventListener("DOMContentLoaded", function () {
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let currentWeekStart = getStartOfWeek(new Date());
    let eventsDb = [];

    let flatpickr1 = null;
    let flatpickr2 = null;
    let isSyncingPickers = false;
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
            if (selectedDates[0]) {
                selectedMonth = selectedDates[0].getMonth();
                selectedYear = selectedDates[0].getFullYear();
                flatpickr2.setDate(selectedDates[0], true);
                fetchEventsAndRender();
                currentWeekStart = getStartOfWeek(new Date(selectedYear, selectedMonth, 1));
                renderWeekView();
                const today = new Date();
                if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
                    renderTodayEvents(today.getDate());
                }
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
            if (selectedDates[0]) {
                selectedMonth = selectedDates[0].getMonth();
                selectedYear = selectedDates[0].getFullYear();
                flatpickr1.setDate(selectedDates[0], true);
                fetchEventsAndRender();
                currentWeekStart = getStartOfWeek(new Date(selectedYear, selectedMonth, 1));
                renderWeekView();
                const today = new Date();
                if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
                    renderTodayEvents(today.getDate());
                }
            }
            isSyncingPickers = false;
        },
        defaultDate: new Date()
    });

    function fetchEventsAndRender() {
        fetch(`/tech/calendar/data?month=${selectedMonth + 1}&year=${selectedYear}`)
            .then(res => res.json())
            .then(events => {
                eventsDb = Array.isArray(events) ? events : [];
                renderMiniCalendar();
                renderWeekView();
                const today = new Date();
                if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
                    renderTodayEvents(today.getDate());
                }
            })
            .catch(() => {
                eventsDb = [];
                renderMiniCalendar();
                renderWeekView();
                const today = new Date();
                if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
                    renderTodayEvents(today.getDate());
                }
            });
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

        // ไฮไลท์วันปัจจุบัน
        const today = new Date();
        let showDay = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear
            ? today.getDate()
            : 1;
        document.querySelectorAll(".mini-date").forEach(el => {
            if (parseInt(el.textContent) === showDay) {
                el.classList.add("active-date");
            }
        });
        // เรียก today events ด้วย
        renderTodayEvents(showDay);
        document.getElementById("todayTitle").innerText = `Events on ${showDay}/${selectedMonth + 1}/${selectedYear}`;
    }

    window.handleMiniDateClick = function (day) {
        document.querySelectorAll(".mini-date").forEach(el => el.classList.remove("active-date"));
        document.querySelectorAll(".mini-date").forEach(el => {
            if (el.textContent == day) {
                el.classList.add("active-date");
            }
        });

        renderTodayEvents(day);
        document.getElementById("todayTitle").innerText = `Events on ${day}/${selectedMonth + 1}/${selectedYear}`;

        const selectedDate = new Date(selectedYear, selectedMonth, day);
        currentWeekStart = getStartOfWeek(selectedDate);

        if (document.getElementById("calendarWeek").style.display !== "none") {
            renderWeekView();
        }
    };

    function renderTodayEvents(day) {
    const container = document.getElementById("todayEvents");
    const allEvents = eventsDb.filter(e => e.day === day && e.month === (selectedMonth + 1));
    allEvents.sort((a, b) => a.time.localeCompare(b.time));
    if (allEvents.length === 0) {
        container.innerHTML = "<div class='text-muted'>No events.</div>";
        return;
    }

    // Clear container first
    container.innerHTML = '';

    allEvents.forEach((evt, idx) => {
        const dormitory = evt.dormitory || '-';
        const room = evt.room ? `Room ${evt.room}` : '';
        const location = room ? `${dormitory} - ${room}` : dormitory;

        // Create event element
        const eventDiv = document.createElement('div');
        eventDiv.className = "mb-2 p-2 border-start border-3 border-primary bg-light event-today-item";
        eventDiv.style.cursor = "pointer";
        eventDiv.style.color = "#212529";

        // Build event inner html
        eventDiv.innerHTML = `
            <div><strong>${evt.time || 'N/A'}</strong></div>
            <div>${evt.reporter_name || ''}</div>
            <div>${location}</div>
            <div>${evt.item || '-'}</div>
        `;

        // Attach click event for popup
        eventDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            window.showEventDetails(evt);
        });

        container.appendChild(eventDiv);
    });
}

    function getStartOfWeek(date) {
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.getFullYear(), date.getMonth(), diff);
    }

    window.changeWeek = function (offset) {
        currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
        renderWeekView();
    };

    function renderWeekView() {
        const weekBody = document.getElementById("weekCalendarBody");
        weekBody.innerHTML = "";

        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(currentWeekStart);
            day.setDate(currentWeekStart.getDate() + i);
            days.push(day);

            const dayHeader = document.getElementById(`week${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}`);
            dayHeader.innerHTML = `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}<br><span class="date-badge badge bg-secondary">${day.getDate()}/${day.getMonth() + 1}</span>`;
        }

        const hours = [];
        for (let h = 8; h <= 17; h++) {
            hours.push(`${String(h).padStart(2, '0')}:00`);
        }

        hours.forEach(hour => {
            const row = document.createElement("tr");
            const timeCell = document.createElement("td");
            timeCell.textContent = hour;
            timeCell.style.fontWeight = "600";
            timeCell.style.background = "#f8f9fa";
            row.appendChild(timeCell);

            const hourSlot = parseInt(hour.split(':')[0]);

            for (let i = 0; i < 7; i++) {
                const cell = document.createElement("td");
                cell.className = "calendar-cell";
                cell.style.color = "#000";
                cell.style.background = "#fff";
                const day = days[i];
                const events = eventsDb
                    .filter(evt =>
                        evt.day === day.getDate() &&
                        evt.month === (day.getMonth() + 1) &&
                        evt.year === day.getFullYear() &&
                        evt.time && parseInt(evt.time.split(':')[0]) === hourSlot
                    );

                if (events.length > 0) {
                    cell.classList.add("has-events");
                    events.forEach(evt => {
                        const eventDiv = document.createElement("div");
                        eventDiv.className = "event-item";
                        eventDiv.style.color = "#000";
                        eventDiv.style.background = "#f8f9fa";
                        eventDiv.style.borderLeft = "3px solid #0d6efd";
                        eventDiv.style.padding = "5px";
                        eventDiv.style.margin = "2px 0";
                        eventDiv.style.borderRadius = "3px";

                        eventDiv.innerHTML = `
                            <div><strong>${evt.time}</strong></div>
                            <div>${evt.reporter_name || ""}</div>
                            <div>${evt.dormitory} ${evt.room ? ' - ' + evt.room : ''}</div>
                            <div>${evt.item}</div>
                        `;
                        eventDiv.addEventListener('click', (e) => {
                            e.stopPropagation();
                            showEventDetails(evt);
                        });
                        cell.appendChild(eventDiv);
                    });
                }
                row.appendChild(cell);
            }
            weekBody.appendChild(row);
        });

        const weekRange = document.getElementById("weekRange");
        const start = days[0];
        const end = days[6];
        weekRange.innerText = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
    }

  window.showEventDetails = function (eventData) {
    const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));

    // Format the date
    const eventDate = new Date(eventData.year, eventData.month - 1, eventData.day);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    // Update modal content
    document.getElementById('eventDate').textContent = formattedDate;
    document.getElementById('eventTime').textContent = eventData.time || 'N/A';

    // Set status to "Confirmed" with appropriate styling
    const statusEl = document.getElementById('eventStatus');
    statusEl.textContent = 'Confirmed';
    statusEl.className = 'badge bg-primary';

    // Update other details with fallback values
    document.getElementById('eventDormitory').textContent = eventData.dormitory || 'N/A';
    document.getElementById('eventRoom').textContent = eventData.room || 'N/A';
    document.getElementById('eventItem').textContent = eventData.item || 'N/A';
    document.getElementById('eventDescription').textContent = eventData.description || 'No additional description provided';
    document.getElementById('eventTechnician').textContent = eventData.assigned_by || "-";
    document.getElementById('eventContact').textContent = eventData.technician_phone || 'N/A';

    // Show the modal
    modal.show();
};

    window.switchView = function (view) {
        if (view === "day") {
            window.location.href = "/tech/calendarday";
            return;
        }
        if (view === "month") {
            window.location.href = "/tech/calendarmonth";
            return;
        }
        document.getElementById("calendarWeek").style.display = view === 'week' ? 'block' : 'none';
        document.getElementById("calendarDay").style.display = view === 'day' ? 'block' : 'none';
        document.getElementById("weekNav").style.display = view === 'week' ? 'flex' : 'none';

        document.querySelectorAll(".tabbar .btn-group .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.tabbar .btn-group .btn[onclick*='${view}']`).classList.add("active");

        if (view === 'week') renderWeekView();
    };

    // Profile & Logout functionality
    document.getElementById('profileLink')?.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = "/tech/profile";
    });

    // Load user info for navbar
    fetch('/user/me')
        .then(res => {
            if (!res.ok) throw new Error("Unauthorized");
            return res.json();
        })
        .then(user => {
            document.getElementById('userName').innerText = user.name || "Technician";
            document.getElementById('userRole').innerText = user.role || "";
        })
        .catch(() => {
            document.getElementById('userName').innerText = "Technician";
            document.getElementById('userRole').innerText = "";
        });

    // Initial render calls
    fetchEventsAndRender();

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
});