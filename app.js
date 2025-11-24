const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const con = require('./config/db');
const app = express();
const XLSX = require('xlsx');



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static('public/uploads'));



app.use(session({
    secret: 'dormfix-secret-key',
    resave: false,
    saveUninitialized: true
}));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // ✅ 2MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype;

        if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG and PNG images are allowed!"));
        }
    }
});



app.get('/login', function (req, res) {
    res.sendFile(__dirname + '/views/login.html');
});

app.get('/set_password', (req, res) => {
    res.sendFile(__dirname + '/views/set_password.html');
});


app.post('/loggingin', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = ?`;
    con.query(query, [email], async (err, results) => {
        if (err) return res.status(500).send('Database error');
        if (results.length === 0) return res.status(401).send('User not found');

        const user = results[0];

        if (user.status === 0) {
            return res.status(403).send('Your account is disabled. Please contact the administrator.');
        }


        if (user.password === null) {
            req.session.tempUserId = user.user_id;
            return res.redirect('/set_password');
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).send('Incorrect password');


        req.session.user_id = user.user_id;
        req.session.name = user.name;
        req.session.email = user.email;


        const userId = user.user_id;

        con.query(`SELECT * FROM student WHERE user_id = ?`, [userId], (err, stuRes) => {
            if (err) return res.status(500).send('DB error');
            if (stuRes.length > 0) return res.redirect('/student/home');

            con.query(`SELECT * FROM technicians WHERE user_id = ?`, [userId], (err, techRes) => {
                if (err) return res.status(500).send('DB error');
                if (techRes.length > 0) {
                    const job = techRes[0].job_position.toLowerCase();
                    if (job.includes('head')) {
                        return res.redirect('/head/dashboard');
                    } else {
                        return res.redirect('/tech/repairlist');
                    }
                }

                con.query(`SELECT * FROM dorm_staff WHERE user_id = ?`, [userId], (err, staffRes) => {
                    if (err) return res.status(500).send('DB error');
                    if (staffRes.length > 0) return res.redirect('/staff/dashboard');


                    return res.redirect('/admin/dashboard');
                });
            });
        });
    });
});


app.post('/set_password', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ status: 'fail', message: 'Missing data' });
    }

    const query = `SELECT * FROM users WHERE email = ?`;
    con.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: 'DB error' });

        if (results.length === 0) {
            return res.json({ status: 'fail', message: 'Email not found in system' });
        }

        const user = results[0];

        if (user.status === 0) {
            return res.status(403).json({ status: 'fail', message: 'Your account is disabled. Cannot set password.' });
        }

        if (user.password !== null) {
            return res.json({ status: 'fail', message: 'Password already set. Please login.' });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Password must be at least 8 characters long, include at least 1 uppercase letter and 1 number.'
            });
        }


        const hashedPassword = await bcrypt.hash(newPassword, 10);
        con.query(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email], (err) => {
            if (err) return res.status(500).json({ status: 'error', message: 'Update failed' });

            return res.json({ status: 'success' });
        });
    });
});


function addNotification(userId, role, requestId, title, message, link = null) {
    const sql = `
        INSERT INTO notifications (user_id, role, request_id, title, message, link)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    con.query(sql, [userId, role, requestId, title, message, link], (err) => {
        if (err) console.error('Error inserting notification:', err);
    });
}

function getHeadRequestLink(categoryId) {
    switch (categoryId) {
        case 1: return '/head/request/electrical';   // Electrical
        case 2: return '/head/request/plumbing';     // Plumbing
        case 3: return '/head/request/furniture';    // Furniture
        case 4: return '/head/request/air';          // Air
        case 5: return '/head/request/general';      // General
        default: return '/head/request/general';
    }
}



// Student
app.get('/student/notifications', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const sql = `
        SELECT n.*, rr.article, rr.status
        FROM notifications n
        LEFT JOIN repair_requests rr ON n.request_id = rr.request_id
        WHERE n.role = 'student' AND n.user_id = ?
        ORDER BY n.created_at DESC
    `;
    con.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.json(results);
    });
});

app.post('/notifications/read', (req, res) => {
    const { notification_id } = req.body;
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const sql = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE notification_id = ? AND user_id = ?
    `;
    con.query(sql, [notification_id, userId], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

app.post('/notifications/read-all', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const sql = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = ? AND role = 'student'
    `;
    con.query(sql, [userId], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});




app.get('/student/info', (req, res) => {
    const userId = req.session.user_id;

    if (!userId) return res.status(403).json({ error: 'Unauthorized' });

    const sql = `
        SELECT u.name
        FROM users u
        JOIN student s ON u.user_id = s.user_id
        WHERE u.user_id = ?
    `;

    con.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ name: results[0].name });
    });
});


app.get('/student/home', (req, res) => {
    if (!req.session.user_id) return res.redirect('/login');
    res.sendFile(__dirname + '/views/student/student_home.html');
});


app.get('/student/profile', (req, res) => {
    if (!req.session.user_id) return res.redirect('/login');
    res.sendFile(__dirname + '/views/student/student_profile.html');
});
app.get('/student/profile-data', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const query = `
        SELECT 
            s.student_id,
            u.name,
            u.email,
            sc.school_name,
            m.major_name,
            d.dorm_name,
            r.room_number
        FROM student s
        JOIN users u ON s.user_id = u.user_id
        JOIN major m ON s.major_id = m.major_id
        JOIN school sc ON s.school_id = sc.school_id
        JOIN dormitory d ON s.dorm_id = d.dorm_id
        JOIN rooms r ON s.room_id = r.room_id
        WHERE s.user_id = ?
    `;

    con.query(query, [userId], (err, result) => {
        if (err) return res.status(500).send('Database error');
        if (result.length === 0) return res.status(404).send('Student not found');

        res.json(result[0]);
    });
});


app.get('/student/send', function (req, res) {
    res.sendFile(__dirname + '/views/student/student_send.html');
});

app.post('/student/submit-request', (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large! Max size is 2MB." });
            }
            return res.status(400).json({ error: "Upload error: " + err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }


        const userId = req.session.user_id;
        if (!userId) return res.status(401).send('Unauthorized');

        const { category, article, description } = req.body;
        const image = req.file ? `/public/uploads/${req.file.filename}` : null;
        const requestDate = new Date();

        // Find student_id, dorm_id, room_id
        const query = `
            SELECT student_id, dorm_id, room_id
            FROM student
            WHERE user_id = ?
        `;
        con.query(query, [userId], (err, result) => {
            if (err) return res.status(500).send('DB Error (fetch student)');
            if (result.length === 0) return res.status(404).send('Student not found');

            const student = result[0];

            // Find category_id
            const catQuery = `SELECT category_id FROM category WHERE category_name = ?`;
            con.query(catQuery, [category], (err, catRes) => {
                if (err) return res.status(500).send('DB Error (category)');
                if (catRes.length === 0) return res.status(400).send('Invalid category');

                const categoryId = catRes[0].category_id;

                const insertQuery = `
                    INSERT INTO repair_requests (
                        article, description, image, status,
                        request_date, student_id, category_id, dorm_id, room_id
                    ) VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?)
                `;

                con.query(insertQuery, [
                    article,
                    description,
                    image,
                    requestDate,
                    student.student_id,
                    categoryId,
                    student.dorm_id,
                    student.room_id
                ], (err, insertRes) => {
                    if (err) return res.status(500).send('DB Error (insert)');

                    const requestId = insertRes.insertId;
                    const headLink = getHeadRequestLink(categoryId);

                    // Fetch dorm + room
                    con.query(`
                        SELECT d.dorm_name, r.room_number
                        FROM dormitory d
                        JOIN rooms r ON r.room_id = ?
                        WHERE d.dorm_id = ?
                    `, [student.room_id, student.dorm_id], (errInfo, infoRows) => {
                        if (errInfo || infoRows.length === 0) {
                            console.error('Error fetching dorm/room info:', errInfo);
                            return res.status(500).send('DB Error (dorm/room info)');
                        }

                        const dormName = infoRows[0].dorm_name;
                        const roomNumber = infoRows[0].room_number;

                        // 🔔 Notify Staff in same dorm
                        con.query(`
                            SELECT user_id 
                            FROM dorm_staff 
                            WHERE dorm_id = ?
                        `, [student.dorm_id], (errStaff, staffRows) => {
                            if (!errStaff && staffRows.length > 0) {
                                staffRows.forEach(staff => {
                                    addNotification(
                                        staff.user_id,
                                        'staff',
                                        requestId,
                                        'New Repair Request',
                                        `A new repair request "${article}" has been submitted in room ${roomNumber}.`,
                                        '/staff/repair'
                                    );
                                });
                            }
                        });

                        // 🔔 Notify Head Technician
                        con.query(`
                            SELECT user_id FROM technicians
                            WHERE job_position LIKE '%Head%' AND category_id = ?
                        `, [categoryId], (errHead, headRows) => {
                            if (!errHead && headRows.length > 0) {
                                headRows.forEach(head => {
                                    addNotification(
                                        head.user_id,
                                        'headtech',
                                        requestId,
                                        'New Repair Request',
                                        `A new repair request "${article}" has been submitted in ${dormName}, room ${roomNumber}.`,
                                        headLink
                                    );
                                });
                            }
                        });

                        // 🔔 Notify Admin
                        con.query(`SELECT user_id FROM users WHERE name = 'Admin'`, (errAdmin, adminRows) => {
                            if (!errAdmin && adminRows.length > 0) {
                                adminRows.forEach(admin => {
                                    addNotification(
                                        admin.user_id,
                                        'admin',
                                        requestId,
                                        'New Repair Request',
                                        `A new repair request "${article}" has been submitted in ${dormName}, room ${roomNumber}.`,
                                        '/admin/report'
                                    );
                                });
                            }
                        });

                        res.redirect('/student/track');
                    });
                });
            });
        });
    });
});

app.get('/student/track', function (req, res) {
    res.sendFile(__dirname + '/views/student/student_track.html');
});
app.get('/student/track-data', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const query = `
    SELECT 
        rr.*, 
        c.category_name, 
        u.name AS technician_name, 
        t.phone_number,
        f.feedback_id
    FROM repair_requests rr
    LEFT JOIN category c ON rr.category_id = c.category_id
    LEFT JOIN technicians t ON rr.technician_id = t.technician_id
    LEFT JOIN users u ON t.user_id = u.user_id
    LEFT JOIN feedback f ON rr.request_id = f.request_id
    INNER JOIN student s ON rr.student_id = s.student_id
    WHERE s.user_id = ?
    AND (
        rr.status IN ('Pending', 'Confirmed')
        OR (
            rr.status = 'Completed' 
            AND f.feedback_id IS NULL 
            AND DATEDIFF(NOW(), rr.complete_date) <= 5
        )
    )
    ORDER BY
        CASE rr.status
            WHEN 'Pending' THEN 1
            WHEN 'Confirmed' THEN 2
            WHEN 'Completed' THEN 3
            ELSE 4
        END,
        rr.request_date DESC
`;


    con.query(query, [userId], (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.json(results);
    });
});
app.post('/student/cancel', (req, res) => {
    const userId = req.session.user_id;
    const { request_id } = req.body;

    if (!userId) return res.status(401).send('Unauthorized');

    // Confirm the request belongs to the student and is still pending
    const checkQuery = `
    SELECT rr.request_id, rr.article, rr.category_id, rm.room_number
    FROM repair_requests rr
    INNER JOIN student s ON rr.student_id = s.student_id
    INNER JOIN rooms rm ON rr.room_id = rm.room_id
    WHERE rr.request_id = ? AND s.user_id = ? AND rr.status = 'Pending'
`;

    con.query(checkQuery, [request_id, userId], (err, result) => {
        if (err) return res.status(500).send('Database error');
        if (result.length === 0)
            return res.status(403).send('Request not found or not cancelable');

        const { article, category_id, room_number } = result[0];
        const headLink = getHeadRequestLink(category_id);

        // Update status to "Cancel"
        const updateQuery = `
            UPDATE repair_requests
            SET status = 'Cancel'
            WHERE request_id = ?
        `;
        con.query(updateQuery, [request_id], (err) => {
            if (err) return res.status(500).send('Failed to cancel request');

            // 🔔 Notify Staff in same dorm about cancellation
            con.query(`
                SELECT ds.user_id, rr.article, rm.room_number
                FROM dorm_staff ds
                JOIN repair_requests rr ON rr.dorm_id = ds.dorm_id
                JOIN student s ON rr.student_id = s.student_id
                JOIN rooms rm ON rr.room_id = rm.room_id
                WHERE rr.request_id = ?
            `, [request_id], (err2, staffRows) => {
                if (!err2 && staffRows.length > 0) {
                    staffRows.forEach(staff => {
                        addNotification(
                            staff.user_id,
                            'staff',
                            request_id,
                            'Repair Request Cancelled',
                            `The repair request "${staff.article}" in room ${staff.room_number} has been cancelled.`,
                            '/staff/history'
                        );
                    });
                }
            });

            // 🔔 Notify Head Tech with dorm name and room number
            con.query(`
               SELECT t.user_id, rm.room_number, d.dorm_name
    FROM technicians t
    JOIN repair_requests rr ON rr.category_id = t.category_id
    JOIN rooms rm ON rr.room_id = rm.room_id
    JOIN dormitory d ON rr.dorm_id = d.dorm_id
    WHERE rr.request_id = ? AND t.job_position LIKE '%Head%'
`, [request_id], (errHead, headRows) => {
                if (!errHead && headRows.length > 0) {
                    headRows.forEach(head => {
                        addNotification(
                            head.user_id,
                            'headtech',
                            request_id,
                            'Repair Request Cancelled',
                            `Repair request "${article}" in ${head.dorm_name} dorm, room ${head.room_number} was cancelled by the student.`,
                            headLink
                        );
                    });
                }
            });

            // 🔔 Notify Admin with dorm name and room number
            con.query(`
               SELECT u.user_id, rm.room_number, d.dorm_name
    FROM users u
    JOIN repair_requests rr ON rr.request_id = ?
    JOIN rooms rm ON rr.room_id = rm.room_id
    JOIN dormitory d ON rr.dorm_id = d.dorm_id
    WHERE u.name = 'Admin'
`, [request_id], (errAdmin, adminRows) => {
                if (!errAdmin && adminRows.length > 0) {
                    adminRows.forEach(admin => {
                        addNotification(
                            admin.user_id,
                            'admin',
                            request_id,
                            'Repair Request Cancelled',
                            `Repair request "${article}" in ${admin.dorm_name} dorm, room ${admin.room_number} was cancelled by the student.`,
                            '/admin/history'
                        );
                    });
                }
            });

            res.send('Request cancelled successfully');
        });
    });
});
app.post('/student/feedback', (req, res) => {
    const userId = req.session.user_id;
    const { request_id, rating, comment } = req.body;

    if (!userId) return res.status(401).send('Unauthorized');

    // Step 1: Check request belongs to student and is completed + get extra info
    const checkRequestQuery = `
        SELECT rr.request_id, rr.article, rr.category_id, rr.technician_id,
               rm.room_number, d.dorm_name
        FROM repair_requests rr
        INNER JOIN student s ON rr.student_id = s.student_id
        INNER JOIN rooms rm ON rr.room_id = rm.room_id
        INNER JOIN dormitory d ON rr.dorm_id = d.dorm_id
        WHERE rr.request_id = ? AND s.user_id = ? AND rr.status = 'Completed'
    `;
    con.query(checkRequestQuery, [request_id, userId], (err, requestRes) => {
        if (err) return res.status(500).send('Database error');
        if (requestRes.length === 0)
            return res.status(403).send('Request not found or not eligible for feedback');

        const { article, category_id, technician_id, room_number, dorm_name } = requestRes[0];
        const headLink = getHeadRequestLink(category_id);

        // Step 2: Check if feedback already exists
        const checkFeedbackQuery = `SELECT * FROM feedback WHERE request_id = ?`;
        con.query(checkFeedbackQuery, [request_id], (err, feedbackRes) => {
            if (err) return res.status(500).send('Database error');
            if (feedbackRes.length > 0)
                return res.status(400).send('Feedback already submitted');

            // Step 3: Insert feedback
            const insertQuery = `
                INSERT INTO feedback (rating, comment, request_id)
                VALUES (?, ?, ?)
            `;
            con.query(insertQuery, [rating, comment, request_id], (err) => {
                if (err) return res.status(500).send('Failed to submit feedback');

                // 🔔 Notify Head Tech
                con.query(`
                    SELECT user_id FROM technicians
                    WHERE job_position LIKE '%Head%' AND category_id = ?`,
                    [category_id], (errHead, headRows) => {
                        if (!errHead && headRows.length > 0) {
                            headRows.forEach(head => {
                                addNotification(
                                    head.user_id, 'headtech', request_id,
                                    'New Feedback Submitted',
                                    `Student submitted feedback for request "${article}" in ${dorm_name}, room ${room_number}.`,
                                    headLink
                                );
                            });
                        }
                    });

                // 🔔 Notify Technician who worked on this request
                if (technician_id) {
                    con.query(`
                        SELECT user_id FROM technicians WHERE technician_id = ?`,
                        [technician_id], (errTech, techRows) => {
                            if (!errTech && techRows.length > 0) {
                                techRows.forEach(tech => {
                                    addNotification(
                                        tech.user_id, 'technician', request_id,
                                        'New Feedback Received',
                                        `A student submitted feedback for request "${article}" in ${dorm_name}, room ${room_number}.`,
                                        '/tech/history'
                                    );
                                });
                            }
                        });
                }

                res.send('Feedback submitted successfully');
            });
        });
    });
});

app.get('/student/edit-data', (req, res) => {
    const requestId = req.query.request_id;

    const query = `
        SELECT rr.article, rr.description, rr.image, c.category_name
        FROM repair_requests rr
        JOIN category c ON rr.category_id = c.category_id
        WHERE rr.request_id = ?
    `;

    con.query(query, [requestId], (err, result) => {
        if (err) return res.status(500).send('DB Error');
        if (result.length === 0) return res.status(404).send('Not found');
        res.json(result[0]);
    });
});

app.post('/student/edit', (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).send("File too large! Max size is 2MB.");
            }
            return res.status(400).json({ error: "Upload error: " + err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const userId = req.session.user_id;
        const { request_id, article, description, category } = req.body;
        const image = req.file ? `/public/uploads/${req.file.filename}` : null;

        if (!userId) return res.status(401).send('Unauthorized');

        const catQuery = `SELECT category_id FROM category WHERE category_name = ?`;
        con.query(catQuery, [category], (err, catRes) => {
            if (err) return res.status(500).send('Database error (category lookup)');
            if (catRes.length === 0) return res.status(400).send('Invalid category');

            const categoryId = catRes[0].category_id;
            const headLink = getHeadRequestLink(categoryId);

            const checkQuery = `
                SELECT rr.request_id
                FROM repair_requests rr
                INNER JOIN student s ON rr.student_id = s.student_id
                WHERE rr.request_id = ? AND s.user_id = ? AND rr.status = 'Pending'
            `;
            con.query(checkQuery, [request_id, userId], (err, result) => {
                if (err) return res.status(500).send('Database error (ownership check)');
                if (result.length === 0) return res.status(403).send('Request not found or not editable');

                let updateQuery = `
                    UPDATE repair_requests
                    SET article = ?, description = ?, category_id = ?
                `;
                const params = [article, description, categoryId];

                if (image) {
                    updateQuery += `, image = ?`;
                    params.push(image);
                }

                updateQuery += ` WHERE request_id = ?`;
                params.push(request_id);

                con.query(updateQuery, params, (err) => {
                    if (err) return res.status(500).send('Failed to update request');

                    // 🔔 Notify Staff in same dorm about edit
                    con.query(`
                    SELECT ds.user_id, rr.article, rm.room_number
                    FROM dorm_staff ds
                    JOIN repair_requests rr ON rr.dorm_id = ds.dorm_id
                    JOIN rooms rm ON rr.room_id = rm.room_id
                    WHERE rr.request_id = ?
                `, [request_id], (errStaff, staffRows) => {
                        if (!errStaff && staffRows.length > 0) {
                            staffRows.forEach(staff => {
                                addNotification(
                                    staff.user_id,
                                    'staff',
                                    request_id,
                                    'Repair Request Updated',
                                    `The repair request "${staff.article}" in room ${staff.room_number} has been updated by the student.`,
                                    '/staff/reapir'
                                );
                            });
                        }
                    });

                    // 🔔 Notify Head Tech
                    // First, fetch dorm name and room number
                    con.query(`
    SELECT d.dorm_name, r.room_number
    FROM repair_requests rr
    JOIN dormitory d ON rr.dorm_id = d.dorm_id
    JOIN rooms r ON rr.room_id = r.room_id
    WHERE rr.request_id = ?
`, [request_id], (errInfo, infoRows) => {
                        if (errInfo || infoRows.length === 0) {
                            console.error('Error fetching dorm/room info for edit:', errInfo);
                        } else {
                            const dormName = infoRows[0].dorm_name;
                            const roomNumber = infoRows[0].room_number;

                            con.query(`
            SELECT user_id FROM technicians
            WHERE job_position LIKE '%Head%' AND category_id = ?
        `, [categoryId], (errHead, headRows) => {
                                if (!errHead && headRows.length > 0) {
                                    headRows.forEach(head => {
                                        addNotification(
                                            head.user_id,
                                            'headtech',
                                            request_id,
                                            'Repair Request Updated',
                                            `Repair request "${article}" in ${dormName}, room ${roomNumber} was updated by the student.`,
                                            headLink
                                        );
                                    });
                                }
                            });
                        }
                    });

                    res.send('Request updated successfully');
                });
            });
        });
    });
});


app.get('/student/history', function (req, res) {
    res.sendFile(__dirname + '/views/student/student_history.html');
});
app.get('/student/history-data', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const { keyword, date, status, type } = req.query;
    let conditions = `
        WHERE s.user_id = ?
        AND rr.status IN ('Completed', 'Cancel')
    `;
    const params = [userId];

    if (keyword) {
        conditions += `
            AND (
                rr.article LIKE ? OR
                d.dorm_name LIKE ? OR
                r.room_number LIKE ? OR
                rr.description LIKE ? OR
                u.name LIKE ?
            )
        `;
        const pattern = `%${keyword}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (date) {
        conditions += ` AND (DATE(rr.request_date) = ? OR DATE(rr.complete_date) = ?)`;
        params.push(date, date);
    }

    if (status) {
        conditions += ` AND rr.status = ?`;
        params.push(status);
    }

    if (type) {
        conditions += ` AND c.category_name = ?`;
        params.push(type);
    }

    const query = `
        SELECT 
            rr.*, 
            d.dorm_name, 
            r.room_number, 
            t.phone_number, 
            t.job_position, 
            t.user_id AS tech_user_id, 
            u.name AS tech_name,
            c.category_name,
            f.rating, 
            f.comment
        FROM repair_requests rr
        LEFT JOIN dormitory d ON rr.dorm_id = d.dorm_id
        LEFT JOIN rooms r ON rr.room_id = r.room_id
        LEFT JOIN technicians t ON rr.technician_id = t.technician_id
        LEFT JOIN users u ON t.user_id = u.user_id
        LEFT JOIN category c ON rr.category_id = c.category_id
        LEFT JOIN feedback f ON rr.request_id = f.request_id
        INNER JOIN student s ON rr.student_id = s.student_id
        ${conditions}
        ORDER BY GREATEST(COALESCE(rr.complete_date, '0000-00-00'), rr.request_date) DESC
    `;

    con.query(query, params, (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.json(results);
    });
});







// Dormitory Staff
app.get('/staff/notifications', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    // Get dorm_id for this staff
    const dormSql = `SELECT dorm_id FROM dorm_staff WHERE user_id = ?`;
    con.query(dormSql, [userId], (err, dormResults) => {
        if (err) return res.status(500).send('Database error');
        if (dormResults.length === 0) return res.json([]); // Staff not assigned to any dorm

        const dormId = dormResults[0].dorm_id;

        // Only notifications for staff in their own dorm
        const sql = `
            SELECT n.*, rr.article, rr.status AS request_status, d.dorm_name, r.room_number
            FROM notifications n
            LEFT JOIN repair_requests rr ON n.request_id = rr.request_id
            LEFT JOIN dormitory d ON rr.dorm_id = d.dorm_id
            LEFT JOIN rooms r ON rr.room_id = r.room_id
            WHERE n.role = 'staff' AND n.user_id = ?
              AND (rr.dorm_id = ? OR rr.dorm_id IS NULL)
            ORDER BY n.created_at DESC
        `;
        con.query(sql, [userId, dormId], (err, results) => {
            if (err) return res.status(500).send('Database error');
            res.json(results);
        });
    });
});

// Mark staff notification as read
app.post('/staff/notifications/read', (req, res) => {
    const { notification_id } = req.body;
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const sql = `
        UPDATE notifications
        SET is_read = TRUE
        WHERE notification_id = ? AND user_id = ?
    `;
    con.query(sql, [notification_id, userId], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});
// สมมติว่ามี middleware auth ที่ใส่ req.user.user_id, req.user.role
app.post("/staff/notifications/read-all", async (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');
    con.query(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        [userId], (err) => {
            if (err) return res.status(500).send('Database error');
            res.json({ success: true });
        }
    );
});

app.get('/staff/nevbar', (req, res) => {
    res.sendFile(__dirname + '/views/dormstaff/nav_tab_staff.html');
});
app.get('/staff/nevbar_name', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const query = `
        SELECT u.name
        FROM users u
        JOIN dorm_staff ds ON u.user_id = ds.user_id
        WHERE u.user_id = ?
        LIMIT 1
    `;

    con.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!results || results.length === 0) return res.status(404).json({ error: 'Staff not found' });
        res.json({ name: results[0].name });
    });
});
app.get('/staff/profile', function (req, res) {
    res.sendFile(__dirname + '/views/dormstaff/profile_staff.html');
});
// Assuming Express and MySQL connection (con) are set up
app.get('/staff/profile_data', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const query = `
        SELECT 
            u.name, 
            u.email, 
            ds.phone_number, 
            d.dorm_name
        FROM users u
        JOIN dorm_staff ds ON u.user_id = ds.user_id
        JOIN dormitory d ON ds.dorm_id = d.dorm_id
        WHERE u.user_id = ?
    `;

    con.query(query, [userId], (err, results) => {
        if (err) return res.status(500).send('Database error');
        if (results.length === 0) return res.status(404).send('Staff not found');

        res.json(results[0]);
    });
});

app.get('/staff/dashboard', function (req, res) {
    res.sendFile(__dirname + '/views/dormstaff/dashboard_staff.html');
});
// 2. Dashboard summary cards (total, pending, confirmed, completed)
app.get('/staff/dashboard/summary', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT 
            COUNT(*) as total,
            SUM(status='Pending') as pending,
            SUM(status='Confirmed') as confirmed,
            SUM(status='Completed') as completed,
            SUM(status='Cancel') as cancel
        FROM repair_requests r
        JOIN dormitory d ON r.dorm_id = d.dorm_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows[0]);
    });
});

// 3. Dashboard: category chart (top types)
app.get('/staff/dashboard/category-chart', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT c.category_name, COUNT(*) as count
        FROM repair_requests r
        JOIN category c ON r.category_id = c.category_id
        JOIN dormitory d ON r.dorm_id = d.dorm_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    sql += ' GROUP BY r.category_id ORDER BY count DESC LIMIT 10';
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Dashboard: top 5 repair rooms
app.get('/staff/dashboard/room-chart', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT r.room_number, COUNT(*) as count
        FROM repair_requests req
        JOIN rooms r ON req.room_id = r.room_id
        JOIN dormitory d ON req.dorm_id = d.dorm_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    sql += ' GROUP BY req.room_id ORDER BY count DESC LIMIT 5';
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 5. Dashboard: recent repairs table
app.get('/staff/dashboard/recent', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT req.request_date, u.name as reporter, u.email, req.article, req.description, r.room_number,
               tuser.name as technician, t.phone_number, req.status
        FROM repair_requests req
        JOIN student s ON req.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN rooms r ON req.room_id = r.room_id
        JOIN dormitory d ON req.dorm_id = d.dorm_id
        LEFT JOIN technicians t ON req.technician_id = t.technician_id
        LEFT JOIN users tuser ON t.user_id = tuser.user_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    sql += ' ORDER BY req.request_date DESC LIMIT 10';
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/staff/list', function (req, res) {
    res.sendFile(__dirname + '/views/dormstaff/list_staff.html');
});

app.get('/staff/liststu', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }
    const dormName = req.query.dormName;
    const school_id = req.query.school_id;
    const major_id = req.query.major_id;
    const search = req.query.search; // สำหรับ Name/ID
    const room = req.query.room;     // สำหรับค้นหาเฉพาะ room

    let query = `
        SELECT
            u.name,
            u.email,
            s.student_id,
            r.room_number,
            mj.major_name,
            sch.school_name
        FROM users u
        JOIN student s ON u.user_id = s.user_id
        JOIN rooms r ON s.room_id = r.room_id
        JOIN major mj ON s.major_id = mj.major_id
        JOIN school sch ON s.school_id = sch.school_id
        JOIN dormitory d ON s.dorm_id = d.dorm_id
        WHERE 1=1
         AND u.status = 1
    `;
    const queryParams = [];
    if (dormName) {
        query += ` AND d.dorm_name = ?`;
        queryParams.push(dormName);
    }
    if (school_id) {
        query += ` AND sch.school_id = ?`;
        queryParams.push(school_id);
    }
    if (major_id) {
        query += ` AND mj.major_id = ?`;
        queryParams.push(major_id);
    }
    // ถ้ามี room ให้ค้นหาเฉพาะห้อง (จากช่องห้อง)
    if (room) {
        query += ` AND r.room_number LIKE ?`;
        queryParams.push(`%${room}%`);
    }
    // ถ้ามี search และไม่ได้ค้นหาห้อง ให้ค้นหาเฉพาะ name/student_id
    else if (search) {
        query += ` AND (u.name LIKE ? OR s.student_id LIKE ?)`;
        const keyword = `%${search}%`;
        queryParams.push(keyword, keyword);
    }

    con.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error during student list fetch.');
        }
        res.json(results);
    });
});


//repair
app.get('/staff/reapir', function (req, res) {
    res.sendFile(__dirname + '/views/dormstaff/repair_report_staff.html');
});

app.get('/staff/repairr', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

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
    // **ตรงนี้ให้ใช้ if ไม่ใช่ else if**
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
        res.json(results);
    });
});

app.get('/staff/sch', function (req, res) {
    res.sendFile(__dirname + '/views/dormstaff/schedule_staff.html');
});
app.get('/staff/schedule', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const dormName = req.query.dormitory; // เช่น Lamduan 7
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

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
            t.phone_number,
            huser.name AS headtech_name 
        FROM repair_requests rr
        JOIN student s ON rr.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN rooms r ON rr.room_id = r.room_id
        JOIN dormitory d ON rr.dorm_id = d.dorm_id
        JOIN category c ON rr.category_id = c.category_id
        LEFT JOIN technicians t ON rr.technician_id = t.technician_id
        LEFT JOIN users tuser ON t.user_id = tuser.user_id
        LEFT JOIN technicians ht ON rr.headtech_id = ht.technician_id
        LEFT JOIN users huser ON ht.user_id = huser.user_id
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

    query += ' ORDER BY rr.repair_date ASC';

    con.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        res.json(results);
    });
});
// Route สำหรับ category
app.get('/categories_staff', (req, res) => {
    con.query('SELECT category_name FROM category ORDER BY category_name', (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

// Route สำหรับ dormitory
app.get('/dormitories', (req, res) => {
    con.query('SELECT dorm_name FROM dormitory ORDER BY dorm_name', (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

app.get('/staff/history', function (req, res) {
    res.sendFile(__dirname + '/views/dormstaff/history_staff.html');
});
app.get('/staff/repairtypes', (req, res) => {
    con.query("SELECT category_name FROM category ORDER BY category_name ASC", (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error during fetching repair types.');
        }
        res.json(results.map(r => r.category_name));
    });
});

app.get('/staff/history1', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    const dormName = req.query.dormName;
    const date = req.query.date;
    const repairtype = req.query.repairtype; // เพิ่มรับค่าจาก dropdown
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

    // ORDER: Completed => ORDER BY complete_date DESC, Cancel => ORDER BY request_date DESC
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

//Loding
app.get('/loading', function (req, res) {
    res.sendFile(__dirname + '/views/Loading.html');
});



//login Navbar
app.get('/user/me', (req, res) => {
    // Check session
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Find name and role from technicians only
    const userId = req.session.user_id;
    con.query(
        `SELECT u.name, u.email, 
            CASE 
                WHEN t.technician_id IS NOT NULL AND t.job_position LIKE '%Head%' THEN 'Head Technician'
                WHEN t.technician_id IS NOT NULL THEN 'Technician'
                ELSE 'Not Technician'
            END AS role
        FROM users u
        LEFT JOIN technicians t ON u.user_id = t.user_id
        WHERE u.user_id = ? LIMIT 1
        `, [userId], (err, rows) => {
        if (err || !rows.length) return res.status(500).json({ error: 'Database error' });
        const { name, email, role } = rows[0];
        res.json({ name, email, role });
    });
});
// Head Technician
app.get('/head/dashboard', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Dashboard.html');
});
// Head Technician Notifications API
app.get('/head/notifications', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const sql = `
        SELECT n.notification_id, n.title, n.message, n.link, n.is_read, n.created_at, rr.article, rr.status, d.dorm_name, r.room_number
        FROM notifications n
        LEFT JOIN repair_requests rr ON n.request_id = rr.request_id
        LEFT JOIN dormitory d ON rr.dorm_id = d.dorm_id
        LEFT JOIN rooms r ON rr.room_id = r.room_id
        WHERE n.role = 'headtech' AND n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 30
    `;
    con.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.json(results);
    });
});
app.post('/head/notifications/read-all', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');
    // อ่านเฉพาะของ role headtech (หรือถ้าจะแก้ให้ทุก role ให้เอา role ออก)
    con.query(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND role = 'headtech' AND is_read = 0",
        [userId], (err) => {
            if (err) return res.status(500).send('Database error');
            res.json({ success: true });
        }
    );
});
app.get('/head/dormitory/list', async (req, res) => {
    try {
        const [rows] = await con.promise().query(
            'SELECT dorm_id, dorm_name FROM dormitory ORDER BY dorm_id'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

app.get('/head/profilepage', function (req, res) {
    res.sendFile(__dirname + '/views/Head/profile_Head.html');
});
// Profile
app.get('/head/profile', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Query หาข้อมูล Head Technician ที่ user_id ตรงกับ session
    const userId = req.session.user_id;
    con.query(
        `SELECT 
            t.phone_number, 
            c.category_name as category
            -- เพิ่ม field รูปภาพถ้ามี เช่น t.profile_image_url
        FROM technicians t
        JOIN category c ON t.category_id = c.category_id
        WHERE t.user_id = ? AND t.job_position LIKE '%Head%'
        LIMIT 1
        `, [userId], (err, rows) => {
        if (err || !rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    }
    );
});
app.get('/head/assign', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Assing.html');
});
// Dashboard API Endpoint
app.get('/head/dashboard/data', async (req, res) => {
    const dormId = req.query.dorm_id || '6'; // Default to dorm_id=6 if not provided

    try {
        // 1. Summary counts (add cancel)
        const [summaryRows] = await con.promise().query(`
            SELECT 
                COUNT(*) as total,
                SUM(status = 'Pending') as pending,
                SUM(status = 'Confirmed') as confirmed,
                SUM(status = 'Completed') as completed,
                SUM(status = 'Cancel') as cancel
            FROM repair_requests
            WHERE dorm_id = ?
        `, [dormId]);

        // 2. Top repair types
        const [typeRows] = await con.promise().query(`
            SELECT c.category_name, COUNT(*) as count
            FROM repair_requests r
            JOIN category c ON r.category_id = c.category_id
            WHERE r.dorm_id = ?
            GROUP BY r.category_id
            ORDER BY count DESC
            LIMIT 5
        `, [dormId]);

        // 3. Top 5 rooms with most repairs
        const [roomRows] = await con.promise().query(`
            SELECT rm.room_number, COUNT(*) as count
            FROM repair_requests r
            JOIN rooms rm ON r.room_id = rm.room_id
            WHERE r.dorm_id = ?
            GROUP BY r.room_id
            ORDER BY count DESC
            LIMIT 5
        `, [dormId]);

        // 4. Technician ratings (specific to 'Technician' job position)
        const [techRows] = await con.promise().query(`
            SELECT 
                t.technician_id,
                u.name,
                t.phone_number,
                t.job_position,
                c.category_id,
                c.category_name AS category,
                COALESCE(AVG(f.rating), 0) AS avg_rating,
                COUNT(f.feedback_id) AS rating_count
            FROM technicians t
            JOIN users u ON t.user_id = u.user_id
            JOIN category c ON t.category_id = c.category_id
            LEFT JOIN repair_requests rr ON t.technician_id = rr.technician_id
            LEFT JOIN feedback f ON rr.request_id = f.request_id
            WHERE t.job_position = 'Technician'
            GROUP BY t.technician_id, u.name, t.phone_number, t.job_position, c.category_id, c.category_name
            ORDER BY c.category_name, avg_rating DESC
        `);

        // Get all categories for filter
        const [categories] = await con.promise().query(`
            SELECT category_id, category_name 
            FROM category
            ORDER BY category_name
        `);

        // 5. Recent repair requests (show last 10)
        const [recentRows] = await con.promise().query(`
  SELECT 
    r.request_date,
    u.name AS reporter_name,
    u.email AS reporter_email,
    r.article,
    r.description,
    rm.room_number,
    u2.name AS technician_name,
    t2.phone_number AS technician_phone,
    r.status
FROM repair_requests r
JOIN student s ON r.student_id = s.student_id
JOIN users u ON s.user_id = u.user_id
JOIN rooms rm ON r.room_id = rm.room_id
LEFT JOIN technicians t2 ON r.technician_id = t2.technician_id
LEFT JOIN users u2 ON t2.user_id = u2.user_id
WHERE r.dorm_id = ?
  AND r.status = 'Completed'
ORDER BY r.request_date DESC
LIMIT 10
`, [dormId]);

        // Format response
        const response = {
            lastUpdated: new Date().toISOString(),

            summary: summaryRows[0] || { total: 0, pending: 0, confirmed: 0, completed: 0, cancel: 0 },
            repairType: {
                labels: typeRows.map(row => row.category_name),
                counts: typeRows.map(row => row.count)
            },
            topRooms: {
                labels: roomRows.map(row => `Room ${row.room_number}`),
                counts: roomRows.map(row => row.count)
            },
            technicianTypes: categories.map(cat => ({
                id: cat.category_id,
                name: cat.category_name
            })),
            technicians: techRows.map(t => ({
                id: t.technician_id,
                name: t.name,
                phone: t.phone_number,
                position: t.job_position,
                categoryId: t.category_id,
                categoryName: t.category, // <<< FIX: Changed t.category_name to t.specialty
                rating: parseFloat(t.avg_rating).toFixed(1),
                reviews: t.rating_count,
                category: t.category
            })),
            recentRequests: recentRows.map(r => ({
                request_date: new Date(r.request_date).toLocaleString('en-GB'),
                reporter_name: r.reporter_name,
                reporter_email: r.reporter_email,
                article: r.article,
                description: r.description,
                room_number: r.room_number,
                technician_name: r.technician_name || '-',
                technician_phone: r.technician_phone || '',
                status: r.status
            }))
        };

        res.json(response);

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            error: 'Database error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});
app.get('/head/request/general', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Requestlist.html');
});
app.get('/head/request/furniture', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Requestlist F.html');
});
app.get('/head/request/electrical', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Requestlist E.html');
});
app.get('/head/request/plumbing', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Requestlist P.html');
});
app.get('/head/request/air', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_Requestlist A.html');
});
// Get all repair requests for Head (GET)
app.get('/head/requestlist', async (req, res) => {
    const dormId = req.query.dorm_id || '6'; // default
    const categoryId = req.query.category_id; // get category_id from query string
    const requestId = req.query.request_id; // get request_id from query string

    let whereClause = 'r.dorm_id = ?';
    let params = [dormId];

    if (categoryId) {
        whereClause += ' AND r.category_id = ?';
        params.push(categoryId);
    }
    if (requestId) {
        whereClause += ' AND r.request_id = ?';
        params.push(requestId);
    }

    try {
        const [rows] = await con.promise().query(`
            SELECT 
                r.request_id,
                DATE_FORMAT(r.request_date, '%d/%m/%Y') AS request_date,
                u.name AS reporter_name,
                u.email AS reporter_email,
                r.article,
                r.description,
                c.category_name,
                c.category_id,
                rm.room_number,
                d.dorm_name AS dorm,
                u2.name AS technician_name,
                t2.phone_number AS technician_phone,
                r.repair_date,
                r.complete_date,
                r.work_description,
                r.status,
                r.image
            FROM repair_requests r
            JOIN student s ON r.student_id = s.student_id
            JOIN users u ON s.user_id = u.user_id
            JOIN rooms rm ON r.room_id = rm.room_id
            JOIN dormitory d ON r.dorm_id = d.dorm_id
            JOIN category c ON r.category_id = c.category_id
            LEFT JOIN technicians t2 ON r.technician_id = t2.technician_id
            LEFT JOIN users u2 ON t2.user_id = u2.user_id
            WHERE ${whereClause}
            ORDER BY r.request_date DESC
        `, params);

        // Get feedback
        const [feedbackRows] = await con.promise().query(`
            SELECT 
                DATE_FORMAT(r.request_date, '%d/%m/%Y') AS request_date,
                u.name AS reporter_name,
                f.rating,
                f.comment
            FROM feedback f
            JOIN repair_requests r ON f.request_id = r.request_id
            JOIN student s ON r.student_id = s.student_id
            JOIN users u ON s.user_id = u.user_id
        `);

        const reviews = {};
        feedbackRows.forEach(fb => {
            const key = `${fb.request_date}_${fb.reporter_name}`;
            reviews[key] = {
                rating: fb.rating,
                comment: fb.comment
            };
        });

        res.json({ requests: rows, reviews });
    } catch (err) {
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});
app.get('/head/technician/available', async (req, res) => {
    const { category_id, date, time } = req.query;
    if (!date || !time) {
        return res.status(400).json({ error: 'missing date/time' });
    }
    // กำหนดช่วงเวลางาน 1 ชั่วโมง (สมมติ)
    const dt = new Date(`${date}T${time}:00`);
    const dtStart = new Date(dt);
    const dtEnd = new Date(dt);
    dtEnd.setHours(dtEnd.getHours() + 1);

    // หา technician_id ที่ "ติดงาน" ช่วงเวลานี้
    const [busyRows] = await con.promise().query(`
        SELECT technician_id
        FROM repair_requests
        WHERE repair_date IS NOT NULL
          AND status IN ('Confirmed','Completed')
          AND (
                (repair_date <= ? AND DATE_ADD(repair_date, INTERVAL 59 MINUTE) >= ?)
                OR (repair_date >= ? AND repair_date < ?)
              )
    `, [dtEnd, dtStart, dtStart, dtEnd]);

    const busyIds = busyRows.map(row => row.technician_id);

    let sql = `
    SELECT u.name, t.phone_number, t.category_id, c.category_name
    FROM technicians t
    JOIN users u ON t.user_id = u.user_id
    JOIN category c ON t.category_id = c.category_id
    WHERE LOWER(t.job_position) = 'technician'
      AND u.status = 1
`;
    const params = [];
    if (category_id) {
        sql += " AND t.category_id = ?";
        params.push(category_id);
    }
    if (busyIds.length > 0) {
        sql += ` AND t.technician_id NOT IN (${busyIds.map(() => '?').join(',')})`;
        params.push(...busyIds);
    }
    const [rows] = await con.promise().query(sql, params);
    res.json(rows);
});
// Update request data (POST)
app.post('/head/requestlist/update', async (req, res) => {
    const { request_id, technician, contact, repairDate, time } = req.body;
    try {
        // Find current request
        const [currentRows] = await con.promise().query(
            'SELECT technician_id, repair_date FROM repair_requests WHERE request_id = ?',
            [request_id]
        );
        if (currentRows.length === 0) return res.status(404).json({ error: 'Request not found' });

        const currentRequest = currentRows[0];

        // Find technician_id and user_id from technician name
        let technician_id = null;
        let technician_user_id = null;
        if (technician) {
            const [techRows] = await con.promise().query(
                `SELECT t.technician_id, u.user_id 
                 FROM technicians t 
                 JOIN users u ON t.user_id = u.user_id 
                 WHERE u.name = ?`,
                [technician]
            );
            if (techRows.length > 0) {
                technician_id = techRows[0].technician_id;
                technician_user_id = techRows[0].user_id; // ✅ use for notification
            }
        }

        // Combine date and time into datetime
        let repair_datetime = null;
        if (repairDate && time) {
            repair_datetime = `${repairDate} ${time}:00`;
        } else if (repairDate) {
            repair_datetime = `${repairDate} 09:00:00`;
        }

        // Find headtech_id from session
        const headUserId = req.session.user_id;
        const [headRows] = await con.promise().query(
            'SELECT technician_id FROM technicians WHERE user_id = ? AND LOWER(job_position) LIKE "%head%" LIMIT 1',
            [headUserId]
        );
        const headtech_id = headRows.length > 0 ? headRows[0].technician_id : null;

        // Update the request
        await con.promise().query(`
            UPDATE repair_requests 
            SET 
                technician_id = ?,
                repair_date = ?,
                status = 'Confirmed',
                headtech_id = ?
            WHERE request_id = ?
        `, [technician_id, repair_datetime, headtech_id, request_id]);

        // Determine notification type
        let notificationTitle, notificationMessage;

        if (currentRequest.technician_id === null && technician_id) {
            // First time assigning technician
            notificationTitle = 'Repair Request Confirmed';
            notificationMessage = `Your repair request has been confirmed.`;
        } else if (currentRequest.technician_id !== technician_id) {
            // Technician changed
            notificationTitle = 'Repair Request Updated';
            notificationMessage = `Your repair request has been updated with a new technician.`;
        } else {
            // Only date/time or other details updated
            notificationTitle = 'Repair Request Updated';
            notificationMessage = `Your repair request details have been updated.`;
        }


        // 🔔 Notify Student
        const [stuRows] = await con.promise().query(`
            SELECT u.user_id, rr.article
            FROM repair_requests rr
            JOIN student s ON rr.student_id = s.student_id
            JOIN users u ON s.user_id = u.user_id
            WHERE rr.request_id = ?
        `, [request_id]);

        if (stuRows.length > 0) {
            addNotification(
                stuRows[0].user_id,
                'student',
                request_id,
                notificationTitle,
                `${notificationMessage} Item: "${stuRows[0].article}"`,
                '/student/track'
            );
        }

        // 🔔 Notify Staff
        const [staffRows] = await con.promise().query(`
            SELECT ds.user_id, rr.article, rm.room_number
            FROM dorm_staff ds
            JOIN repair_requests rr ON rr.dorm_id = ds.dorm_id
            JOIN rooms rm ON rr.room_id = rm.room_id
            WHERE rr.request_id = ?
        `, [request_id]);

        if (staffRows.length > 0) {
            staffRows.forEach(staff => {
                addNotification(
                    staff.user_id,
                    'staff',
                    request_id,
                    notificationTitle,
                    `The repair request "${staff.article}" in room ${staff.room_number} has been ${notificationTitle === 'Repair Request Confirmed' ? 'confirmed' : 'updated'} by head technician.`,
                    '/staff/sch'
                );
            });
        }

        // 🔔 Notify Technician if assigned or updated
        if (technician_id && technician_user_id) {
            let techNotificationTitle, techNotificationMessage;

            // Format datetime nicely
            let formattedDateTime = null;
            if (repair_datetime) {
                const dt = new Date(repair_datetime);
                formattedDateTime = dt.toLocaleString('en-GB', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }); // e.g. "21 Aug 2025, 09:00"
            }

            if (currentRequest.technician_id === null && technician_id) {
                // First assignment
                techNotificationTitle = 'New Repair Assignment';
                techNotificationMessage = `You have been assigned a new repair request${formattedDateTime ? ' scheduled on ' + formattedDateTime : ''}.`;
            } else if (currentRequest.technician_id !== technician_id) {
                // Technician changed → notify NEW and OLD technician
                techNotificationTitle = 'New Repair Assignment';
                techNotificationMessage = `You have been reassigned a repair request${formattedDateTime ? ' scheduled on ' + formattedDateTime : ''}.`;

                // 🔔 Notify OLD Technician
                const [oldTechRows] = await con.promise().query(
                    `SELECT u.user_id 
             FROM technicians t 
             JOIN users u ON t.user_id = u.user_id 
             WHERE t.technician_id = ?`,
                    [currentRequest.technician_id]
                );

                if (oldTechRows.length > 0) {
                    addNotification(
                        oldTechRows[0].user_id,
                        'technician',
                        request_id,
                        'Repair Request Reassigned',
                        `The repair request has been reassigned to another technician, you are no longer responsible for it.`,
                        null
                    );
                }
            } else if (repair_datetime && currentRequest.repair_date !== repair_datetime) {
                // Only date/time updated
                techNotificationTitle = 'Repair Request Schedule Updated';
                techNotificationMessage = `The repair schedule has been updated to ${formattedDateTime}.`;
            }

            if (techNotificationTitle) {
                addNotification(
                    technician_user_id,
                    'technician',
                    request_id,
                    techNotificationTitle,
                    techNotificationMessage,
                    '/tech/repairlist'
                );
            }
        }


        // 🔔 Notify Admin
        const [adminRows] = await con.promise().query(`
            SELECT u.user_id, rr.article, rm.room_number, d.dorm_name
            FROM users u
            JOIN repair_requests rr ON rr.request_id = ?
            JOIN rooms rm ON rr.room_id = rm.room_id
            JOIN dormitory d ON rr.dorm_id = d.dorm_id
            WHERE u.name = 'Admin'
        `, [request_id]);

        if (adminRows.length > 0) {
            adminRows.forEach(admin => {
                addNotification(
                    admin.user_id,
                    'admin',
                    request_id,
                    notificationTitle,
                    `Repair request "${admin.article}" in ${admin.dorm_name}, room ${admin.room_number} has been ${notificationTitle === 'Repair Request Confirmed' ? 'confirmed' : 'updated'} by head technician.`,
                    '/admin/scheduled'
                );
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

app.get('/head/technician/list', async (req, res) => {
    try {
        const { category_id } = req.query;
        let sql = `
    SELECT u.name, t.phone_number, t.category_id, c.category_name
    FROM technicians t
    JOIN users u ON t.user_id = u.user_id
    JOIN category c ON t.category_id = c.category_id
    WHERE LOWER(t.job_position) = 'technician'
      AND u.status = 1
`;
        const params = [];
        if (category_id) {
            sql += ' AND t.category_id = ?';
            params.push(category_id);
        }
        const [rows] = await con.promise().query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});

app.get('/head/calendarmonth', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_CalendarMonth.html');
});
app.get('/head/calendarweek', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_CalendarWeek.html');
});
app.get('/head/calendarday', function (req, res) {
    res.sendFile(__dirname + '/views/Head/Head_CalendarDay.html');
});
app.get('/head/calendar', async (req, res) => {
    try {
        const dormId = req.query.dorm_id || '6'; // default
        const month = parseInt(req.query.month, 10); // 1-12
        const year = parseInt(req.query.year, 10);

        if (!month || !year) {
            return res.status(400).json({ error: 'Invalid month/year' });
        }

        // ดึงข้อมูลจาก repair_requests เฉพาะสถานะ Confirmed เท่านั้น
        const [rows] = await con.promise().query(`
            SELECT
                r.request_id,
                DAY(r.repair_date) as day,
                MONTH(r.repair_date) as month,
                YEAR(r.repair_date) as year,
                TIME_FORMAT(r.repair_date, '%H:%i') as time,
                r.article as item,
                r.description,
                c.category_name as category,
                rm.room_number as room,
                d.dorm_name as dormitory,
                u2.name as technician_name,
                t2.phone_number as technician_phone,
                r.status
            FROM repair_requests r
            JOIN rooms rm ON r.room_id = rm.room_id
            JOIN dormitory d ON r.dorm_id = d.dorm_id
            JOIN category c ON r.category_id = c.category_id
            LEFT JOIN technicians t2 ON r.technician_id = t2.technician_id
            LEFT JOIN users u2 ON t2.user_id = u2.user_id
            WHERE r.dorm_id = ?
              AND r.repair_date IS NOT NULL
              AND MONTH(r.repair_date) = ?
              AND YEAR(r.repair_date) = ?
              AND r.status = 'Confirmed'
        `, [dormId, month, year]);

        // แปลงข้อมูลสำหรับ frontend JS
        const categoryColorMap = {
            "General": "primary",
            "Furniture": "warning",
            "Electrical": "info",
            "Plumbing": "success",
            "Air Conditioning": "danger",
            "Air": "danger"
        };

        const events = rows.map(r => ({
            ...r,
            color: categoryColorMap[r.category] || 'secondary'
        }));

        res.json(events);
    } catch (err) {
        res.status(500).json({ error: 'Database error', message: err.message });
    }
});


// Technician
app.get('/tech/repairlist', function (req, res) {
    res.sendFile(__dirname + '/views/Tech/Tech_Repairlist.html');
});


app.get('/tech/notifications', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.json([]);

    con.query(`
        SELECT * FROM notifications
        WHERE user_id = ? AND role = 'technician'
          AND (
                title LIKE '%assign%' OR 
                title LIKE '%reassign%' OR 
                title LIKE '%schedule%' OR
                title LIKE '%feedback%'
              )
        ORDER BY created_at DESC
        LIMIT 20
    `, [userId], (err, rows) => {
        if (err) return res.json([]);
        res.json(rows);
    });
});
app.post('/tech/notifications/read-all', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');
    // อ่านเฉพาะของ role technician (หรือถ้าจะแก้ให้ทุก role ให้เอา role ออก)
    con.query(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND role = 'technician' AND is_read = 0",
        [userId], (err) => {
            if (err) return res.status(500).send('Database error');
            res.json({ success: true });
        }
    );
});
// mark as read
app.post('/tech/notifications/read/:id', (req, res) => {
    const id = req.params.id;
    con.query('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [id], (err) => {
        res.json({ success: !err });
    });
});
//  profile 
app.get('/tech/profile', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/Tech/profile_Tech.html'));
});
//  profile 
app.get('/tech/profile/data', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user_id;
    con.query(
        `SELECT 
            t.phone_number, 
            c.category_name as category
        FROM technicians t
        JOIN category c ON t.category_id = c.category_id
        WHERE t.user_id = ? AND LOWER(t.job_position) = 'technician'
        LIMIT 1
        `, [userId], (err, rows) => {
        if (err || !rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    });
});
//repair list
app.get('/tech/repairlist/data', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user_id;
    // หา technician_id จาก user_id
    con.query(
        'SELECT technician_id FROM technicians WHERE user_id = ? AND LOWER(job_position) = "technician" LIMIT 1',
        [userId], (err, techRows) => {
            if (err || !techRows.length) return res.status(403).json({ error: 'Technician not found' });
            const technician_id = techRows[0].technician_id;

            // ดึง repair requests ที่ status = 'Confirmed' และ technician_id ตรงนี้
            const sql = `
    SELECT 
        r.request_id as id,
        u.name as name,
        d.dorm_name as dorm,
        rm.room_number as room,
        r.article,
        c.category_name as type,
        r.description,
        r.image,
        DATE_FORMAT(r.repair_date, '%d/%m/%Y') as date,
        TIME_FORMAT(r.repair_date, '%H:%i') as time,
        r.status,
        hu.name as assigned_by   -- เพิ่มตรงนี้
    FROM repair_requests r
    JOIN student s ON r.student_id = s.student_id
    JOIN users u ON s.user_id = u.user_id
    JOIN dormitory d ON r.dorm_id = d.dorm_id
    JOIN rooms rm ON r.room_id = rm.room_id
    JOIN category c ON r.category_id = c.category_id
    LEFT JOIN technicians h ON r.headtech_id = h.technician_id      
    LEFT JOIN users hu ON h.user_id = hu.user_id                    
    WHERE r.technician_id = ?
      AND r.status = 'Confirmed'
    ORDER BY r.repair_date DESC
`;
            con.query(sql, [technician_id], (err, rows) => {
                if (err) return res.status(500).json({ error: 'Database error', details: err.message });
                res.json(rows);
            });
        }
    );
});
// Mark as repaired endpoint for Technician
app.post('/tech/repairlist/mark-completed', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { request_id, work_description } = req.body;
    if (!request_id || !work_description) {
        return res.status(400).json({ success: false, message: 'Missing data' });
    }

    // Only allow the assigned technician to update their job
    const userId = req.session.user_id;
    con.query(
        'SELECT technician_id FROM technicians WHERE user_id = ? AND LOWER(job_position) = "technician" LIMIT 1',
        [userId], (err, techRows) => {
            if (err || !techRows.length) return res.status(403).json({ success: false, message: 'Technician not found' });
            const technician_id = techRows[0].technician_id;

            // Make sure this repair job is assigned to this technician and status is 'Confirmed'
            con.query(
                'SELECT * FROM repair_requests WHERE request_id = ? AND technician_id = ? AND status = "Confirmed" LIMIT 1',
                [request_id, technician_id],
                (err, rows) => {
                    if (err || !rows.length) {
                        return res.status(403).json({ success: false, message: 'Repair job not found or not allowed' });
                    }
                    // Update status, work_description, complete_date
                    con.query(
                        `UPDATE repair_requests
                         SET status = 'Completed', work_description = ?, complete_date = NOW()
                         WHERE request_id = ?`,
                        [work_description, request_id],
                        (err2, result) => {
                            if (err2) {
                                return res.status(500).json({ success: false, message: 'Database error', err: err2.message });
                            }
                            return res.json({ success: true });
                        }
                    );

                    const request = rows[0];

                    // Noti After setting status to 'Completed'
                    con.query(`
    SELECT u.user_id, rr.article
    FROM repair_requests rr
    JOIN student s ON rr.student_id = s.student_id
    JOIN users u ON s.user_id = u.user_id
    WHERE rr.request_id = ?
`, [request_id], (err3, stuRows) => {
                        if (!err3 && stuRows.length > 0) {
                            addNotification(
                                stuRows[0].user_id,
                                'student',
                                request_id,
                                'Repair Completed',
                                `Your repair request "${stuRows[0].article}" has been completed.`,
                                '/student/track'
                            );
                        }
                    });

                    // 🔔 Notify Staff in same dorm
                    con.query(`
                        SELECT ds.user_id, rr.article, rm.room_number
                        FROM dorm_staff ds
                        JOIN repair_requests rr ON rr.dorm_id = ds.dorm_id
                        JOIN rooms rm ON rr.room_id = rm.room_id
                        WHERE rr.request_id = ?
                    `, [request_id], (err4, staffRows) => {
                        if (!err4 && staffRows.length > 0) {
                            staffRows.forEach(staff => {
                                addNotification(
                                    staff.user_id,
                                    'staff',
                                    request_id,
                                    'Repair Request Completed',
                                    `The repair request "${staff.article}" in room ${staff.room_number} has been completed.`,
                                    '/staff/history'
                                );
                            });
                        }
                    });

                    // 🔔 Notify Head Technician 
                    const headLink = getHeadRequestLink(request.category_id);
                    con.query(`
                        SELECT t.user_id, rr.article, rm.room_number, d.dorm_name
                        FROM technicians t
                        JOIN repair_requests rr ON rr.category_id = t.category_id
                        JOIN rooms rm ON rr.room_id = rm.room_id
                        JOIN dormitory d ON rr.dorm_id = d.dorm_id
                        WHERE rr.request_id = ? AND t.job_position LIKE '%Head%'
                    `, [request_id], (err5, headRows) => {
                        if (!err5 && headRows.length > 0) {
                            headRows.forEach(head => {
                                addNotification(
                                    head.user_id,
                                    'headtech',
                                    request_id,
                                    'Repair Request Completed',
                                    `Repair request "${head.article}" in ${head.dorm_name}, room ${head.room_number} has been completed by technician.`,
                                    headLink
                                );
                            });
                        }
                    });

                    // 🔔 Notify Admin 
                    con.query(`
                        SELECT u.user_id, rr.article, rm.room_number, d.dorm_name
                        FROM users u
                        JOIN repair_requests rr ON rr.request_id = ?
                        JOIN rooms rm ON rr.room_id = rm.room_id
                        JOIN dormitory d ON rr.dorm_id = d.dorm_id
                        WHERE u.name = 'Admin'
                    `, [request_id], (err6, adminRows) => {
                        if (!err6 && adminRows.length > 0) {
                            adminRows.forEach(admin => {
                                addNotification(
                                    admin.user_id,
                                    'admin',
                                    request_id,
                                    'Repair Request Completed',
                                    `Repair request "${admin.article}" in ${admin.dorm_name}, room ${admin.room_number} has been completed by technician.`,
                                    '/admin/history'
                                );
                            });
                        }
                    });

                }
            );
        }
    );
});

// Technician calendar data API (for month view)
app.get('/tech/calendarmonth', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/Tech/Tech_CalendarMonth.html'));
});
app.get('/tech/calendarweek', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/Tech/Tech_CalendarWeek.html'));
});
app.get('/tech/calendarday', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/Tech/Tech_CalendarDay.html'));
});
app.get('/tech/calendar/data', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.session.user_id;
    const month = parseInt(req.query.month, 10); // 1-12
    const year = parseInt(req.query.year, 10);

    if (!month || !year) {
        return res.status(400).json({ error: 'Invalid month/year' });
    }

    // หา technician_id จาก user_id
    con.query(
        'SELECT technician_id FROM technicians WHERE user_id = ? AND LOWER(job_position) = "technician" LIMIT 1',
        [userId], (err, techRows) => {
            if (err || !techRows.length) return res.status(403).json({ error: 'Technician not found' });
            const technician_id = techRows[0].technician_id;

            // ดึงชื่อคนแจ้งซ่อม (reporter_name)
            const sql = `
  SELECT
    r.request_id,
    DAY(r.repair_date) as day,
    MONTH(r.repair_date) as month,
    YEAR(r.repair_date) as year,
    TIME_FORMAT(r.repair_date, '%H:%i') as time,
    r.article as item,
    r.description,
    c.category_name as category,
    rm.room_number as room,
    d.dorm_name as dormitory,
    r.status,
    hu.name as assigned_by,
    h.phone_number as technician_phone,   -- ✅ ใช้ชื่อเดิม แต่เป็นเบอร์หัวหน้า
    stu_user.name as reporter_name
FROM repair_requests r
JOIN rooms rm ON r.room_id = rm.room_id
JOIN dormitory d ON r.dorm_id = d.dorm_id
JOIN category c ON r.category_id = c.category_id
LEFT JOIN technicians h ON r.headtech_id = h.technician_id
LEFT JOIN users hu ON h.user_id = hu.user_id
JOIN student s ON r.student_id = s.student_id
JOIN users stu_user ON s.user_id = stu_user.user_id
WHERE r.technician_id = ?
  AND r.repair_date IS NOT NULL
  AND MONTH(r.repair_date) = ?
  AND YEAR(r.repair_date) = ?
  AND r.status = 'Confirmed';


            `;
            con.query(sql, [technician_id, month, year], (err, rows) => {
                if (err) return res.status(500).json({ error: 'Database error', details: err.message });

                // Add color class for category
                const categoryColorMap = {
                    "General": "primary",
                    "Furniture": "warning",
                    "Electrical": "info",
                    "Plumbing": "success",
                    "Air Conditioning": "danger",
                    "Air": "danger"
                };
                const events = rows.map(r => ({
                    ...r,
                    color: categoryColorMap[r.category] || 'secondary'
                }));

                res.json(events);
            });
        }
    );
});
app.get('/tech/history', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/Tech/Tech_History.html'));
});
// Technician history data endpoint
app.get('/tech/history-data', (req, res) => {
    if (!req.session || !req.session.user_id) {
        return res.status(401).send('Unauthorized');
    }
    const userId = req.session.user_id;
    const dormName = req.query.dormName;
    const date = req.query.date;

    con.query(
        'SELECT technician_id FROM technicians WHERE user_id = ? AND LOWER(job_position) = "technician" LIMIT 1',
        [userId], (err, techRows) => {
            if (err || !techRows.length) {
                return res.status(403).send('Technician not found');
            }
            const technician_id = techRows[0].technician_id;

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
                    fb.rating AS feedback_score,
                    fb.comment AS feedback_comment,
                    headu.name AS assigned_by        -- เพิ่มบรรทัดนี้
                FROM repair_requests rr
                JOIN category c ON rr.category_id = c.category_id
                JOIN student s ON rr.student_id = s.student_id
                JOIN users u ON s.user_id = u.user_id
                JOIN rooms r ON s.room_id = r.room_id
                JOIN dormitory d ON s.dorm_id = d.dorm_id
                LEFT JOIN technicians t ON rr.technician_id = t.technician_id
                LEFT JOIN users techu ON t.user_id = techu.user_id
                LEFT JOIN feedback fb ON rr.request_id = fb.request_id
                LEFT JOIN technicians headt ON rr.headtech_id = headt.technician_id
                LEFT JOIN users headu ON headt.user_id = headu.user_id
                WHERE rr.status IN ('Completed', 'Cancel')
                  AND rr.technician_id = ?
            `;
            const params = [technician_id];
            if (dormName && dormName !== "") {
                query += " AND d.dorm_name = ?";
                params.push(dormName);
            }
            if (date) {
                query += " AND DATE(rr.request_date) = ?";
                params.push(date);
            }

            query += " ORDER BY rr.complete_date DESC";

            con.query(query, params, (err, results) => {
                if (err) {
                    console.log("Database error:", err);
                    return res.status(500).send('Database error');
                }
                res.json(results);
            });
        }
    );
});


// Admin
// Get admin notifications
app.get('/admin/notifications', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    const sql = `
        SELECT n.notification_id, n.title, n.message, n.link, n.is_read, n.created_at,
               rr.article, rr.status AS request_status, d.dorm_name, r.room_number
        FROM notifications n
        LEFT JOIN repair_requests rr ON n.request_id = rr.request_id
        LEFT JOIN dormitory d ON rr.dorm_id = d.dorm_id
        LEFT JOIN rooms r ON rr.room_id = r.room_id
        WHERE n.role = 'admin' AND n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 30
    `;
    con.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.json(results);
    });
});

// Mark one as read
app.post('/admin/notifications/read', (req, res) => {
    const { notification_id } = req.body;
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    con.query(
        `UPDATE notifications SET is_read = 1 
         WHERE notification_id = ? AND user_id = ?`,
        [notification_id, userId],
        (err) => {
            if (err) return res.status(500).send('Database error');
            res.json({ success: true });
        }
    );
});

// Mark all as read
app.post('/admin/notifications/read-all', (req, res) => {
    const userId = req.session.user_id;
    if (!userId) return res.status(401).send('Unauthorized');

    con.query(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND role = 'admin' AND is_read = 0`,
        [userId],
        (err) => {
            if (err) return res.status(500).send('Database error');
            res.json({ success: true });
        }
    );
});


app.get('/admin/dashboard', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_dashboard.html');
});
// 2. Dashboard summary cards (total, pending, confirmed, completed)
app.get('/admin/dashboard/summary', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT 
            COUNT(*) as total,
            SUM(status='Pending') as pending,
            SUM(status='Confirmed') as confirmed,
            SUM(status='Completed') as completed,
            SUM(status='Cancel') as cancel
        FROM repair_requests r
        JOIN dormitory d ON r.dorm_id = d.dorm_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows[0]);
    });
});

// 3. Dashboard: category chart (top types)
app.get('/admin/dashboard/category-chart', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT c.category_name, COUNT(*) as count
        FROM repair_requests r
        JOIN category c ON r.category_id = c.category_id
        JOIN dormitory d ON r.dorm_id = d.dorm_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    sql += ' GROUP BY r.category_id ORDER BY count DESC LIMIT 10';
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4. Dashboard: top 5 repair rooms
app.get('/admin/dashboard/room-chart', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT r.room_number, COUNT(*) as count
        FROM repair_requests req
        JOIN rooms r ON req.room_id = r.room_id
        JOIN dormitory d ON req.dorm_id = d.dorm_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    sql += ' GROUP BY req.room_id ORDER BY count DESC LIMIT 5';
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 5. Dashboard: recent repairs table
app.get('/admin/dashboard/recent', (req, res) => {
    const dorm = req.query.dorm;
    let sql = `
        SELECT req.request_date, u.name as reporter, u.email, req.article, req.description, r.room_number,
               tuser.name as technician, t.phone_number, req.status
        FROM repair_requests req
        JOIN student s ON req.student_id = s.student_id
        JOIN users u ON s.user_id = u.user_id
        JOIN rooms r ON req.room_id = r.room_id
        JOIN dormitory d ON req.dorm_id = d.dorm_id
        LEFT JOIN technicians t ON req.technician_id = t.technician_id
        LEFT JOIN users tuser ON t.user_id = tuser.user_id
    `;
    const params = [];
    if (dorm) {
        sql += ' WHERE d.dorm_name = ?';
        params.push(dorm);
    }
    sql += ' ORDER BY req.request_date DESC LIMIT 10';
    con.query(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.get('/admin/dormitory', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_dorm.html');
});
app.get('/admin/history', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_history.html');
});
app.get('/admin/report', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_report.html');
});
app.get('/admin/rooms', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_rooms.html');
});
app.get('/admin/scheduled', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_scheduled.html');
});
app.get('/admin/sidebar', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_sidebar.html');
});
app.get('/admin/staff', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_staff.html');
});
app.get('/admin/tech', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_tech.html');
});
app.get('/admin/user', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_user.html');
});
app.get('/admin/users', (req, res) => {
    res.sendFile(__dirname + '/views/admin/admin_users.html');
});
const technicianRouter = require('./routes/admin_techapi');
app.use('/api/technicians', technicianRouter);
const dormitoryRouter = require('./routes/admin_dormapi');
app.use('/api/dormitory', dormitoryRouter);
const adminReapiRouter = require('./routes/admin_reapi');
app.use('/admin/api', adminReapiRouter);
const adminHistoryRouter = require('./routes/admin_hisapi');
app.use('/admin/api', adminHistoryRouter);
const adminScheapiRouter = require('./routes/admin_scheapi');
app.use('/admin/api', adminScheapiRouter);

// ดึงรายชื่อหอพัก
app.get('/admin/dormitories', (req, res) => {
    con.query('SELECT dorm_name FROM dormitory ORDER BY dorm_name', (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

// ดึงโรงเรียนทั้งหมด
app.get('/api/schools', (req, res) => {
    con.query('SELECT * FROM school', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// ดึงสาขาทั้งหมด (filter ตามโรงเรียนได้)
app.get('/api/majors', (req, res) => {
    const school_id = req.query.school_id;
    let sql = 'SELECT * FROM major';
    if (school_id) {
        sql += ' WHERE school_id = ?';
        con.query(sql, [school_id], (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(results);
        });
    } else {
        con.query(sql, (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(results);
        });
    }
});

// ดึงหอพักทั้งหมด
app.get('/api/dormitory', (req, res) => {
    con.query('SELECT * FROM dormitory', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// ดึงห้องทั้งหมด (filter ตาม dorm ได้)
app.get('/api/rooms', (req, res) => {
    const dorm_id = req.query.dorm_id;
    let sql = 'SELECT * FROM rooms';
    if (dorm_id) {
        sql += ' WHERE dorm_id = ? ORDER BY room_number ASC';
        con.query(sql, [dorm_id], (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(results);
        });
    } else {
        sql += ' ORDER BY room_number ASC';
        con.query(sql, (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(results);
        });
    }
});

// ดึงนักเรียนทั้งหมด (join users.status)
app.get('/api/students', (req, res) => {
    const sql = `
      SELECT s.student_id, u.name, u.email, u.status, sc.school_id, sc.school_name, m.major_id, m.major_name, d.dorm_id, d.dorm_name, r.room_id, r.room_number
      FROM student s
      JOIN users u ON s.user_id = u.user_id
      JOIN school sc ON s.school_id = sc.school_id
      JOIN major m ON s.major_id = m.major_id
      JOIN dormitory d ON s.dorm_id = d.dorm_id
      JOIN rooms r ON s.room_id = r.room_id
    `;
    con.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// เพิ่มนักเรียนใหม่ (status=1 ถ้า id/email เดิมแต่ถูก disable จะ re-enable)
// เพิ่มนักเรียนใหม่ (หรือ re-enable) password จะเป็น NULL
app.post('/api/students', (req, res) => {
    const { student_id, name, email, school_id, major_id, dorm_id, room_id } = req.body;
    const checkSql = `
        SELECT s.student_id, u.user_id, u.status
        FROM student s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.student_id = ? OR u.email = ?
    `;
    // ตรวจสอบว่ามี student_id หรือ email นี้ในระบบหรือยัง
    con.query(checkSql, [student_id, email], (err, rows) => {
        if (err) return res.status(500).json({ error: err });

        // เช็คความจุห้องก่อนเพิ่มคน (ไม่ว่าจะกรณีใหม่หรือ re-enable)
        con.query("SELECT room_capacity FROM rooms WHERE room_id = ?", [room_id], (errRoom, roomRows) => {
            if (errRoom || roomRows.length === 0) return res.status(400).json({ error: "Room not found" });
            const capacity = roomRows[0].room_capacity;
            con.query("SELECT COUNT(*) as count FROM student WHERE room_id = ? AND dorm_id = ?", [room_id, dorm_id], (err2, stuRows) => {
                if (err2) return res.status(500).json({ error: err2 });
                if (stuRows[0].count >= capacity) return res.status(400).json({ error: "This room is full." });

                if (rows.length > 0) {
                    const exist = rows[0];
                    if (exist.status == 1) {
                        return res.status(400).json({ error: "This Student ID or email is already active in the system." });
                    }
                    // update users พร้อม set password=NULL
                    con.query("UPDATE users SET name=?, email=?, password=NULL, status=1 WHERE user_id=?", [name, email, exist.user_id], (err2) => {
                        if (err2) return res.status(500).json({ error: err2 });
                        const stuUpdateSql = "UPDATE student SET school_id=?, major_id=?, dorm_id=?, room_id=? WHERE student_id=?";
                        con.query(stuUpdateSql, [school_id, major_id, dorm_id, room_id, student_id], (err3) => {
                            if (err3) return res.status(500).json({ error: err3 });
                            return res.json({ success: true, message: "Re-enabled student, updated info, and reset password to NULL." });
                        });
                    });
                } else {
                    // สร้างใหม่ password=NULL
                    const userSql = "INSERT INTO users (name, email, password, status) VALUES (?, ?, NULL, 1)";
                    con.query(userSql, [name, email], (err, userResult) => {
                        if (err) return res.status(500).json({ error: err });
                        const user_id = userResult.insertId;
                        const stuSql = "INSERT INTO student (student_id, school_id, major_id, dorm_id, room_id, user_id) VALUES (?, ?, ?, ?, ?, ?)";
                        con.query(stuSql, [student_id, school_id, major_id, dorm_id, room_id, user_id], (err2) => {
                            if (err2) return res.status(500).json({ error: err2 });
                            res.json({ success: true });

                            // 🔔 Notify Staff in same dorm about new student
                            con.query(`
                                SELECT ds.user_id, d.dorm_name, r.room_number, u.name
                                FROM dorm_staff ds
                                JOIN dormitory d ON ds.dorm_id = d.dorm_id
                                JOIN rooms r ON r.room_id = ?
                                JOIN student s ON s.room_id = r.room_id
                                JOIN users u ON s.user_id = u.user_id
                                WHERE s.student_id = ?
                            `, [room_id, student_id], (errStaff, staffRows) => {
                                if (!errStaff && staffRows.length > 0) {
                                    staffRows.forEach(staff => {
                                        addNotification(
                                            staff.user_id,
                                            'staff',
                                            null, // ไม่เกี่ยวกับ request_id
                                            'New Student Added',
                                            `Student "${staff.name}" has been assigned to room ${staff.room_number} in ${staff.dorm_name}.`,
                                            '/staff/list'
                                        );
                                    });
                                }
                            });

                        });
                    });
                }
            });
        });
    });
});

// แก้ไขข้อมูลนักเรียน
app.put('/api/students/:student_id', (req, res) => {
    const { name, email, school_id, major_id, dorm_id, room_id } = req.body;
    const student_id = req.params.student_id;

    // ดึงข้อมูลเดิมของนักศึกษา
    con.query(`
        SELECT s.user_id, s.dorm_id AS old_dorm_id, s.room_id AS old_room_id, 
               u.name AS old_name, u.email AS old_email, d.dorm_name AS old_dorm_name, r.room_number AS old_room_number
        FROM student s
        JOIN users u ON s.user_id = u.user_id
        JOIN dormitory d ON s.dorm_id = d.dorm_id
        JOIN rooms r ON s.room_id = r.room_id
        WHERE s.student_id = ?
    `, [student_id], (err, result) => {
        if (err || result.length === 0) return res.status(404).json({ error: 'Student not found' });

        const oldData = result[0];
        const user_id = oldData.user_id;

        // อัพเดตข้อมูลในตาราง users
        con.query("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [name, email, user_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });

            // อัพเดตข้อมูลในตาราง student
            const sql = "UPDATE student SET school_id = ?, major_id = ?, dorm_id = ?, room_id = ? WHERE student_id = ?";
            con.query(sql, [school_id, major_id, dorm_id, room_id, student_id], (err3) => {
                if (err3) return res.status(500).json({ error: err3 });

                // ---------------------------
                // 🔎 ตรวจสอบความเปลี่ยนแปลง
                // ---------------------------

                if (oldData.old_dorm_id != dorm_id) {
                    // 📌 กรณีย้ายหอ/ห้อง
                    con.query(`
                        SELECT d.dorm_name, r.room_number
                        FROM dormitory d
                        JOIN rooms r ON r.room_id = ?
                        WHERE d.dorm_id = ?
                    `, [room_id, dorm_id], (err4, newInfo) => {
                        if (!err4 && newInfo.length > 0) {
                            const newDormName = newInfo[0].dorm_name;
                            const newRoomNumber = newInfo[0].room_number;

                            // แจ้งเตือน staff ของหอใหม่
                            con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [dorm_id], (errStaff, staffRows) => {
                                if (!errStaff && staffRows.length > 0) {
                                    staffRows.forEach(staff => {
                                        addNotification(
                                            staff.user_id,
                                            'staff',
                                            null,
                                            'Student Transferred',
                                            `Student "${name}" has been transferred to ${newDormName}, room ${newRoomNumber}.`,
                                            '/staff/list'
                                        );
                                    });
                                }
                            });
                        }
                    });

                } else {
                    // 📌 กรณีอัพเดตข้อมูลทั่วไป (แต่ยังอยู่หอเดิม)
                    con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [dorm_id], (errStaff, staffRows) => {
                        if (!errStaff && staffRows.length > 0) {
                            staffRows.forEach(staff => {
                                addNotification(
                                    staff.user_id,
                                    'staff',
                                    null,
                                    'Student Info Updated',
                                    `Student "${name}" in room ${oldData.old_room_number}, ${oldData.old_dorm_name} has updated their information.`,
                                    '/staff/list'
                                );
                            });
                        }
                    });
                }

                res.json({ success: true });
            });
        });
    });
});


// ปิดการใช้งานนักเรียน (disable user)
app.delete('/api/students/:student_id', (req, res) => {
    const student_id = req.params.student_id;

    // ดึงข้อมูลนักเรียนพร้อม dorm และ room
    const query = `
        SELECT s.user_id, u.name, s.dorm_id, r.room_number, d.dorm_name
        FROM student s
        JOIN users u ON s.user_id = u.user_id
        JOIN rooms r ON s.room_id = r.room_id
        JOIN dormitory d ON s.dorm_id = d.dorm_id
        WHERE s.student_id = ?
    `;
    con.query(query, [student_id], (err, result) => {
        if (err || result.length === 0) return res.status(404).json({ error: 'Student not found' });

        const { user_id, name, dorm_id, room_number, dorm_name } = result[0];

        // ปิดการใช้งาน user
        con.query("UPDATE users SET status = 0 WHERE user_id = ?", [user_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });

            // 🔔 แจ้งเตือน staff ทุกคนใน dorm นี้
            con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [dorm_id], (errStaff, staffRows) => {
                if (!errStaff && staffRows.length > 0) {
                    staffRows.forEach(staff => {
                        addNotification(
                            staff.user_id,
                            'staff',
                            null, // ไม่มี request_id
                            'Student Disabled',
                            `Student "${name}" from room ${room_number}, ${dorm_name} has been disabled.`,
                            '/staff/list'
                        );
                    });
                }
            });

            res.json({ success: true });
        });
    });
});

// ---- จุดสำคัญที่แก้ไข ----
// Upload Student File (import) - reset password เป็น NULL กรณี re-enable
const uploads = multer({ storage: multer.memoryStorage() });

app.post('/api/students/import', uploads.single('studentFile'), async (req, res) => {
    if (!req.file) return res.json({ success: false, message: "No file uploaded" });
    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        // ดึงข้อมูล mapping
        const [schools, majors, dorms, rooms, allStudents] = await Promise.all([
            new Promise((resolve, reject) => con.query("SELECT * FROM school", (err, rows) => err ? reject(err) : resolve(rows))),
            new Promise((resolve, reject) => con.query("SELECT * FROM major", (err, rows) => err ? reject(err) : resolve(rows))),
            new Promise((resolve, reject) => con.query("SELECT * FROM dormitory", (err, rows) => err ? reject(err) : resolve(rows))),
            new Promise((resolve, reject) => con.query("SELECT * FROM rooms", (err, rows) => err ? reject(err) : resolve(rows))),
            new Promise((resolve, reject) =>
                con.query("SELECT s.student_id, u.email, u.status, u.user_id, s.room_id FROM student s JOIN users u ON s.user_id = u.user_id", (err, rows) => err ? reject(err) : resolve(rows))
            ),
        ]);

        let importedList = [];
        let skippedList = [];
        let dormImportCount = {};
        // map room_id -> คนที่อยู่
        const roomStudentCount = {};
        rooms.forEach(r => roomStudentCount[r.room_id] = 0);
        allStudents.forEach(stu => {
            if (stu.status === 1 || stu.status === "1") {
                roomStudentCount[stu.room_id] = (roomStudentCount[stu.room_id] || 0) + 1;
            }
        });

        for (const stu of rows) {
            const sName = stu['School Name'] ? String(stu['School Name']).trim() : "";
            const mName = stu['Major Name'] ? String(stu['Major Name']).trim() : "";
            const dName = stu['Dorm Name'] ? String(stu['Dorm Name']).trim() : "";
            const rNumber = stu['Room Number'] ? String(stu['Room Number']).trim() : "";
            const student_id = stu['Student ID'] ? String(stu['Student ID']).trim() : "";
            const email = stu['Email'] ? String(stu['Email']).trim() : "";
            const name = stu['Name'] ? String(stu['Name']).trim() : "";

            const school = schools.find(x => x.school_name.trim() == sName);
            const major = majors.find(x => x.major_name.trim() == mName);
            const dorm = dorms.find(x => x.dorm_name.trim() == dName);
            const room = rooms.find(x => x.room_number.trim() == rNumber && x.dorm_id == dorm?.dorm_id);

            // ถ้า mapping ไม่ครบ ให้ข้าม (แต่ไม่โชว์ใน skippedList)
            if (!school || !major || !dorm || !room) continue;

            // check ซ้ำในระบบ
            const exist = allStudents.find(s => s.student_id === student_id || s.email === email);

            // เช็คความจุห้อง
            if (roomStudentCount[room.room_id] >= room.room_capacity && (!exist || exist.status != 1)) {
                skippedList.push(`Student ${student_id}: room ${room.room_number} is full`);
                continue;
            }

            if (exist) {
                if (exist.status == 1) {
                    skippedList.push(`Student ${student_id} (${email}): already active`);
                    continue;
                } else {
                    // 👉 re-enable + update student details
                    await new Promise((resolve, reject) =>
                        con.query(
                            "UPDATE users SET name=?, status=1, password=NULL WHERE user_id=?",
                            [name, exist.user_id],
                            (err) => err ? reject(err) : resolve()
                        )
                    );

                    await new Promise((resolve, reject) =>
                        con.query(
                            `UPDATE student 
             SET school_id=?, major_id=?, dorm_id=?, room_id=? 
             WHERE user_id=?`,
                            [school.school_id, major.major_id, dorm.dorm_id, room.room_id, exist.user_id],
                            (err) => err ? reject(err) : resolve()
                        )
                    );

                    importedList.push({ student_id, name, email });
                    roomStudentCount[room.room_id]++;
                    dormImportCount[dorm.dorm_id] = (dormImportCount[dorm.dorm_id] || 0) + 1;
                    continue;
                }

            }

            // เพิ่มใหม่
            const userResult = await new Promise((resolve, reject) =>
                con.query("INSERT INTO users (name, email, password, status) VALUES (?, ?, NULL, 1)", [name, email], (err, result) => err ? reject(err) : resolve(result))
            );
            const user_id = userResult.insertId;

            await new Promise((resolve, reject) =>
                con.query(
                    "INSERT INTO student (student_id, school_id, major_id, dorm_id, room_id, user_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [student_id, school.school_id, major.major_id, dorm.dorm_id, room.room_id, user_id],
                    (err) => err ? reject(err) : resolve()
                )
            );
            importedList.push({ student_id, name, email });
            roomStudentCount[room.room_id]++;
            dormImportCount[dorm.dorm_id] = (dormImportCount[dorm.dorm_id] || 0) + 1;
        }


        // 🔔 แจ้งเตือน staff ของแต่ละหอเพียงครั้งเดียว
        for (const [dormId, count] of Object.entries(dormImportCount)) {
            con.query(`
                SELECT ds.user_id, d.dorm_name
                FROM dorm_staff ds
                JOIN dormitory d ON ds.dorm_id = d.dorm_id
                WHERE ds.dorm_id = ?
            `, [dormId], (errStaff, staffRows) => {
                if (!errStaff && staffRows.length > 0) {
                    staffRows.forEach(staff => {
                        addNotification(
                            staff.user_id,
                            'staff',
                            null,
                            'Students Imported',
                            `${count} new students have been added to ${staffRows[0].dorm_name} via file import.`,
                            '/staff/list'
                        );
                    });
                }
            });
        }
        let message = `Imported: ${importedList.length} students.`;
        if (skippedList.length) message += ` Skipped: ${skippedList.join("; ")}`;
        res.json({ success: true, message, importedList, skippedList });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Import error: " + err.message });
    }
});

// ปิดการใช้งานนักเรียนทั้งหมด
app.delete('/api/students/all', async (req, res) => {
    try {
        con.query("SELECT user_id FROM student", (err, rows) => {
            if (err) return res.json({ success: false, message: err.message });
            const userIds = rows.map(r => r.user_id);
            if (userIds.length > 0) {
                con.query("UPDATE users SET status = 0 WHERE user_id IN (?)", [userIds], (err2) => {
                    if (err2) return res.json({ success: false, message: err2.message });

                    // 🔔 Notify staff of each dorm (just once per dorm)
                    const dormMap = new Map(); // dorm_id -> dorm_name
                    rows.forEach(r => dormMap.set(r.dorm_id, r.dorm_name));

                    dormMap.forEach((dormName, dormId) => {
                        con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [dormId], (err3, staffRows) => {
                            if (!err3 && staffRows.length > 0) {
                                staffRows.forEach(staff => {
                                    addNotification(
                                        staff.user_id,
                                        'staff',
                                        null,
                                        'All Students Disabled',
                                        `All students in dormitory "${dormName}" have been disabled.`,
                                        '/staff/list'
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
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ดึง staff ทั้งหมด (join users.status)
app.get('/api/staffs', (req, res) => {
    const sql = `
      SELECT s.staff_id, u.name, u.email, s.phone_number, d.dorm_id, d.dorm_name, u.status
      FROM dorm_staff s
      JOIN users u ON s.user_id = u.user_id
      JOIN dormitory d ON s.dorm_id = d.dorm_id
    `;
    con.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// เพิ่ม staff (ถ้ามี email เดิมแต่ถูก disable ให้รีเซ็ตรหัสผ่านเป็น NULL และ enable ใหม่)
app.post('/api/staffs', (req, res) => {
    const { name, email, phone_number, dorm_id } = req.body;
    // ตรวจสอบ email ซ้ำใน users
    con.query("SELECT u.user_id, u.status, s.staff_id FROM users u LEFT JOIN dorm_staff s ON u.user_id = s.user_id WHERE u.email = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (rows.length > 0) {
            const exist = rows[0];
            if (exist.status == 1) {
                // ✅ คืน message ให้ frontend ใช้งาน
                return res.status(400).json({ success: false, message: "This email is already active in the system." });
            }
            // ถ้า status=0 (disable) ให้ update users/status=1, password=NULL และ dorm_staff
            con.query("UPDATE users SET name=?, password=NULL, status=1 WHERE user_id=?", [name, exist.user_id], (err2) => {
                if (err2) return res.status(500).json({ success: false, message: err2.message });
                // update dorm_staff
                if (exist.staff_id) {
                    con.query("UPDATE dorm_staff SET phone_number=?, dorm_id=? WHERE staff_id=?", [phone_number, dorm_id, exist.staff_id], (err3) => {
                        if (err3) return res.status(500).json({ success: false, message: err3.message });
                        res.json({ success: true, message: "Re-enabled staff, updated info, and reset password to NULL." });
                    });
                } else {
                    // ถ้าไม่มี dorm_staff record ให้ insert ใหม่
                    con.query("INSERT INTO dorm_staff (phone_number, dorm_id, user_id) VALUES (?, ?, ?)", [phone_number, dorm_id, exist.user_id], (err4) => {
                        if (err4) return res.status(500).json({ success: false, message: err4.message });
                        res.json({ success: true, message: "Re-enabled staff, created dorm_staff record, and reset password to NULL." });
                    });
                }
            });
        } else {
            // ไม่มีซ้ำ สร้างใหม่ (password=NULL)
            const userSql = "INSERT INTO users (name, email, password, status) VALUES (?, ?, NULL, 1)";
            con.query(userSql, [name, email], (err, userResult) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                const user_id = userResult.insertId;
                const staffSql = "INSERT INTO dorm_staff (phone_number, dorm_id, user_id) VALUES (?, ?, ?)";
                con.query(staffSql, [phone_number, dorm_id, user_id], (err2) => {
                    if (err2) return res.status(500).json({ success: false, message: err2.message });
                    res.json({ success: true, message: "Staff added successfully!" });
                });
            });
        }
    });
});

// Import staff Excel (status=1, ถ้ามี email เดิมแต่ถูก disable ให้ enable ใหม่ พร้อม password=NULL)
const uploaded = multer({ storage: multer.memoryStorage() });
app.post('/api/staffs/import', uploaded.single('staffFile'), async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.json({ success: false, message: "No file uploaded or file is invalid." });
    }
    try {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return res.json({ success: false, message: "No sheet found in the uploaded file." });
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        if (!rows || rows.length === 0) {
            return res.json({ success: false, message: "No data found in the sheet." });
        }

        const dorms = await new Promise((resolve, reject) =>
            con.query("SELECT * FROM dormitory", (err, rows) => err ? reject(err) : resolve(rows))
        );
        const allStaffs = await new Promise((resolve, reject) =>
            con.query(`SELECT u.user_id, u.email, u.status, s.staff_id, u.name FROM users u LEFT JOIN dorm_staff s ON u.user_id = s.user_id`, (err, rows) => err ? reject(err) : resolve(rows))
        );

        let importedList = [];
        let failedRows = [];

        for (const staff of rows) {
            const dormName = (staff['Dorm Name'] || '').trim();
            const dorm = dorms.find(x => x.dorm_name.trim() === dormName);
            const name = (staff['Name'] || '').trim();
            const email = (staff['Email'] || '').trim();
            const phone = (staff['Phone'] || '').trim();

            if (!dorm) {
                failedRows.push(`Dorm not found for staff ${email || '[no email]'}`);
                continue;
            }
            if (!name || !email || !phone) {
                failedRows.push(`Missing required field for staff (Email: ${email || '[no email]'})`);
                continue;
            }

            const exist = allStaffs.find(s => s.email === email);
            if (exist) {
                if (exist.status == 1) {
                    failedRows.push(`Staff ${email} is already active`);
                    continue;
                }
                // enable user + reset password
                await new Promise((resolve, reject) =>
                    con.query("UPDATE users SET name=?, password=NULL, status=1 WHERE user_id=?", [name, exist.user_id], (err) => err ? reject(err) : resolve())
                );
                if (exist.staff_id) {
                    await new Promise((resolve, reject) =>
                        con.query("UPDATE dorm_staff SET phone_number=?, dorm_id=? WHERE staff_id=?", [phone, dorm.dorm_id, exist.staff_id], (err) => err ? reject(err) : resolve())
                    );
                } else {
                    await new Promise((resolve, reject) =>
                        con.query("INSERT INTO dorm_staff (phone_number, dorm_id, user_id) VALUES (?, ?, ?)", [phone, dorm.dorm_id, exist.user_id], (err) => err ? reject(err) : resolve())
                    );
                }
                importedList.push({ email, name, dorm_name: dorm.dorm_name });
            } else {
                // เพิ่มใหม่ password=NULL
                const userResult = await new Promise((resolve, reject) =>
                    con.query("INSERT INTO users (name, email, password, status) VALUES (?, ?, NULL, 1)", [name, email], (err, result) => err ? reject(err) : resolve(result))
                );
                const user_id = userResult.insertId;
                await new Promise((resolve, reject) =>
                    con.query("INSERT INTO dorm_staff (phone_number, dorm_id, user_id) VALUES (?, ?, ?)",
                        [phone, dorm.dorm_id, user_id],
                        (err) => err ? reject(err) : resolve()
                    )
                );
                importedList.push({ email, name, dorm_name: dorm.dorm_name });
            }
        }
        let message = `Imported: ${importedList.length} staff(s).`;
        if (failedRows.length) message += ` Skipped: ${failedRows.join("; ")}`;

        // ส่งกลับแบบเป็นระเบียบ
        res.json({ success: true, message, importedList, failedRows });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Import error: " + err.message });
    }
});


// แก้ไข staff
app.put('/api/staffs/:staff_id', (req, res) => {
    const { name, phone_number, dorm_id } = req.body;
    const staff_id = req.params.staff_id;
    con.query("SELECT user_id FROM dorm_staff WHERE staff_id = ?", [staff_id], (err, result) => {
        if (err || result.length === 0) return res.status(404).json({ error: 'Staff not found' });
        const user_id = result[0].user_id;
        con.query("UPDATE users SET name = ? WHERE user_id = ?", [name, user_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });
            con.query("UPDATE dorm_staff SET phone_number = ?, dorm_id = ? WHERE staff_id = ?", [phone_number, dorm_id, staff_id], (err3) => {
                if (err3) return res.status(500).json({ error: err3 });
                res.json({ success: true });
            });
        });
    });
});

// ปิดการใช้งาน staff (disable user)
app.delete('/api/staffs/:staff_id', (req, res) => {
    const staff_id = req.params.staff_id;
    con.query("SELECT user_id FROM dorm_staff WHERE staff_id = ?", [staff_id], (err, result) => {
        if (err || result.length === 0) return res.status(404).json({ error: 'Staff not found' });
        const user_id = result[0].user_id;
        con.query("UPDATE users SET status = 0 WHERE user_id = ?", [user_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2 });
            res.json({ success: true });
        });
    });
});


// ปิดการใช้งาน staff ทั้งหมด
app.delete('/api/staffs/all', async (req, res) => {
    try {
        con.query("SELECT user_id FROM dorm_staff", (err, rows) => {
            if (err) return res.json({ success: false, message: err.message });
            const userIds = rows.map(r => r.user_id);
            if (userIds.length > 0) {
                con.query("UPDATE users SET status = 0 WHERE user_id IN (?)", [userIds], (err2) => {
                    if (err2) return res.json({ success: false, message: err2.message });
                    res.json({ success: true });
                });
            } else {
                res.json({ success: true });
            }
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Manage Room (เพิ่มเช็คจำนวนห้องไม่เกิน dorm_capacity และเช็คหมายเลขห้องซ้ำ)
app.post('/api/rooms/add', (req, res) => {
    const { dorm_id, room_number, room_capacity } = req.body;
    if (!dorm_id || !room_number || !room_capacity) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }
    // 1. เช็คว่าหมายเลขห้องซ้ำในหอเดียวกันหรือยัง
    const sqlCheck = "SELECT * FROM rooms WHERE dorm_id = ? AND room_number = ?";
    con.query(sqlCheck, [dorm_id, room_number], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (rows.length > 0) {
            return res.status(400).json({ success: false, message: "This room number already exists in this dormitory." });
        }
        // 2. เช็คจำนวนห้องในหอพักไม่เกิน dorm_capacity
        con.query("SELECT dorm_capacity FROM dormitory WHERE dorm_id = ?", [dorm_id], (err2, dormRows) => {
            if (err2) return res.status(500).json({ success: false, message: err2.message });
            if (dormRows.length == 0) {
                return res.status(404).json({ success: false, message: "Dormitory not found." });
            }
            const dormCapacity = parseInt(dormRows[0].dorm_capacity);

            con.query("SELECT COUNT(*) AS room_count FROM rooms WHERE dorm_id = ?", [dorm_id], (err3, countRows) => {
                if (err3) return res.status(500).json({ success: false, message: err3.message });
                const actualRooms = countRows[0].room_count;
                if (actualRooms >= dormCapacity) {
                    return res.status(400).json({ success: false, message: `Cannot add room: maximum number of rooms (${dormCapacity}) reached for this dormitory.` });
                }
                // ถ้าไม่ซ้ำและจำนวนห้องยังไม่เกิน ให้เพิ่มได้
                const sql = "INSERT INTO rooms (dorm_id, room_number, room_capacity) VALUES (?, ?, ?)";
                con.query(sql, [dorm_id, room_number, room_capacity], (err, result) => {
                    if (err) return res.status(500).json({ success: false, message: err.message });

                    // 🔔 แจ้งเตือน staff ของ dorm_id นี้
                    con.query("SELECT dorm_name FROM dormitory WHERE dorm_id = ?", [dorm_id], (err2, dormRows) => {
                        if (!err2 && dormRows.length > 0) {
                            const dormName = dormRows[0].dorm_name;
                            con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [dorm_id], (err3, staffRows) => {
                                if (!err3 && staffRows.length > 0) {
                                    staffRows.forEach(staff => {
                                        addNotification(
                                            staff.user_id,
                                            'staff',
                                            null,
                                            'Room Added',
                                            `Room ${room_number} (Capacity: ${room_capacity}) has been added to ${dormName}.`,
                                            null
                                        );
                                    });
                                }
                            });
                        }
                    });

                    res.json({ success: true });
                });
            });
        });
    });
});

app.put('/api/rooms/:room_id', (req, res) => {
    const { room_number, room_capacity } = req.body;
    const room_id = req.params.room_id;
    if (!room_id || !room_number || !room_capacity) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // ดึงข้อมูลเก่าก่อน (รวม dorm_id)
    con.query(`
        SELECT r.room_number, r.room_capacity, r.dorm_id, d.dorm_name
        FROM rooms r
        JOIN dormitory d ON r.dorm_id = d.dorm_id
        WHERE r.room_id = ?
    `, [room_id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).json({ success: false, message: "Room not found" });

        const old = rows[0];

        // เช็คเลขห้องซ้ำในหอเดียวกัน (ยกเว้นห้องนี้)
        con.query(
            "SELECT * FROM rooms WHERE dorm_id = ? AND room_number = ? AND room_id != ?",
            [old.dorm_id, room_number, room_id],
            (errDup, dupRows) => {
                if (errDup) return res.status(500).json({ success: false, message: errDup.message });
                if (dupRows.length > 0) {
                    return res.status(400).json({ success: false, message: "This room number already exists in this dormitory." });
                }

                // เช็คจำนวนคนในห้อง (active)
                con.query(
                    "SELECT COUNT(*) AS cnt FROM student s JOIN users u ON s.user_id=u.user_id WHERE s.room_id = ? AND u.status=1",
                    [room_id],
                    (errStu, stuRows) => {
                        if (errStu) return res.status(500).json({ success: false, message: errStu.message });
                        const peopleInRoom = stuRows[0]?.cnt || 0;
                        if (Number(room_capacity) < peopleInRoom) {
                            return res.status(400).json({ success: false, message: `There are currently ${peopleInRoom} people in this room. Capacity must be at least ${peopleInRoom}.` });
                        }

                        // ผ่านทุกเงื่อนไข อัปเดตห้อง
                        const sql = "UPDATE rooms SET room_number = ?, room_capacity = ? WHERE room_id = ?";
                        con.query(sql, [room_number, room_capacity, room_id], (err2) => {
                            if (err2) return res.status(500).json({ success: false, message: err2.message });

                            // 🔔 แจ้งเตือน staff ของ dorm
                            con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [old.dorm_id], (err3, staffRows) => {
                                if (!err3 && staffRows.length > 0) {
                                    staffRows.forEach(staff => {
                                        let msg;
                                        if (old.room_capacity !== room_capacity) {
                                            msg = `Room ${room_number} in ${old.dorm_name} capacity changed from ${old.room_capacity} → ${room_capacity}.`;
                                        } else {
                                            msg = `Room ${old.room_number} in ${old.dorm_name} has been updated (new number: ${room_number}).`;
                                        }
                                        addNotification(
                                            staff.user_id,
                                            'staff',
                                            null,
                                            'Room Updated',
                                            msg,
                                            null
                                        );
                                    });
                                }
                            });

                            res.json({ success: true });
                        });
                    }
                );
            }
        );
    });
});


app.delete('/api/rooms/:room_id', (req, res) => {
    const room_id = req.params.room_id;
    if (!room_id) {
        return res.status(400).json({ success: false, message: "Missing room_id" });
    }
    // เช็คก่อนว่าห้องนี้มี student อยู่หรือไม่
    con.query("SELECT COUNT(*) as count FROM student WHERE room_id = ?", [room_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (rows[0].count > 0) {
            return res.json({ success: false, message: "Room has users" });
        }

        // ดึงข้อมูลเก่าไว้สำหรับแจ้งเตือน
        con.query(`
            SELECT r.room_number, d.dorm_id, d.dorm_name
            FROM rooms r
            JOIN dormitory d ON r.dorm_id = d.dorm_id
            WHERE r.room_id = ?
        `, [room_id], (err2, oldRows) => {
            if (err2 || oldRows.length === 0) return res.status(404).json({ success: false, message: "Room not found" });
            const old = oldRows[0];

            con.query("DELETE FROM rooms WHERE room_id = ?", [room_id], (err3) => {
                if (err3) return res.status(500).json({ success: false, message: err3.message });

                // 🔔 แจ้งเตือน staff
                con.query("SELECT user_id FROM dorm_staff WHERE dorm_id = ?", [old.dorm_id], (err4, staffRows) => {
                    if (!err4 && staffRows.length > 0) {
                        staffRows.forEach(staff => {
                            addNotification(
                                staff.user_id,
                                'staff',
                                null,
                                'Room Deleted',
                                `Room ${old.room_number} has been deleted from ${old.dorm_name}.`,
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



app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Could not log out');
        }
        res.redirect('/login');
    });
});


const port = 3000;
app.listen(port, function () {
    console.log("Server is ready at " + port);
});