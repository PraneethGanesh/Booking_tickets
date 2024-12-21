const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '*********',
  database: 'movie_booking'
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Reconnect on database error
db.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Reconnecting...');
    db.connect();
  } else {
    throw err;
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Validation Middleware
function validateMovieRequest(req, res, next) {
  const { title, popularity } = req.body;
  req.body.title = title ? title.trim() : '';

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Invalid title' });
  }
  if (popularity !== undefined && typeof popularity !== 'number') {
    return res.status(400).json({ error: 'Invalid popularity' });
  }
  next();
}

function validateSeatRequest(req, res, next) {
  const { nrow, ncol } = req.body;  // Ensure correct field names
  console.log('Received seat data:', req.body);  
  if (nrow === undefined || ncol === undefined || typeof nrow !== 'number' || typeof ncol !== 'number') {
    return res.status(400).json({ error: 'Invalid seat details' });
  }
  next();
}

// Queue Implementation
class BookingQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(booking) {
    this.queue.push(booking);
  }

  dequeue() {
    return this.queue.shift();
  }

  getQueue() {
    return this.queue;
  }
}

const bookingQueue = new BookingQueue();

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
  const { title, popularity,show_timings} = req.body;
  db.query(
    'INSERT INTO movies (title, popularity,show_timings) VALUES (?, ?,?)',
    [title, popularity,show_timings || 0],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'Movie added successfully', id: results.insertId });
    }
  );
});

// Cancel a booking
app.post('/movies/:id/cancel', validateSeatRequest, (req, res) => {
  const { nrow, ncol } = req.body;  // Use nrow and ncol
  const movieId = parseInt(req.params.id);

  db.query(
    'UPDATE seats SET booked = FALSE WHERE movie_id = ? AND nrow = ? AND ncol = ?',
    [movieId, nrow, ncol],  // Use nrow and ncol
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.affectedRows === 0) {
        return res.status(400).json({ message: 'No booking found for the specified seat' });
      }

      bookingQueue.queue = bookingQueue.queue.filter(
        (booking) => !(booking.movieId === movieId && booking.nrow === nrow && booking.ncol === ncol)
      );

      res.json({ message: `Booking for seat (${nrow}, ${ncol}) canceled successfully` });  // Use nrow and ncol
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
app.post('/movies/:id/book', validateSeatRequest, (req, res) => {
  const { nrow, ncol } = req.body;  // Use nrow and ncol
  const movieId = parseInt(req.params.id);

  db.query(
    'SELECT * FROM seats WHERE movie_id = ? AND nrow = ? AND ncol = ?',
    [movieId, nrow, ncol],  // Use nrow and ncol
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length > 0 && results[0].booked) {
        return res.status(400).json({ message: 'Seat already booked' });
      }

      db.query(
        'INSERT INTO seats (movie_id, nrow, ncol, booked) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE booked = TRUE',
        [movieId, nrow, ncol],  // Use nrow and ncol
        (err) => {
          if (err) return res.status(500).json(err);
          bookingQueue.enqueue({ movieId, nrow, ncol });
          const bookingData = `Booking Details:\nMovie ID: ${movieId}\nSeat: (${nrow}, ${ncol})\nTime: ${new Date().toISOString()}\n\n`;
          fs.appendFile('my_ticket.txt', bookingData, (err) => {
            if (err) {
              console.error('Error writing to file:', err);
            } else {
              console.log('Booking details written to my_ticket.txt');
            }
          });
          res.json({ message: `Seat (${nrow}, ${ncol}) booked successfully!` });  // Use nrow and ncol
        }
      );
    }
  );
});

// Get the booking queue
app.get('/queue', (req, res) => {
  const sortedQueue = bookingQueue.getQueue().sort((a, b) => a.movieId - b.movieId || a.nrow - b.nrow || a.ncol - b.ncol);
  res.json({ queue: sortedQueue });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
