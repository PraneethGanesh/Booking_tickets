const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '********',
  database: 'movie_booking'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Validation Middleware
function validateMovieRequest(req, res, next) {
  const { title, popularity } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Invalid title' });
  }
  if (popularity !== undefined && typeof popularity !== 'number') {
    return res.status(400).json({ error: 'Invalid popularity' });
  }
  next();
}

// Endpoints

// Get all movies
app.get('/movies', (req, res) => {
  db.query('SELECT * FROM movies', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Add a new movie
app.post('/movies', validateMovieRequest, (req, res) => {
  const { title, popularity } = req.body;
  db.query(
    'INSERT INTO movies (title, popularity) VALUES (?, ?)',
    [title, popularity || 0],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Movie added successfully', id: results.insertId });
    }
  );
});

// Cancel a booking
app.post('/movies/:id/cancel', (req, res) => {
  const { row, col } = req.body;
  const movieId = parseInt(req.params.id);

  db.query(
    'UPDATE seats SET booked = FALSE WHERE movie_id = ? AND row = ? AND col = ?',
    [movieId, row, col],
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.affectedRows === 0) {
        return res.status(400).json({ message: 'No booking found for the specified seat' });
      }
      res.json({ message: `Booking for seat (${row}, ${col}) canceled successfully` });
    }
  );
});

// Sort movies by popularity
app.get('/movies/sorted', (req, res) => {
  db.query('SELECT * FROM movies ORDER BY popularity DESC', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Book a seat
app.post('/movies/:id/book', (req, res) => {
  const { row, col } = req.body;
  const movieId = parseInt(req.params.id);

  db.query(
    'SELECT * FROM seats WHERE movie_id = ? AND row = ? AND col = ?',
    [movieId, row, col],
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length > 0 && results[0].booked) {
        return res.status(400).json({ message: 'Seat already booked' });
      }

      db.query(
        'INSERT INTO seats (movie_id, row, col, booked) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE booked = TRUE',
        [movieId, row, col],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ message: `Seat (${row}, ${col}) booked successfully!` });
        }
      );
    }
  );
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
