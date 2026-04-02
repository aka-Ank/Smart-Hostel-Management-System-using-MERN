# Smart-Hostel-Management-System-using-MERN

# Smart Hostel

A beginner-friendly hostel management demo built with Node.js and Express.

This project simulates a simple hostel workflow with two roles:

- `Warden` creates the hostel layout and views room occupancy
- `Student` signs up, logs in, and gets a room based on the selected allocation mode

The app uses plain HTML, CSS, and JavaScript on the frontend, with Express routes on the backend. Data is stored in memory, so everything resets whenever the server restarts.

## Features

- Student and warden signup/login
- Warden hostel creation with:
  - number of floors
  - rooms per floor
  - allocation mode
- Two room allocation modes:
  - `Force Fill`: student is automatically assigned the first available room
  - `Custom Selection`: student chooses from available rooms
- Warden room dashboard to view occupancy
- Simple frontend with separate pages for home, login, signup, warden, and student flows

## Tech Stack

- Node.js
- Express.js
- HTML
- CSS
- Vanilla JavaScript

## Project Structure

```text
smart-hostel/
├── app.js
├── package.json
├── data/
│   ├── store.js
│   └── pdpu.jpg
├── public/
│   ├── script.js
│   └── style.css
├── routes/
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   └── wardenRoutes.js
└── views/
    ├── home.html
    ├── signup.html
    ├── login.html
    ├── wardenDashboard.html
    ├── createHostel.html
    ├── studentDashboard.html
    └── chooseRoom.html
```

## How It Works

### 1. Authentication

- Users can sign up as either `student` or `warden`
- Login checks credentials against the in-memory `users` array
- No sessions, cookies, or database are used

### 2. Warden Flow

- Warden logs in
- Warden creates the hostel using:
  - total floors
  - rooms per floor
  - allocation mode
- Rooms are generated in this format:
  - `F1-R1`
  - `F1-R2`
  - `F2-R1`

### 3. Student Flow

- Student logs in
- The app checks whether the hostel has been created
- If allocation mode is `force`, the first available room is assigned automatically
- If allocation mode is `custom`, the student is redirected to choose an available room manually

## Installation

Make sure Node.js is installed, then run:

```bash
npm install
```

## Run Locally

```bash
npm start
```

The server will start at:

```text
http://localhost:3500
```

## Available Routes

### Page Routes

- `/` - Home page
- `/signup` - Signup page
- `/login` - Login page
- `/warden` - Warden dashboard
- `/warden/create` - Create hostel page
- `/student` - Student dashboard
- `/student/choose` - Room selection page

### API Routes

- `POST /auth/signup` - Register a new user
- `POST /auth/login` - Login user
- `POST /warden/create-hostel` - Create hostel layout and rooms
- `GET /warden/rooms` - View all rooms and occupancy
- `GET /student/status` - Get student room status
- `POST /student/auto-assign` - Auto-assign room in force mode
- `GET /student/available-rooms` - List all available rooms
- `POST /student/select-room` - Select a room manually

## Important Notes

- This project uses a dummy in-memory store in `data/store.js`
- All users, hostel rooms, and allocations are lost after a server restart
- Passwords are stored in plain text for demo purposes only
- There is no authentication session handling or database integration yet

## Possible Improvements

- Add MongoDB or MySQL for persistent storage
- Hash passwords using `bcrypt`
- Add session-based or token-based authentication
- Prevent role misuse with protected routes
- Add room capacity, hostel blocks, and student profile details
- Add tests and form validation

## Author

Smart Hostel is a beginner Express project intended for learning routing, frontend-backend integration, and basic role-based workflow design.
