const express = require('express');
const router = express.Router();
const con = require('../config/db'); // ปรับ path ให้ตรง


function addNotification(userId, role, requestId, title, message, link = null) {
    const sql = `
        INSERT INTO notifications (user_id, role, request_id, title, message, link)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    con.query(sql, [userId, role, requestId, title, message, link], (err) => {
        if (err) console.error('Error inserting notification:', err);
    });
}

// GET: ดูหอพักทั้งหมด
router.get('/', (req, res) => {
    con.query('SELECT * FROM dormitory ORDER BY dorm_name ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json(results);
    });
});

// POST: เพิ่มหอพักใหม่
router.post('/add', (req, res) => {
    const { dorm_name, dorm_capacity } = req.body;
    if (!dorm_name || !dorm_capacity) return res.json({ success: false, message: 'Missing fields' });

    // เช็คชื่อซ้ำ (case-insensitive, trim)
    con.query('SELECT dorm_id FROM dormitory WHERE LOWER(TRIM(dorm_name)) = ?', [dorm_name.trim().toLowerCase()], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Dormitory name already exists.' });
        }

        // ถ้าไม่ซ้ำ เพิ่มได้
        con.query('INSERT INTO dormitory (dorm_name, dorm_capacity) VALUES (?, ?)', [dorm_name, dorm_capacity], (err2, result) => {
            if (err2) return res.status(500).json({ success: false, message: err2.message });
            res.json({ success: true, insertId: result.insertId });
        });
    });
});

// PUT: แก้ไขข้อมูลหอพัก
router.put('/:id', (req, res) => {
    const dorm_id = req.params.id;
    const { dorm_name, dorm_capacity } = req.body;
    if (!dorm_name || !dorm_capacity) {
        return res.json({ success: false, message: 'Missing fields' });
    }

    // 1. เช็คชื่อหอซ้ำ (exclude ตัวเอง, case-insensitive)
    con.query("SELECT dorm_id FROM dormitory WHERE LOWER(TRIM(dorm_name)) = ? AND dorm_id != ?", [dorm_name.trim().toLowerCase(), dorm_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (rows.length > 0) {
            return res.status(400).json({ success: false, message: "Dormitory name already exists." });
        }

        // 2. เช็คจำนวนห้อง
        con.query("SELECT COUNT(*) AS room_count FROM rooms WHERE dorm_id = ?", [dorm_id], (err2, countRows) => {
            if (err2) return res.status(500).json({ success: false, message: err2.message });
            const actualRooms = countRows[0].room_count;

            if (parseInt(dorm_capacity) < actualRooms) {
                return res.status(400).json({ success: false, message: `Dorm capacity cannot be less than number of rooms (${actualRooms}).` });
            }

            // ดึงข้อมูลเก่าสำหรับ noti
            con.query("SELECT dorm_name, dorm_capacity FROM dormitory WHERE dorm_id = ?", [dorm_id], (err3, rows2) => {
                if (err3 || rows2.length === 0) return res.status(404).json({ success: false, message: "Dorm not found" });
                const old = rows2[0];

                // update dorm
                con.query(
                    'UPDATE dormitory SET dorm_name = ?, dorm_capacity = ? WHERE dorm_id = ?',
                    [dorm_name, dorm_capacity, dorm_id],
                    (err4) => {
                        if (err4) return res.status(500).json({ success: false, message: err4.message });

                        // 🔔 หา staff ที่ดูแล dorm นี้
                        con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [dorm_id], (err5, staffRows) => {
                            if (!err5 && staffRows.length > 0) {
                                staffRows.forEach(staff => {
                                    let msg;
                                    if (old.dorm_capacity !== dorm_capacity) {
                                        msg = `Dorm ${old.dorm_name} capacity changed from ${old.dorm_capacity} → ${dorm_capacity}.`;
                                    } else if (old.dorm_name !== dorm_name) {
                                        msg = `Dorm name updated: ${old.dorm_name} → ${dorm_name}.`;
                                    } else {
                                        msg = `Dorm ${dorm_name} has been updated.`;
                                    }

                                    addNotification(
                                        staff.user_id,
                                        'staff',
                                        null,
                                        'Dorm Updated',
                                        msg,
                                        null
                                    );
                                });
                            }
                        });

                        res.json({ success: true });
                    }
                );
            });
        });
    });
});

// router.put('/:id', (req, res) => {
//     const dorm_id = req.params.id;
//     const { dorm_name, dorm_capacity } = req.body;
//     if (!dorm_name || !dorm_capacity) return res.json({ success: false, message: 'Missing fields' });
//     con.query('UPDATE dormitory SET dorm_name = ?, dorm_capacity = ? WHERE dorm_id = ?', [dorm_name, dorm_capacity, dorm_id], (err, result) => {
//         if (err) return res.status(500).json({ success: false, message: err.message });
//         res.json({ success: true });
//     });
// });

// DELETE: ลบหอพัก (และลบห้องในหอพักนี้)
router.delete('/:id', (req, res) => {
    const dorm_id = req.params.id;
    // ลบ rooms ก่อน (ถ้ามี foreign key)
    con.query('DELETE FROM rooms WHERE dorm_id = ?', [dorm_id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        // ลบ dormitory
        con.query('DELETE FROM dormitory WHERE dorm_id = ?', [dorm_id], (err2) => {
            if (err2) return res.status(500).json({ success: false, message: err2.message });
            res.json({ success: true });
        });
    });
});

module.exports = router;