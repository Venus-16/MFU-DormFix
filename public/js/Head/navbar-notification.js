(function () {
    if (window.__notiBellInitialized) return;
    window.__notiBellInitialized = true;

    window.notiData = [];
    let currentTab = 'all'; // เริ่มต้นเป็น "ทั้งหมด"

    function fetchNotifications() {
        return fetch('/head/notifications', { credentials: "include" })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                window.notiData = data.map(n => ({
                    notification_id: n.notification_id,
                    icon: getIcon(n.title, n.status),
                    title: n.title,
                    content: n.message,
                    time: formatDateTime(n.created_at),
                    link: n.link,
                    read: !!n.is_read
                }));
            })
            .catch(() => { window.notiData = []; });
    }

    function getIcon(title, status) {
        if (title.includes('New Repair Request')) return "bi-hammer";
        if (title.includes('Completed')) return "bi-check-circle";
        if (title.includes('Cancelled')) return "bi-exclamation-triangle";
        if (title.includes('Updated')) return "bi-pencil-square";
        if (title.includes('Feedback')) return "bi-chat-left-dots";
        return "bi-bell";
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

    window.renderNotifications = function () {
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

        let list = window.notiData;
        if (currentTab === 'unread') list = window.notiData.filter(n => !n.read);

        notiList.innerHTML = "";
        if (!list.length) {
            notiList.innerHTML = `<li class="noti-empty"><i class="bi bi-inbox"></i> You have no notifications</li>`;
            notiCount.style.display = "none";
            return;
        }
        const unreadCount = window.notiData.filter(n => !n.read).length;
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
        setupMarkAllRead();
    }

    function setupTabEvent() {
        const tabAll = document.getElementById('tabAll');
        const tabUnread = document.getElementById('tabUnread');
        if (tabAll && tabUnread) {
            tabAll.onclick = function () {
                currentTab = 'all';
                window.renderNotifications();
            };
            tabUnread.onclick = function () {
                currentTab = 'unread';
                window.renderNotifications();
            };
        }
    }

    function setupMarkAllRead() {
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.onclick = function () {
                fetch('/head/notifications/read-all', {
                    method: 'POST',
                    credentials: 'include'
                }).then(() => {
                    window.notiData.forEach(n => n.read = true);
                    window.renderNotifications();
                });
            };
        }
    }

    function markAsRead(idx, noti) {
        const realIdx = window.notiData.findIndex(n =>
            n.notification_id === noti.notification_id
        );
        if (window.notiData[realIdx] && !window.notiData[realIdx].read) {
            fetch('/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notification_id: noti.notification_id })
            }).then(() => {
                window.notiData[realIdx].read = true;
                window.renderNotifications();
            });
        }
    }

    function setupNotificationBell() {
        const bellBtn = document.getElementById('bellBtn');
        const notiPanel = document.getElementById('notificationPanel');
        const seeAllNoti = document.getElementById('seeAllNoti');
        if (!bellBtn || !notiPanel) return;

        window.renderNotifications();

        let panelOpen = false;
        bellBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            panelOpen = !panelOpen;
            notiPanel.style.display = panelOpen ? "block" : "none";
            if (panelOpen) {
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

    // Modal (see all) เหมือนเดิม
    function renderAllNotificationsModal() {
        const allNotiList = document.getElementById('allNotiList');
        const allNotificationsModal = document.getElementById('allNotificationsModal');
        let list = window.notiData; // always show all!
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
        fetchNotifications().then(setupNotificationBell);
    });
})();