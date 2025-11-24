const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const con = require('../config/db');

const upload = multer({ storage: multer.memoryStorage() });

function addNotification(userId, role, requestId, title, message, link = null) {
    const sql = `
        INSERT INTO notifications (user_id, role, request_id, title, message, link)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    con.query(sql, [userId, role, requestId, title, message, link], (err) => {
        if (err) console.error('Error inserting notification:', err);
    });
}

// GET: technician list (JOIN users/category)
router.get('/', (req, res) => {
    const sql = `
      SELECT t.technician_id, u.name, u.email, t.phone_number, t.job_position, c.category_name, u.status
      FROM technicians t
      JOIN users u ON t.user_id = u.user_id
      JOIN category c ON t.category_id = c.category_id
    `;
    con.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        const formatted = results.map(t => ({
            technician_id: t.technician_id,
            email: t.email,
            name: t.name,
            po: t.job_position,
            cat: t.category_name,
            phone: t.phone_number,
            status: t.status
        }));
        res.json(formatted);
    });
});

// POST: Add technician (status=1, re-enable if disabled, reset password to NULL)
router.post('/', (req, res) => {
    const { name, email, po, cat, phone } = req.body;
    con.query('SELECT category_id FROM category WHERE category_name = ?', [cat], (err, catRows) => {
        if (err || catRows.length === 0) return res.json({ success: false, message: "Category not found" });
        const category_id = catRows[0].category_id;
        // ตรวจสอบ email ใน users
        con.query("SELECT u.user_id, u.status, t.technician_id FROM users u LEFT JOIN technicians t ON u.user_id = t.user_id WHERE u.email = ?", [email], (err2, rows) => {
            if (err2) return res.json({ success: false, message: err2.message });

            const afterAddTech = (techName) => {
                // 🔔 Notify Head Technician
                con.query(`
                    SELECT user_id 
                    FROM technicians 
                    WHERE job_position LIKE '%Head%' AND category_id = ?
                `, [category_id], (errH, headRows) => {
                    if (!errH && headRows.length > 0) {
                        headRows.forEach(head => {
                            addNotification(
                                head.user_id,
                                'headtech',
                                null,
                                'New Technician Added',
                                `A new technician "${techName}" has been added to your category.`,
                                null
                            );
                        });
                    }
                });
            };

            if (rows.length > 0) {
                const exist = rows[0];
                if (exist.status == 1) {
                    return res.json({ success: false, message: "This email is already active in the system." });
                }
                // ถ้า status=0 (disable) ให้ update users/status=1, password=NULL และ technicians
                con.query("UPDATE users SET name=?, password=NULL, status=1 WHERE user_id=?", [name, exist.user_id], (err3) => {
                    if (err3) return res.json({ success: false, message: err3.message });
                    // update technicians
                    if (exist.technician_id) {
                        con.query("UPDATE technicians SET phone_number=?, job_position=?, category_id=? WHERE technician_id=?", [phone, po, category_id, exist.technician_id], (err4) => {
                            if (err4) return res.json({ success: false, message: err4.message });
                            afterAddTech(name);
                            res.json({ success: true, message: "Re-enabled technician, updated info, and reset password to NULL." });
                        });
                    } else {
                        // ถ้าไม่มี technicians record ให้ insert ใหม่
                        con.query("INSERT INTO technicians (phone_number, job_position, category_id, user_id) VALUES (?, ?, ?, ?)", [phone, po, category_id, exist.user_id], (err5) => {
                            if (err5) return res.json({ success: false, message: err5.message });
                            afterAddTech(name);
                            res.json({ success: true, message: "Re-enabled technician, created record, and reset password to NULL." });
                        });
                    }
                });
            } else {
                // ไม่มีซ้ำ สร้างใหม่ (password=NULL)
                con.query("INSERT INTO users (name, email, password, status) VALUES (?, ?, NULL, 1)", [name, email], (err6, userRes) => {
                    if (err6) return res.json({ success: false, message: err6.message });
                    const user_id = userRes.insertId;
                    con.query("INSERT INTO technicians (phone_number, job_position, category_id, user_id) VALUES (?, ?, ?, ?)",
                        [phone, po, category_id, user_id], (err7) => {
                            if (err7) return res.json({ success: false, message: err7.message });
                            afterAddTech(name);
                            res.json({ success: true });
                        });
                });
            }
        });
    });
});

// PUT: Edit technician (by email)
router.put('/:email', (req, res) => {
    const email = decodeURIComponent(req.params.email);
    const { name, po, cat, phone } = req.body;
    con.query("SELECT u.user_id, t.technician_id FROM users u JOIN technicians t ON u.user_id = t.user_id WHERE u.email = ?", [email], (err, rows) => {
        if (err || rows.length === 0) return res.json({ success: false, message: "Technician not found" });
        const user_id = rows[0].user_id;
        const technician_id = rows[0].technician_id;
        con.query("SELECT category_id FROM category WHERE category_name = ?", [cat], (err2, catRows) => {
            if (err2 || catRows.length === 0) return res.json({ success: false, message: "Category not found" });
            const category_id = catRows[0].category_id;
            con.query("UPDATE users SET name = ? WHERE user_id = ?", [name, user_id], (err3) => {
                if (err3) return res.json({ success: false, message: err3.message });
                con.query("UPDATE technicians SET phone_number = ?, job_position = ?, category_id = ? WHERE technician_id = ?",
                    [phone, po, category_id, technician_id], (err4) => {
                        if (err4) return res.json({ success: false, message: err4.message });
                        // 🔔 Notify Head Technician (ใน category เดียวกัน)
                        con.query(`SELECT user_id FROM technicians WHERE job_position LIKE '%Head%' AND category_id = ?`,
                            [category_id], (err5, headRows) => {
                                if (!err5 && headRows.length > 0) {
                                    headRows.forEach(head => {
                                        addNotification(
                                            head.user_id,
                                            'headtech',
                                            null,
                                            'Technician Updated',
                                            `Technician "${name}" has been updated in your category.`,
                                            null
                                        );
                                    });
                                }
                            });

                        res.json({ success: true });
                    });
            });
        });
    });
});
// DELETE: Technician (by email) (disable user)
router.delete('/:email', (req, res) => {
    const email = decodeURIComponent(req.params.email);

    con.query("SELECT u.user_id, t.technician_id, t.category_id, u.name FROM users u JOIN technicians t ON u.user_id = t.user_id WHERE u.email = ?", [email], (err, rows) => {
        if (err || rows.length === 0) return res.json({ success: false, message: "Technician not found" });

        const user_id = rows[0].user_id;
        const category_id = rows[0].category_id;
        const techName = rows[0].name;

        // disable user
        con.query("UPDATE users SET status = 0 WHERE user_id = ?", [user_id], (err2) => {
            if (err2) return res.json({ success: false, message: err2.message });

            // 🔔 Notify Head Technician (ใน category เดียวกัน)
            con.query(`SELECT user_id FROM technicians WHERE job_position LIKE '%Head%' AND category_id = ?`,
                [category_id], (err3, headRows) => {
                    if (!err3 && headRows.length > 0) {
                        headRows.forEach(head => {
                            addNotification(
                                head.user_id,
                                'headtech',
                                null,
                                'Technician Removed',
                                `Technician "${techName}" has been removed from your category.`,
                                null
                            );
                        });
                    }
                });

            res.json({ success: true });
        });
    });
});

// DELETE: All technicians (disable all users)
router.delete('/all', (req, res) => {
    con.query("SELECT user_id FROM technicians", (err, rows) => {
        if (err) return res.json({ success: false, message: err.message });
        const userIds = rows.map(r => r.user_id);
        if (userIds.length > 0) {
            con.query("UPDATE users SET status = 0 WHERE user_id IN (?)", [userIds], (err2) => {
                if (err2) return res.json({ success: false, message: err2.message });

                // 🔔 Notify Head Technician(s) of each category
                const catMap = {};
                rows.forEach(r => {
                    if (!catMap[r.category_id]) catMap[r.category_id] = [];
                    catMap[r.category_id].push(r.name);
                });

                Object.entries(catMap).forEach(([category_id, techNames]) => {
                    con.query("SELECT user_id FROM technicians WHERE job_position LIKE '%Head%' AND category_id = ?", [category_id], (errH, headRows) => {
                        if (!errH && headRows.length > 0) {
                            headRows.forEach(head => {
                                addNotification(
                                    head.user_id,
                                    'headtech',
                                    null,
                                    'Technicians Disabled',
                                    `Technicians "${techNames.join(', ')}" have been disabled in your category.`,
                                    null
                                );
                            });
                        }
                    });
                });

                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// POST: Import technician Excel file (status=1, enable/update if disabled, reset password to NULL, skip active)
router.post('/import', upload.single('techFile'), async (req, res) => {
    if (!req.file) return res.json({ success: false, message: "No file uploaded" });
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const categories = await new Promise((resolve, reject) =>
            con.query("SELECT * FROM category", (err, crows) => err ? reject(err) : resolve(crows))
        );
        const allTechs = await new Promise((resolve, reject) =>
            con.query("SELECT u.user_id, u.email, u.status, t.technician_id FROM users u LEFT JOIN technicians t ON u.user_id = t.user_id", (err, rows) => err ? reject(err) : resolve(rows))
        );

        let importedList = [];
        let failedRows = [];

        for (const tech of rows) {
            const catObj = categories.find(x =>
                x.category_name.trim().toLowerCase() === (tech['Category'] || '').trim().toLowerCase() ||
                (x.category_name.trim().toLowerCase() === 'air conditioning' && (tech['Category'] || '').trim().toLowerCase() === 'air')
            );
            if (!catObj) {
                failedRows.push(`Category not found for technician ${tech['Email']}`);
                continue;
            }
            const name = (tech['Name'] || '').trim();
            const email = (tech['Email'] || '').trim();
            const po = (tech['Job Position'] || '').trim();
            const phone = (tech['Phone'] || '').trim();
            const category_id = catObj.category_id;

            const exist = allTechs.find(s => s.email === email);
            if (exist) {
                if (exist.status == 1) {
                    failedRows.push(`Technician ${email} is already active`);
                    continue;
                }
                await new Promise((resolve, reject) =>
                    con.query("UPDATE users SET name=?, password=NULL, status=1 WHERE user_id=?", [name, exist.user_id], (err) => err ? reject(err) : resolve())
                );
                if (exist.technician_id) {
                    await new Promise((resolve, reject) =>
                        con.query("UPDATE technicians SET phone_number=?, job_position=?, category_id=? WHERE technician_id=?", [phone, po, catObj.category_id, exist.technician_id], (err) => err ? reject(err) : resolve())
                    );
                } else {
                    await new Promise((resolve, reject) =>
                        con.query("INSERT INTO technicians (phone_number, job_position, category_id, user_id) VALUES (?, ?, ?, ?)", [phone, po, catObj.category_id, exist.user_id], (err) => err ? reject(err) : resolve())
                    );
                }
                importedList.push({ email, name, po, cat: catObj.category_name });
            } else {
                const userResult = await new Promise((resolve, reject) =>
                    con.query("INSERT INTO users (name, email, password, status) VALUES (?, ?, NULL, 1)", [name, email], (err, result) => err ? reject(err) : resolve(result))
                );
                const user_id = userResult.insertId;
                await new Promise((resolve, reject) =>
                    con.query("INSERT INTO technicians (phone_number, job_position, category_id, user_id) VALUES (?, ?, ?, ?)",
                        [phone, po, catObj.category_id, user_id],
                        (err) => err ? reject(err) : resolve()
                    )
                );
                importedList.push({ email, name, po, cat: catObj.category_name });
            }
        }
        let message = `Imported: ${importedList.length} technician(s).`;
        if (failedRows.length) message += ` Skipped: ${failedRows.join("; ")}`;
        res.json({ success: true, message, importedList, failedRows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Import error: " + err.message });
    }
});

module.exports = router;