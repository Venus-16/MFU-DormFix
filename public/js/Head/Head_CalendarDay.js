document.addEventListener('DOMContentLoaded', function () {
    let selectedMonth = new Date().getMonth();
    let selectedYear = new Date().getFullYear();
    let selectedDay = new Date().getDate();
    let selectedCategory = "General";
    let currentViewDay = new Date(selectedYear, selectedMonth, selectedDay);
    let allEvents = [];

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

    // FLATPICKR SETUP
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
                currentViewDay = new Date(selectedYear, selectedMonth, selectedDay);
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
                currentViewDay = new Date(selectedYear, selectedMonth, selectedDay);
                fetchEvents();
            }
            isSyncingPickers = false;
        },
        defaultDate: new Date()
    });

    // FETCH EVENTS FROM BACKEND (Confirmed only)
    async function fetchEvents() {
        try {
            const res = await fetch(`/head/calendar?month=${selectedMonth + 1}&year=${selectedYear}`, { credentials: 'include' });
            const data = await res.json();
            allEvents = Array.isArray(data) ? data : [];
            renderMiniCalendar();
            renderTodayEvents(selectedDay);
            renderDayView();
        } catch (err) {
            allEvents = [];
            renderMiniCalendar();
            renderTodayEvents(selectedDay);
            renderDayView();
        }
    }

    function getEvents(day, month, year, category) {
        return allEvents.filter(e =>
            Number(e.day) === Number(day)
            && Number(e.month) === Number(month)
            && Number(e.year) === Number(year)
            && (!category || e.category === category)
        );
    }

    // CATEGORY BUTTONS
    window.switchCategory = function (category) {
        selectedCategory = category;
        document.querySelectorAll(".category-buttons .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".category-buttons .btn").forEach(btn => {
            if (btn.textContent.trim() === category) btn.classList.add("active");
        });
        renderDayView();
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
        document.querySelectorAll(".mini-date").forEach(el => {
            if (parseInt(el.textContent) === day) {
                el.classList.add("active-date");
            }
        });
        renderTodayEvents(day);
        document.getElementById("todayTitle").innerText = `Events on ${day}/${selectedMonth + 1}/${selectedYear}`;
        renderDayView();
    };

    // TODAY EVENTS (Grouped by category)
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
                // สร้าง div ด้วย createElement + addEventListener จะปลอดภัยที่สุด
                // แต่ใน todayEvents จะสร้างผ่าน innerHTML ดังนั้นแนะนำใช้ data-index แล้วค่อย addEventListener ทีหลัง
                // (ใช้ index ชั่วคราว)
                html += `<div class="mb-2 p-2 border-start border-3 border-${evt.color || 'primary'} bg-light event-today-item"
                    style="cursor: pointer; color: #212529;"
                    data-event-index="${allEvents.indexOf(evt)}">
                    <div><strong>${evt.time || 'N/A'}</strong></div>
                    <div>${evt.technician_name || evt.name || 'N/A'}</div>
                    <div>${location}</div>
                    <div>${evt.item || '-'}</div>
                </div>`;
            });
            html += `</div>`;
        }
        container.innerHTML = html;
        // Add event listener
        container.querySelectorAll('.event-today-item').forEach(div => {
            const idx = parseInt(div.getAttribute('data-event-index'), 10);
            div.addEventListener('click', function () {
                window.showEventDetails(allEvents[idx]);
            });
        });
    }

    // DAY VIEW (Time grid)
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
            // เพิ่ม container สำหรับ events ในแต่ละชั่วโมง
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

            // แยกชั่วโมงจากเวลา (รองรับทั้ง "11" และ "11:00")
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

                // เรียงลำดับ Event ตามเวลา
                hourEvents.sort((a, b) => {
                    const timeA = a.time || '00:00';
                    const timeB = b.time || '00:00';
                    return timeA.localeCompare(timeB);
                });

                // เฉพาะกรณีมีมากกว่า 1 event ให้แบ่งขนาด
                if (hourEvents.length > 1) {
                    hourEvents.forEach(event => {
                        const eventElement = createEventElement(event);
                        eventElement.style.flex = `0 0 calc(${100 / hourEvents.length}% - 8px)`;
                        eventElement.style.maxWidth = `calc(${100 / hourEvents.length}% - 8px)`;
                        container.appendChild(eventElement);
                    });
                } else {
                    // มี event เดียว เต็มแถว
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
        eventDiv.className = `event-item category-${(event.category || '').toLowerCase()}`;
        eventDiv.style.cursor = 'pointer';
        const roomText = event.room && event.room !== '-' ? `Room ${event.room}` : '';
        const locationText = event.dormitory
            ? `${event.dormitory}${roomText ? ' - ' + roomText : ''}`
            : (roomText || '');
        eventDiv.innerHTML = `
            <div class="event-time">${event.time || ''}</div>
            <div class="event-title">${event.technician_name || event.name || ''}</div>
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
        if (!timeString) return null;

        // แยกชั่วโมงจากเวลา (รองรับทั้ง "11" และ "11:00")
        let hour;
        if (timeString.includes(':')) {
            hour = parseInt(timeString.split(':')[0]);
        } else {
            hour = parseInt(timeString);
        }

        // 08 AM = 0, 09 AM = 1, ..., 17 PM = 9
        let rowIndex = hour - 8;

        // ตรวจสอบว่า rowIndex อยู่ในช่วงที่ถูกต้อง
        if (rowIndex >= 0 && rowIndex < hourRows.length) {
            return hourRows[rowIndex];
        }
        return null;
    }

    window.changeDay = function (direction) {
        currentViewDay.setDate(currentViewDay.getDate() + direction);
        selectedDay = currentViewDay.getDate();
        selectedMonth = currentViewDay.getMonth();
        selectedYear = currentViewDay.getFullYear();
        renderMiniCalendar();
        renderDayView();
        renderTodayEvents(selectedDay);
        document.getElementById("todayTitle").innerText = `Events on ${selectedDay}/${selectedMonth + 1}/${selectedYear}`;
    };

    window.switchView = function (view) {
        document.getElementById("calendarDay").style.display = "none";
        if (view === "day") {
            document.getElementById("calendarDay").style.display = "block";
            renderDayView();
        }
        if (view === "week") {
            window.location.href = "/head/calendarweek";
            return;
        }
        if (view === "month") {
            window.location.href = "/head/calendarmonth";
            return;
        }
        document.querySelectorAll(".view-buttons .btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`.view-buttons .btn[onclick*='${view}']`).classList.add("active");
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

    // INIT
    renderMiniCalendar();
    renderTodayEvents(selectedDay);
    renderDayView();
    switchCategory('General');
    fetchEvents();

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
});