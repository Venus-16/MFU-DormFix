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

// ดึงรายชื่อประเภทงานซ่อม
router.get('/categories', (req, res) => {
    con.query('SELECT category_name FROM category ORDER BY category_name', (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

// ดึงข้อมูล schedule งานซ่อม (Confirmed)
router.get('/schedule', (req, res) => {
    const dormName = req.query.dormitory;
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    const category = req.query.category;

    let query = `
        SELECT
            u.name AS student_name,
            d.dorm_name,
            r.room_number,
            rr.article,
            rr.description,
            rr.image,
            c.category_name,
            rr.status,
            rr.request_date,
            rr.repair_date,
            tuser.name AS technician_name,
            t.phone_number
        FROM repair_requests rr
        JOIN student s ON rr.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN rooms r ON rr.room_id = r.room_id
        JOIN dormitory d ON rr.dorm_id = d.dorm_id
        JOIN category c ON rr.category_id = c.category_id
        LEFT JOIN technicians t ON rr.technician_id = t.technician_id
        LEFT JOIN users tuser ON t.user_id = tuser.user_id
        WHERE rr.status = 'Confirmed'
    `;
    const params = [];

    if (dormName) {
        query += ' AND d.dorm_name = ?';
        params.push(dormName);
    }
    if (year && month) {
        query += ' AND YEAR(rr.repair_date) = ? AND MONTH(rr.repair_date) = ?';
        params.push(year, month);
    }
    if (category) {
        query += ' AND c.category_name = ?';
        params.push(category);
    }
    query += ' ORDER BY rr.repair_date ASC';

    con.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

module.exports = router;