(function () {
    if (window.__notiBellInitialized) return;
    window.__notiBellInitialized = true;

    let notiData = [];
    let currentTab = 'all';

    function updateBadgeCount() {
        const notiCount = document.getElementById('notiCount');
        if (!notiCount) return;
        const unreadCount = notiData.filter(n => !n.read).length;
        notiCount.textContent = unreadCount;
        notiCount.style.display = unreadCount ? "inline-block" : "none";
    }


    function fetchNotifications() {
        // Endpoint สำหรับ technician
        return fetch('/tech/notifications', { credentials: "include" })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                notiData = data.map(n => ({
                    notification_id: n.notification_id,
                    icon: getIcon(n.title, n.status),
                    title: n.title,
                    content: n.message,
                    time: formatDateTime(n.created_at),
                    link: n.link,
                    read: !!n.is_read
                }));
            })
            .catch(() => { notiData = []; });
    }

    function getIcon(title, status) {
        if (title?.toLowerCase().includes('assign')) return 'bi-person-check';
        if (title?.toLowerCase().includes('reassign') || title?.toLowerCase().includes('schedule')) return 'bi-pencil-square';
        if (title?.toLowerCase().includes('feedback')) return 'bi-star';
        if (title?.toLowerCase().includes('completed')) return 'bi-check-circle';
        if (title?.toLowerCase().includes('cancel')) return 'bi-exclamation-triangle';
        if (title?.toLowerCase().includes('updated')) return 'bi-pencil-square';
        return 'bi-bell';
    }
    function formatTime(ts) {
        const date = new Date(ts);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 60) return "Just now";
        if (diff < 3600) return Math.floor(diff / 60) + " นาทีที่แล้ว";
        if (diff < 86400) return Math.floor(diff / 3600) + " ชั่วโมงที่แล้ว";
        return date.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);

        // Format: DD/MM/YY HH:mm
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    function renderNotifications() {
        const notiList = document.getElementById('notiList');
        const notiCount = document.getElementById('notiCount');
        const tabAll = document.getElementById('tabAll');
        const tabUnread = document.getElementById('tabUnread');
        if (!notiList || !notiCount || !tabAll || !tabUnread) return;

        // Tab active style
        if (currentTab === 'all') {
            tabAll.classList.add('active');
            tabUnread.classList.remove('active');
        } else {
            tabAll.classList.remove('active');
            tabUnread.classList.add('active');
        }

        let list = notiData;
        if (currentTab === 'unread') list = notiData.filter(n => !n.read);

        notiList.innerHTML = "";
        if (!list.length) {
            notiList.innerHTML = `<li class="noti-empty"><i class="bi bi-inbox"></i>You have no notifications</li>`;
            notiCount.style.display = "none";
            return;
        }
        const unreadCount = notiData.filter(n => !n.read).length;
        notiCount.textContent = unreadCount;
        notiCount.style.display = unreadCount ? "inline-block" : "none";
        list.forEach((noti, idx) => {
            const li = document.createElement('li');
            li.className = noti.read ? "noti-read" : "noti-unread";
            li.innerHTML = `
                <span class="noti-icon bi ${noti.icon}"></span>
                <div class="noti-content">
                    <div class="noti-title">${noti.title}</div>
                    <div class="noti-time">${noti.time}</div>
                    <div style="font-size:0.88rem; color:#666;">${noti.content}</div>
                </div>
                ${!noti.read ? '<span class="dot-unread"></span>' : ''}
            `;
            if (noti.link) {
                li.onclick = () => {
                    markAsRead(idx, noti);
                    window.location.href = noti.link;
                };
            }
            notiList.appendChild(li);
        });
        setupTabEvent();
        setupMarkAllRead(); // Use new function
    }

    function setupTabEvent() {
        const tabAll = document.getElementById('tabAll');
        const tabUnread = document.getElementById('tabUnread');
        if (tabAll && tabUnread) {
            tabAll.onclick = function () {
                currentTab = 'all';
                renderNotifications();
            };
            tabUnread.onclick = function () {
                currentTab = 'unread';
                renderNotifications();
            };
        }
    }

    // เปลี่ยนจาก 3-dot dropdown menu เป็นปุ่ม Mark all as read
    function setupMarkAllRead() {
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.onclick = function () {
                fetch('/tech/notifications/read-all', {
                    method: 'POST',
                    credentials: 'include'
                }).then(() => {
                    notiData.forEach(n => n.read = true);
                    renderNotifications();
                });
            };
        }
    }

    function markAsRead(idx, noti) {
        const realIdx = notiData.findIndex(n =>
            n.notification_id === noti.notification_id
        );
        if (notiData[realIdx] && !notiData[realIdx].read) {
            fetch(`/tech/notifications/read/${noti.notification_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            }).then(() => {
                notiData[realIdx].read = true;
                renderNotifications();
            });
        }
    }

    function setupNotificationBell() {
        const bellBtn = document.getElementById('bellBtn');
        const notiPanel = document.getElementById('notificationPanel');
        const seeAllNoti = document.getElementById('seeAllNoti');
        if (!bellBtn || !notiPanel) return;

        let panelOpen = false;
        bellBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            panelOpen = !panelOpen;
            notiPanel.style.display = panelOpen ? "block" : "none";
            if (panelOpen) {
                // ดึงข้อมูลล่าสุดทุกครั้งที่เปิด panel
                fetchNotifications().then(renderNotifications);
                document.body.addEventListener('click', closePanelOnBody, { once: true });
            }
        });
        function closePanelOnBody(e) {
            if (!notiPanel.contains(e.target) && e.target !== bellBtn) {
                notiPanel.style.display = "none";
                panelOpen = false;
            }
        }
        if (seeAllNoti) {
            seeAllNoti.onclick = function (e) {
                e.preventDefault();
                renderAllNotificationsModal();
            }
        }
    }

    // Modal (see all)
    function renderAllNotificationsModal() {
        const allNotiList = document.getElementById('allNotiList');
        const allNotificationsModal = document.getElementById('allNotificationsModal');
        let list = notiData; // always show all!
        if (!allNotiList) return;
        allNotiList.innerHTML = "";
        if (!list.length) {
            allNotiList.innerHTML = `<li class="list-group-item text-center text-muted"><i class="bi bi-inbox"></i> You have no notifications</li>`;
        } else {
            list.forEach((noti, idx) => {
                const li = document.createElement('li');
                li.className = `list-group-item d-flex align-items-start ${noti.read ? 'noti-read' : 'noti-unread'}`;
                li.style.cursor = "pointer";
                li.innerHTML = `
                    <span class="noti-icon bi ${noti.icon} me-3"></span>
                    <div>
                        <div class="fw-semibold">${noti.title} ${!noti.read ? '<span class="dot-unread"></span>' : ''}</div>
                        <div class="text-muted small">${noti.time}</div>
                        <div style="font-size:0.95rem; color:#666;">${noti.content}</div>
                    </div>
                `;
                if (noti.link) {
                    li.onclick = () => {
                        markAsRead(idx, noti);
                        li.classList.remove('noti-unread');
                        li.classList.add('noti-read');
                        window.location.href = noti.link;
                    }
                }
                allNotiList.appendChild(li);
            });
        }
        if (allNotificationsModal) {
            const modal = new bootstrap.Modal(allNotificationsModal);
            modal.show();
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        fetchNotifications().then(() => {
            updateBadgeCount();   // show count right after login
            setupNotificationBell();
        });
    });
})();