document.addEventListener("DOMContentLoaded", function () {
    // Fetch technician's events from backend
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let lastSelectedDay = null;
    let eventsDb = [];

    // Setup month/year picker
    flatpickr("#monthYearPicker", {
        plugins: [
            new monthSelectPlugin({
                shorthand: true,
                dateFormat: "F Y",
                altFormat: "F Y"
            })
        ],
        onChange: function (selectedDates) {
            const date = selectedDates[0];
            if (date) {
                selectedMonth = date.getMonth();
                selectedYear = date.getFullYear();
                fetchEventsAndRender();
            }
        },
        defaultDate: new Date()
    });

    function fetchEventsAndRender() {
        fetch(`/tech/calendar/data?month=${selectedMonth + 1}&year=${selectedYear}`)
            .then(res => res.json())
            .then(events => {
                eventsDb = Array.isArray(events) ? events : [];
                renderCalendar();
            })
            .catch(() => {
                eventsDb = [];
                renderCalendar();
            });
    }

    function renderCalendar() {
        const calendarMonth = document.getElementById("calendarMonth");
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
            const currentDate = new Date(selectedYear, selectedMonth, d);
            const dayOfWeek = currentDate.getDay();
            let events = eventsDb.filter(e => e.day === d && e.month === (selectedMonth + 1));
            let holidayClass = dayOfWeek === 0 ? 'holiday' : '';

            // เรียง events ตามเวลา (ascending)
            const sortedEvents = [...events].sort((a, b) => {
                const t1 = (a.time || "").padStart(5, "0");
                const t2 = (b.time || "").padStart(5, "0");
                return t1.localeCompare(t2);
            });

            let html = `<div class='calendar-day ${holidayClass}' data-day="${d}">`;
            html += `<div class='date-number'>${d}</div>`;

            // Show up to maxShow events, then show "+N more"
            const maxShow = 3;
            sortedEvents.slice(0, maxShow).forEach((evt, idx) => {
                const location = `${evt.dormitory || ''}${evt.room ? ' - ' + evt.room : ''}`;
                html += `
            <div class='event ${evt.color || ""}' 
                data-idx="${idx}" data-day="${d}">
                <div class="event-time"><strong>${evt.time || ""}</strong></div>
                <div class="event-title">${evt.reporter_name || evt.technician_name || evt.name || ""}</div>
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

        // Bind bubble event click and "more" event click, after DOM update
        setTimeout(() => {
            document.querySelectorAll('.calendar-day .event').forEach(el => {
                el.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const day = parseInt(this.dataset.day, 10);
                    const idx = parseInt(this.dataset.idx, 10);
                    const events = eventsDb.filter(e => e.day === day && e.month === (selectedMonth + 1));
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

   function renderTodayEvents(day) {
    const container = document.getElementById("todayEvents");
    const allEvents = eventsDb.filter(e => e.day === day && e.month === (selectedMonth + 1));
    if (allEvents.length === 0) {
        container.innerHTML = "<div class='text-muted'>No events.</div>";
        return;
    }
    // Group by category
    const eventsByCategory = {};
    allEvents.forEach(evt => {
        if (!eventsByCategory[evt.category]) {
            eventsByCategory[evt.category] = [];
        }
        eventsByCategory[evt.category].push(evt);
    });

    // Clear container first
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
            const location = `${evt.dormitory || ''}${evt.room ? ' - ' + evt.room : ''}`;
            const eventDiv = document.createElement("div");
            eventDiv.className = `mb-2 p-2 border-start border-3 border-${evt.color || 'secondary'} bg-light event-today-item`;
            eventDiv.style.cursor = "pointer";
            eventDiv.innerHTML = `
                <div><strong>${evt.time || ""}</strong></div>
                <div>${evt.reporter_name || evt.technician_name || evt.name || ""}</div>
                <div>${location}</div>
                <div>${evt.item || evt.article || ""}</div>
            `;
            // Bind popup event
            eventDiv.addEventListener('click', function(e) {
                e.stopPropagation();
                window.showEventDetails(evt);
            });
            container.appendChild(eventDiv);
        });
    }
}
    // Show all events popup (like Head)
    window.showAllEventsPopup = function (day) {
        const allEvents = eventsDb.filter(e => e.day === day && e.month === (selectedMonth + 1));

        // จัดเรียงเวลา ascending
        const sortedEvents = [...allEvents].sort((a, b) => {
            const t1 = (a.time || "").padStart(5, "0");
            const t2 = (b.time || "").padStart(5, "0");
            return t1.localeCompare(t2);
        });

        const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
        const modalLabel = document.getElementById('eventDetailsModalLabel');
        const modalBody = document.querySelector('#eventDetailsModal .modal-body');

        // เปลี่ยน Title ของ Modal
        modalLabel.innerHTML = `<i class="bi bi-calendar-event me-2"></i>Events on ${day}/${selectedMonth + 1}/${selectedYear}`;

        // สร้างเนื้อหาใหม่
        if (sortedEvents.length === 0) {
            modalBody.innerHTML = `<div class="text-muted">No events found</div>`;
        } else {
            modalBody.innerHTML = `
            <div class="list-group">
                ${sortedEvents.map(evt => {
                const dormitory = evt.dormitory || 'N/A';
                const room = evt.room ? ` - ${evt.room}` : '';
                const item = evt.item || evt.article || 'N/A';
                const tech = evt.technician_name || evt.reporter_name || evt.name || '';
                return `
                        <button type="button" class="list-group-item list-group-item-action">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${evt.time || ''} - ${item}</h6>
                                <small class="text-muted">${evt.category || 'General'}</small>
                            </div>
                            <p class="mb-1">${dormitory}${room}</p>
                            <small>Technician: ${tech}</small>
                        </button>
                    `;
            }).join('')}
            </div>
        `;

            // bind click event ให้แต่ละปุ่มเพื่อเปิดรายละเอียดจริง
            modalBody.querySelectorAll('.list-group-item').forEach((el, i) => {
                el.addEventListener('click', () => {
                    modal.hide(); // ปิด popup list
                    showEventDetails(sortedEvents[i]); // เปิดรายละเอียดจริง
                });
            });
        } modal.show();
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
        if (document.getElementById('eventCategory')) {
            document.getElementById('eventCategory').textContent = eventData.category;
            document.getElementById('eventCategory').className = `badge bg-${getCategoryColorClass(eventData.category)}`;
        }
        document.getElementById('eventDormitory').textContent = eventData.dormitory;
        document.getElementById('eventRoom').textContent = eventData.room;
        document.getElementById('eventItem').textContent = eventData.item || eventData.article || '';
        document.getElementById('eventDescription').textContent = eventData.description || 'No additional description provided';
      document.getElementById('eventTechnician').textContent = eventData.assigned_by || "-";
        document.getElementById('eventContact').textContent = eventData.technician_phone || 'N/A';

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

    // Profile & Logout functionality
    document.getElementById('profileLink')?.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = "/tech/profile";
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

    // Sidebar & tabbar actions (unchanged)
    setTimeout(() => {
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll('.sidebar .menu li a');
        links.forEach(link => {
            if (link.pathname === currentPath) {
                link.parentElement.classList.add('active');
            }
        });
    }, 100);

    document.getElementById('toggleSidebar').addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('show');
    });
    window.switchView = function (view) {
        if (view === "week") {
            window.location.href = "/tech/calendarweek";
            return;
        }
        if (view === "day") {
            window.location.href = "/tech/calendarday";
            return;
        }
        document.querySelectorAll(".view-buttons .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.view-buttons .btn[onclick*='${view}']`).classList.add("active");
        document.getElementById("calendarDay").style.display = "none";
        document.getElementById("calendarWeek").style.display = "none";
        document.getElementById("calendarMonth").style.display = "none";
        if (view === "day") {
            document.getElementById("calendarDay").style.display = "block";
        } else if (view === "month") {
            document.getElementById("calendarMonth").style.display = "grid";
        }
    };
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

    // Initial fetch and render
    fetchEventsAndRender();
    window.renderCalendar = renderCalendar;
});