// routes/admin_reapi.js
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

// ดึง repair report (pending) แบบเดียวกับสตาฟ
router.get('/reports', (req, res) => {
    // ถ้าต้องการให้เช็ค session เหมือนสตาฟให้เพิ่มบรรทัดนี้
    // const userId = req.session.user_id;
    // if (!userId) return res.status(401).send('Unauthorized');

    const dormName = req.query.dormName;
    const date = req.query.date;
    const search = req.query.search;
    const searchType = req.query.searchType; // 'all', 'article', 'nameroom'
    const repairtype = req.query.repairtype;

    let query = `
        SELECT
            u.name AS student_name,
            d.dorm_name AS dorm,
            r.room_number,
            rr.article,
            rr.description,
            rr.image,
            c.category_name,
            rr.status,
            rr.request_date,
            rr.repair_date,
            rr.complete_date,
            rr.work_description
        FROM users u
        JOIN student s ON u.user_id = s.user_id
        JOIN rooms r ON s.room_id = r.room_id
        JOIN dormitory d ON s.dorm_id = d.dorm_id
        JOIN repair_requests rr ON s.student_id = rr.student_id
        JOIN category c ON rr.category_id = c.category_id
        WHERE rr.status = 'Pending'
    `;
    const params = [];

    if (dormName) {
        query += ` AND d.dorm_name = ?`;
        params.push(dormName);
    }
    if (date) {
        query += " AND DATE(rr.request_date) = ?";
        params.push(date);
    }
    if (repairtype) {
        query += ` AND c.category_name = ?`;
        params.push(repairtype);
    }

    // การค้นหา
    if (search && searchType === 'article') {
        query += ` AND rr.article LIKE ?`;
        params.push(`%${search}%`);
    }
    if (search && searchType === 'nameroom') {
        query += ` AND (u.name LIKE ? OR r.room_number LIKE ? OR s.student_id LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (search && searchType === 'all') {
        query += ` AND (rr.article LIKE ? OR u.name LIKE ? OR r.room_number LIKE ? OR s.student_id LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY rr.request_date DESC";

    con.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error during repair report fetch.');
        }
        res.json(results || []);
    });
});

module.exports = router;
