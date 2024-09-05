const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Set up middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files (HTML, CSS, JS)

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create tables
db.serialize(() => {
    db.run("CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT)");
    db.run("CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)");
    db.run("CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER, comment TEXT, FOREIGN KEY(message_id) REFERENCES messages(id))");

    // Insert a test user
    const stmt = db.prepare("INSERT INTO users VALUES (?, ?)");
    stmt.run("user", "password");
    stmt.finalize();

    // Insert a test message-of-the-day
    const messageStmt = db.prepare("INSERT INTO messages (content) VALUES (?)");
    messageStmt.run("Here is your message of the day!");
    messageStmt.finalize();
});

// Endpoints
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    });
});

app.get('/message', (req, res) => {
    db.get("SELECT content FROM messages ORDER BY id DESC LIMIT 1", (err, row) => {
        if (row) {
            res.json({ message: row.content });
        } else {
            res.json({ message: 'No message found' });
        }
    });
});

app.post('/comment', (req, res) => {
    const { messageId, comment } = req.body;
    const stmt = db.prepare("INSERT INTO comments (message_id, comment) VALUES (?, ?)");
    stmt.run(messageId, comment, function(err) {
        if (err) {
            res.status(500).json({ success: false, message: 'Failed to add comment' });
        } else {
            res.json({ success: true, commentId: this.lastID });
        }
    });
    stmt.finalize();
});

app.get('/comments/:messageId', (req, res) => {
    const { messageId } = req.params;
    db.all("SELECT comment FROM comments WHERE message_id = ?", [messageId], (err, rows) => {
        if (rows) {
            res.json({ comments: rows.map(row => row.comment) });
        } else {
            res.json({ comments: [] });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
