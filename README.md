# Foxes Score Backend

Backend API for **Foxes Score**, a real-time baseball/softball scorekeeping application. Built to track games, players, and teams with live score updates via WebSockets.

## Technologies

- **Node.js** with **Express** - REST API framework
- **MongoDB** with **Mongoose** - Database and ODM
- **Socket.IO** - Real-time WebSocket communication for live game updates
- **Jade (Pug)** - View engine
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger
- **Nodemon** - Development auto-restart

## Project Structure

```
foxes-score-backend/
├── app.js              # Express app setup, middleware, and Socket.IO config
├── bin/
│   └── www             # HTTP server entry point
├── models/
│   ├── mGame.js        # Game schema (Mongoose)
│   ├── mPlayer.js      # Player schema (Mongoose)
│   └── mTeam.js        # Team schema (Mongoose)
├── routes/
│   ├── index.js        # Home page route
│   ├── users.js        # Users route (placeholder)
│   ├── game.js         # Game CRUD endpoints
│   ├── player.js       # Player CRUD endpoints
│   └── teams.js        # Teams endpoints
├── public/             # Static files
├── views/              # Jade templates
├── package.json
└── package-lock.json
```

## API Endpoints

### Game (`/game`)

| Method | Route       | Description                                                                 |
|--------|-------------|-----------------------------------------------------------------------------|
| GET    | `/game`     | List all games. Supports query parameters for filtering.                    |
| GET    | `/game/:id` | Get a single game by its ID.                                                |
| POST   | `/game`     | Create a new game. Expects game data in the request body.                   |
| PUT    | `/game`     | Update an existing game. Requires `_id` in the body. Emits a `gameUpdate` event via Socket.IO. |

**Game fields:** `tournament`, `location`, `date`, `startedTime`, `status`, `startOffense`, `startDefense`, `startOffenseScore`, `startDefenseScore`, `firstBaseRunner`, `secondBaseRunner`, `thirdBaseRunner`, `balls`, `strikes`, `outs`, `inning`, `inningHalf`, `battingOrderStartOffense`, `battingOrderStartDefense`

### Player (`/player`)

| Method | Route          | Description                                                  |
|--------|----------------|--------------------------------------------------------------|
| GET    | `/player`      | List all players. Supports query parameters for filtering.   |
| GET    | `/player/:id`  | Get a single player by its ID.                               |
| POST   | `/player`      | Create a new player. Expects `playerName` and `playerNumber` in the body. |

### Teams (`/teams`)

| Method | Route     | Description                                                                 |
|--------|-----------|-----------------------------------------------------------------------------|
| GET    | `/teams`  | List all teams. Supports query parameters for filtering.                    |
| PUT    | `/teams`  | Update a team. Requires `_id` in the body. Emits a `gameUpdate` event via Socket.IO. |

**Team fields:** `name`, `code`, `imageFile`, `location`

### Other

| Method | Route    | Description                |
|--------|----------|----------------------------|
| GET    | `/`      | Renders the home page.     |
| GET    | `/users` | Placeholder users listing. |

## Real-Time Updates (Socket.IO)

The server uses **Socket.IO** to push real-time game updates to connected clients. When a game is updated via `PUT /game`, a `gameUpdate` event is emitted to all connected clients with the updated game data.

**Allowed origins:** `localhost:4200`, `foxes-score-front.vercel.app`

## Prerequisites

- **Node.js** (v12 or later recommended)
- **npm**
- **MongoDB** connection (the app connects to a MongoDB Atlas cluster)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/silasvergilio/foxes-score-backend.git
   cd foxes-score-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**

   - Production mode:
     ```bash
     npm start
     ```

   - Development mode (with auto-restart via Nodemon):
     ```bash
     npm run dev
     ```

4. The server will start on **http://localhost:3000** (or the port defined in the `PORT` environment variable).

## Environment Variables

| Variable | Description                          | Default |
|----------|--------------------------------------|---------|
| `PORT`   | Port the server listens on           | `3000`  |

## Frontend

The companion frontend application is deployed at: [foxes-score-front.vercel.app](https://foxes-score-front.vercel.app)
