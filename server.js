const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const session = require('express-session');
const app = express();
const port = 3000;

const uri = 'mongodb+srv://faizankhazi8:faizankhazi8@cluster18.yyhrvw0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster18';
const dbName = 'collegeHostel';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json());
app.use(cors());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

const adminUser = {
    username: 'admin',
    password: 'rit123'
};

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === adminUser.username && password === adminUser.password) {
        req.session.user = username;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.post('/addStudent', async (req, res) => {
    const { name, usn, phone, roomNo, branch, currentAcademicYear, hostel } = req.body;
    console.log("Received data:", req.body);

    try {
        await client.connect();
        const db = client.db(dbName);
        const studentsCollection = db.collection('students');

        const student = {
            name,
            usn,
            phone,
            roomNo,
            branch,
            currentAcademicYear,
            hostel
        };

        const result = await studentsCollection.insertOne(student);
        console.log("Student record inserted:", result);
        res.status(200).json({ success: true, insertedId: result.insertedId });
    } catch (e) {
        console.error("Error adding student:", e);
        res.status(500).json({ success: false, error: 'Error adding student' });
    } finally {
        await client.close();
    }
});

app.get('/students', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const studentsCollection = db.collection('students');
        const students = await studentsCollection.find().toArray();
        res.status(200).json(students);
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error fetching student records' });
    } finally {
        await client.close();
    }
});

app.post('/submitAttendance', async (req, res) => {
    const { studentName, attendanceStatus } = req.body;

    try {
        console.log("Connecting to MongoDB...");
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db(dbName);
        const attendanceCollection = db.collection('attendance');

        const attendanceRecord = {
            studentName,
            attendanceStatus,
            timestamp: new Date()
        };

        const result = await attendanceCollection.insertOne(attendanceRecord);
        console.log("Attendance record inserted:", result);
        res.status(200).json({ success: true, insertedId: result.insertedId });
    } catch (e) {
        console.error("Error inserting attendance record:", e);
        res.status(500).json({ success: false, error: 'Error inserting attendance record' });
    } finally {
        console.log("Closing MongoDB connection...");
        await client.close();
        console.log("MongoDB connection closed");
    }
});

app.get('/viewAttendance', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const attendanceCollection = db.collection('attendance');
        const records = await attendanceCollection.find().toArray();
        res.status(200).json(records);
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error fetching attendance records' });
    } finally {
        await client.close();
    }
});

app.delete('/deleteAttendance/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await client.connect();
        const db = client.db(dbName);
        const attendanceCollection = db.collection('attendance');
        const result = await attendanceCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Record not found' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: 'Error deleting attendance record' });
    } finally {
        await client.close();
    }
});

app.delete('/students/:usn', async (req, res) => {
    const usn = req.params.usn;

    try {
        await client.connect();
        const db = client.db(dbName);
        const studentsCollection = db.collection('students');
        const result = await studentsCollection.deleteOne({ usn: usn });

        if (result.deletedCount === 1) {
            res.status(200).json({ success: true, message: 'Student deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Student not found' });
        }
    } catch (e) {
        console.error("Error deleting student:", e);
        res.status(500).json({ success: false, error: 'Error deleting student' });
    } finally {
        await client.close();
    }
});

app.get('/getStudent/:usn', async (req, res) => {
    const usn = req.params.usn;

    try {
        await client.connect();
        const db = client.db(dbName);
        const studentsCollection = db.collection('students');
        const student = await studentsCollection.findOne({ usn: usn });

        if (student) {
            res.status(200).json(student);
        } else {
            res.status(404).json({ success: false, message: 'Student not found' });
        }
    } catch (e) {
        console.error("Error fetching student:", e);
        res.status(500).json({ success: false, error: 'Error fetching student' });
    } finally {
        await client.close();
    }
});

app.put('/updateStudent/:usn', async (req, res) => {
    const usn = req.params.usn;
    const updatedData = req.body;

    try {
        await client.connect();
        const db = client.db(dbName);
        const studentsCollection = db.collection('students');
        const result = await studentsCollection.updateOne({ usn: usn }, { $set: updatedData });

        if (result.matchedCount === 1) {
            res.status(200).json({ success: true, message: 'Student updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Student not found' });
        }
    } catch (e) {
        console.error("Error updating student:", e);
        res.status(500).json({ success: false, error: 'Error updating student' });
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

