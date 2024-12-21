const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const Bull = require('bull');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Database Connection
const db = mysql.createConnection({    
  host: 'localhost',
  user: 'root',
  password: 'Praneeth@03',
  database: 'movie_booking'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Booking Queue
const bookingQueue = new Bull('bookingQueue');

bookingQueue.process(async (job) => {
  const { movieId, nrow, ncol } = job.data;

  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM seats WHERE movie_id = ? AND nrow = ? AND ncol = ?',
      [movieId, nrow, ncol],
      (err, results) => {
        if (err) return reject(err);

        if (results.length > 0 && results[0].booked) {
          return reject(new Error('Seat already booked'));
        }

        db.query(
          'INSERT INTO seats (movie_id, nrow, ncol, booked) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE booked = TRUE',
          [movieId, nrow, ncol],
          (err) => {
            if (err) return reject(err);
            resolve({ message: `Seat (${nrow}, ${ncol}) booked successfully!` });
          }
        );
      }
    );
  });
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

function validateSeatRequest(req, res, next) {
  const { nrow, ncol } = req.body;
  if (typeof nrow !== 'number' || typeof ncol !== 'number') {
    return res.status(400).json({ error: 'Invalid seat information' });
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

// Get available seats for a movie
app.get('/movies/:id/seats', (req, res) => {
  const movieId = parseInt(req.params.id);
  db.query(
    'SELECT nrow, ncol, booked FROM seats WHERE movie_id = ?',
    [movieId],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

// Book a seat
app.post('/movies/:id/book', validateSeatRequest, (req, res) => {
  const { nrow, ncol } = req.body;
  const movieId = parseInt(req.params.id);

  bookingQueue.add({ movieId, nrow, ncol }).then((job) => {
    job.finished()
      .then(result => res.json(result))
      .catch(err => res.status(400).json({ error: err.message }));
  });
});

// Cancel a booking
app.post('/movies/:id/cancel', validateSeatRequest, (req, res) => {
  const { nrow, ncol } = req.body;
  const movieId = parseInt(req.params.id);

  db.query(
    'UPDATE seats SET booked = FALSE WHERE movie_id = ? AND nrow = ? AND ncol = ?',
    [movieId, nrow, ncol],
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.affectedRows === 0) {
        return res.status(400).json({ message: 'No booking found for the specified seat' });
      }
      res.json({ message: `Booking for seat (${nrow}, ${ncol}) canceled successfully` });
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

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
