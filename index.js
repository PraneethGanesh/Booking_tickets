const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Step-by-Step Code for Movie Ticket Booking System in Node.js

const movies = [
  {
    title: "Movie A",
    showtimes: ["10:00 AM", "2:00 PM"],
    seats: Array.from({ length: 5 }, () => Array(10).fill(0))
  },
  {
    title: "Movie B",
    showtimes: ["12:00 PM", "6:00 PM"],
    seats: Array.from({ length: 5 }, () => Array(10).fill(0))
  }
];

function visualizeSeats(movieIndex) {
  const seats = movies[movieIndex].seats;
  console.log("Seating Arrangement:");
  seats.forEach(row => {
    console.log(row.map(seat => (seat ? "X" : "O")).join(" "));
  });
}

function bookSeats(movieIndex, row, col) {
  if (movies[movieIndex].seats[row][col] === 0) {
    movies[movieIndex].seats[row][col] = 1;
    console.log(`Seat (${row}, ${col}) booked successfully!`);
  } else {
    console.log(`Seat (${row}, ${col}) is already booked!`);
  }
}

const popularity = {
  "Movie A": 5,
  "Movie B": 8
};

function sortMoviesByPopularity() {
  const sortedMovies = movies.sort((a, b) => popularity[b.title] - popularity[a.title]);
  console.log("Movies sorted by popularity:");
  sortedMovies.forEach(movie => {
    console.log(`${movie.title} (Popularity: ${popularity[movie.title]})`);
  });
}

const bookingQueue = [];

function addToQueue(user, movieTitle) {
  bookingQueue.push({ user, movieTitle });
  console.log(`${user} added to queue for ${movieTitle}.`);
}

function processQueue() {
  while (bookingQueue.length > 0) {
    const { user, movieTitle } = bookingQueue.shift();
    console.log(`Processing booking for ${user} for ${movieTitle}.`);
  }
}

function mainMenu() {
  console.log("\nMovie Ticket Booking System");
  console.log("1. View Movies");
  console.log("2. Book a Seat");
  console.log("3. Visualize Seating");
  console.log("4. Sort Movies by Popularity");
  console.log("5. Add to Queue");
  console.log("6. Process Queue");
  console.log("7. Exit");

  rl.question("Enter your choice: ", choice => {
    choice = parseInt(choice);

    switch (choice) {
      case 1:
        console.log("\nAvailable Movies:");
        movies.forEach((movie, index) => {
          console.log(`${index + 1}. ${movie.title} - Showtimes: ${movie.showtimes.join(", ")}`);
        });
        mainMenu();
        break;

      case 2:
        rl.question("Enter movie index: ", movieIndex => {
          movieIndex = parseInt(movieIndex) - 1;
          rl.question("Enter row (0-indexed): ", row => {
            row = parseInt(row);
            rl.question("Enter column (0-indexed): ", col => {
              col = parseInt(col);
              bookSeats(movieIndex, row, col);
              mainMenu();
            });
          });
        });
        break;

      case 3:
        rl.question("Enter movie index: ", movieIndex => {
          movieIndex = parseInt(movieIndex) - 1;
          visualizeSeats(movieIndex);
          mainMenu();
        });
        break;

      case 4:
        sortMoviesByPopularity();
        mainMenu();
        break;

      case 5:
        rl.question("Enter your name: ", user => {
          rl.question("Enter movie title: ", movieTitle => {
            addToQueue(user, movieTitle);
            mainMenu();
          });
        });
        break;

      case 6:
        processQueue();
        mainMenu();
        break;

      case 7:
        console.log("Exiting system. Goodbye!");
        rl.close();
        break;

      default:
        console.log("Invalid choice. Try again.");
        mainMenu();
    }
  });
}

mainMenu();
  