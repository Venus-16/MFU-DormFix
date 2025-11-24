// Head_CalendarWeek.js

document.addEventListener('DOMContentLoaded', function () {
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let selectedCategory = "General";
    let flatpickr1 = null;
    let flatpickr2 = null;
    let isSyncingPickers = false;
    let allEvents = [];
    let currentWeekStart = getStartOfWeek(new Date());

    // USER INFO & LOGOUT 
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
    document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });

    // FETCH EVENTS
    async function fetchEvents() {
        try {
            const res = await fetch(`/head/calendar?month=${selectedMonth + 1}&year=${selectedYear}`, { credentials: 'include' });
            const data = await res.json();
            allEvents = Array.isArray(data) ? data : [];
            renderMiniCalendar();
            renderTodayEvents(new Date().getDate());
            renderWeekView();
        } catch (err) {
            allEvents = [];
            renderMiniCalendar();
            renderTodayEvents(new Date().getDate());
            renderWeekView();
        }
    }
    function getEvents(day, month, year, category) {
        return allEvents.filter(e =>
            Number(e.day) === Number(day)
            && Number(e.month) === Number(month)
            && Number(e.year) === Number(year)
            && (category ? e.category === category : true)
        );
    }

    // FLATPICKR
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
                currentWeekStart = getStartOfWeek(new Date(selectedYear, selectedMonth, 1));
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
            if (selectedDates[0]) {
                selectedMonth = selectedDates[0].getMonth();
                selectedYear = selectedDates[0].getFullYear();
                flatpickr1.setDate(selectedDates[0], true);
                currentWeekStart = getStartOfWeek(new Date(selectedYear, selectedMonth, 1));
                fetchEvents();
            }
            isSyncingPickers = false;
        },
        defaultDate: new Date()
    });

    // CATEGORY BUTTONS
    window.switchCategory = function (category) {
        selectedCategory = category;
        document.querySelectorAll(".category-buttons .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".category-buttons .btn").forEach(btn => {
            if (btn.textContent.trim() === category) btn.classList.add("active");
        });
        renderWeekView();
    };

    // MINI CALENDAR 
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
        renderWeekView();
    };

    // TODAY EVENTS 
    function renderTodayEvents(day) {
        const container = document.getElementById("todayEvents");
        const dayEvents = getEvents(day, selectedMonth + 1, selectedYear);
        allEvents.sort((a, b) => a.time.localeCompare(b.time));
        if (dayEvents.length === 0) {
            container.innerHTML = "<div class='text-muted'>No events.</div>";
            return;
        }
        const eventsByCategory = {};
        dayEvents.forEach(evt => {
            if (!eventsByCategory[evt.category]) {
                eventsByCategory[evt.category] = [];
            }
            eventsByCategory[evt.category].push(evt);
        });

        let html = "";
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
                <h6 class="text-uppercase small d-flex align-items-center">
                    <span class="badge bg-${categoryColors[category] || 'secondary'} me-2">${category}</span>
                    <span>${events.length} events</span>
                </h6>`;
            events.forEach(evt => {
                const dormitory = evt.dormitory || evt.place || '-';
                const room = (evt.room && evt.room !== '-') ? `Room ${evt.room}` : '';
                const location = room ? `${dormitory} - ${room}` : dormitory;

                // <<<< เปลี่ยนจาก onclick เป็น addEventListener ด้านล่าง
                // html += `... onclick='showEventDetails(...)' ...`
                html += `<div class="mb-2 p-2 border-start border-3 border-${evt.color || 'primary'} bg-light event-today-item"
                    style="cursor: pointer; color: #212529;"
                    data-evt='${JSON.stringify(evt).replace(/'/g, "&apos;")}'>
                    <div><strong>${evt.time || 'N/A'}</strong></div>
                    <div>${evt.technician_name || evt.name || 'N/A'}</div>
                    <div>${location}</div>
                    <div>${evt.item || '-'}</div>
                </div>`;
            });
            html += `</div>`;
        }
        container.innerHTML = html;
        // Add event listener safely
        container.querySelectorAll('.event-today-item').forEach(div => {
            const evt = JSON.parse(div.getAttribute('data-evt').replace(/&apos;/g, "'"));
            div.addEventListener('click', function () {
                window.showEventDetails(evt);
            });
        });
    }

    // WEEK VIEW
    function renderWeekView() {
        const weekBody = document.getElementById("weekCalendarBody");
        weekBody.innerHTML = "";

        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(currentWeekStart);
            day.setDate(currentWeekStart.getDate() + i);
            days.push(day);

            const dayHeader = document.getElementById(`week${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}`);
            if (dayHeader) {
                dayHeader.innerHTML = `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}<br><span class="date-badge badge bg-secondary">${day.getDate()}/${day.getMonth() + 1}</span>`;
            }
        }

        const hours = [];
        for (let h = 8; h <= 17; h++) {
            hours.push(`${String(h).padStart(2, '0')}:00`);
        }

        // สีพื้นหลังแต่ละ category
        const bgColorMap = {
            "General": "#eaf7ff",
            "Furniture": "#fff8e1",
            "Electrical": "#e6f7fa",
            "Plumbing": "#e9fbe7",
            "Air Conditioning": "#ffeaea",
            "Air": "#ffeaea"
        };
        // สีขอบแต่ละ category
        const borderColorMap = {
            "General": "#2196f3",
            "Furniture": "#ffb300",
            "Electrical": "#00bcd4",
            "Plumbing": "#43a047",
            "Air Conditioning": "#e53935",
            "Air": "#e53935"
        };

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
                const day = days[i];
                // กรองเฉพาะ category ที่เลือก
                const events = getEvents(day.getDate(), day.getMonth() + 1, day.getFullYear(), selectedCategory)
                    .filter(evt => {
                        if (!evt.time) return false;
                        const eventStartHour = parseInt(evt.time.split(':')[0]);
                        return eventStartHour === hourSlot;
                    });

                if (events.length > 0) {
                    cell.classList.add("has-events");
                    events.forEach(evt => {
                        // รูปแบบ event
                        const techName = evt.technician_name || evt.name || 'N/A';
                        const dorm = evt.dormitory || '-';
                        const room = evt.room || '-';
                        const location = `${dorm} - ${room}`;
                        const item = evt.item || evt.article || '';
                        const bgColor = bgColorMap[evt.category] || "#f5f5f5";
                        const borderColor = borderColorMap[evt.category] || "#bdbdbd";
                        // ***** ใช้ createElement แทน innerHTML+onclick! *****
                        const eventDiv = document.createElement('div');
                        eventDiv.className = "event-item";
                        eventDiv.style.textAlign = "left";
                        eventDiv.style.marginBottom = "8px";
                        eventDiv.style.cursor = "pointer";
                        eventDiv.style.borderRadius = "8px";
                        eventDiv.style.background = bgColor;
                        eventDiv.style.border = `2px solid ${borderColor}`;
                        eventDiv.style.color = "#222";
                        eventDiv.style.padding = "8px 12px";
                        eventDiv.innerHTML = `
                            <div style="font-weight:bold; color:#0d6efd;">${evt.time || 'N/A'}</div>
                            <div style="color:#222;">${techName}</div>
                            <div style="color:#222;">${location}</div>
                            <div style="color:#222;">${item}</div>
                        `;
                        eventDiv.addEventListener('click', function () {
                            window.showEventDetails(evt);
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

    function getStartOfWeek(date) {
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.getFullYear(), date.getMonth(), diff);
    }

    window.changeWeek = function (offset) {
        currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
        renderWeekView();
    };

    window.switchView = function (view) {
        if (view === "day") {
            window.location.href = "/head/calendarday";
            return;
        }
        if (view === "month") {
            window.location.href = "/head/calendarmonth";
            return;
        }
        document.getElementById("calendarWeek").style.display = view === 'week' ? 'block' : 'none';
        document.getElementById("calendarDay").style.display = view === 'day' ? 'block' : 'none';
        document.getElementById("weekNav").style.display = view === 'week' ? 'flex' : 'none';

        document.querySelectorAll(".tabbar .btn-group .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.tabbar .btn-group .btn[onclick*='${view}']`).classList.add("active");

        if (view === 'week') renderWeekView();
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
        document.getElementById('eventTime').textContent = eventData.time || 'N/A';
        const statusEl = document.getElementById('eventStatus');
        statusEl.textContent = eventData.status || 'Confirmed';
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

    renderMiniCalendar();
    renderTodayEvents(new Date().getDate());
    renderWeekView();
    switchCategory('General');
    fetchEvents();

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
});