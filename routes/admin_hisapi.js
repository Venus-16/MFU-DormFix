const express = require('express');
const router = express.Router();
const con = require('../config/db');

// ดึงรายชื่อหอพัก
router.get('/dormitories', (req, res) => {
    con.query('SELECT dorm_name FROM dormitory ORDER BY dorm_name', (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});
router.get('/repairtypes', (req, res) => {
    con.query("SELECT category_name FROM category ORDER BY category_name ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results.map(r => r.category_name));
    });
});

// ดึงข้อมูล history (completed/cancel) สำหรับ admin (ดูทุกหอ, filter ครบ, field เหมือน staff)
router.get('/history', (req, res) => {
    const dormName = req.query.dormName;
    const date = req.query.date;
    const repairtype = req.query.repairtype;
    const search = req.query.search;

    let query = `
        SELECT
            u.name AS student_name,
            d.dorm_name AS dorm,
            r.room_number,
            rr.article,
            rr.description,
            rr.image,
            c.category_name AS category,
            rr.status,
            rr.request_date,
            rr.repair_date,
            rr.complete_date,
            rr.work_description,
            techu.name AS technician_name,
            t.phone_number AS technician_phone,
            headu.name AS headtech_name,
            fb.rating AS feedback_score,
            fb.comment AS feedback_comment
        FROM repair_requests rr
        JOIN category c ON rr.category_id = c.category_id
        JOIN student s ON rr.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN rooms r ON s.room_id = r.room_id
        JOIN dormitory d ON s.dorm_id = d.dorm_id
        LEFT JOIN technicians t ON rr.technician_id = t.technician_id
        LEFT JOIN users techu ON t.user_id = techu.user_id
        LEFT JOIN technicians headt ON rr.headtech_id = headt.technician_id
        LEFT JOIN users headu ON headt.user_id = headu.user_id
        LEFT JOIN feedback fb ON rr.request_id = fb.request_id
        WHERE rr.status IN ('Completed', 'Cancel')
    `;
    const params = [];

    if (dormName) {
        query += " AND d.dorm_name = ?";
        params.push(dormName);
    }
    if (date) {
        query += " AND DATE(rr.request_date) = ?";
        params.push(date);
    }
    if (repairtype) {
        query += " AND c.category_name = ?";
        params.push(repairtype);
    }
    if (search) {
        query +=
            " AND (u.name LIKE ? OR r.room_number LIKE ? OR rr.article LIKE ? OR rr.description LIKE ? OR techu.name LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += `
        ORDER BY
            CASE WHEN rr.status = 'Completed' THEN rr.complete_date ELSE rr.request_date END DESC
    `;

    con.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error during history fetch.');
        }

        if (!results || results.length === 0) {
            return res.status(404).send('ไม่พบประวัติการแจ้งซ่อมที่เสร็จสิ้นหรือยกเลิก');
        }

        res.json(results);
    });
});

module.exports = router;