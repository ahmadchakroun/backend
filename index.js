const express = require("express");


require("dotenv").config();
const app = express();
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { Server } = require("socket.io");
const { createTokens, validateToken } = require("./JWT/jwt.js");

const User = require("./models/Users.js");
const http = require("http");
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const { MONGO_DB_CONFIG } = require("./config/app.config");
const errors = require("./middleware/errors.js");
const swaggerUi = require("swagger-ui-express"), swaggerDocument = require("./swagger.json");

app.use(express.json());
app.use(cookieParser());
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  path: "/ws", // <-- this is the WebSocket path
  cors: {
    origin: "http://localhost:4000", // Ensure this matches your client's origin
    methods: ["GET", "POST"]
  }
});

let users = {};

io.use((socket, next) => {
  const token = socket.handshake.headers["authorization"];
  if (!token) return next(new Error("Authentication error"));

  try {
    const user = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.user.username}`);
  users[socket.user.id] = socket.id;

  socket.on("send_message", ({ to, message }) => {
    const receiverSocketId = users[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_message", {
        from: socket.user.id,
        message,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User disconnected: ${socket.user.username}`);
    delete users[socket.user.id];
  });
});



app.post("/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, email });
    await newUser.save();

    res.json("✅ USER REGISTERED");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User Doesn't Exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Wrong Username and Password!" });
    }

    const accessToken = createTokens(user);
    res.json({ message: "✅ LOGGED IN", accessToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.json(users); // Return the data
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/profile", validateToken, (req, res) => {
  res.json("User Profile Access Granted");
});
mongoose.connect(MONGO_DB_CONFIG.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(
    () => {
        console.log("Database connected");
    },
    (error) => {
        console.log("Database can't be connected: " + error);
    }
)

app.use(express.json())
app.use("/uploads", express.static("uploads"))
app.use("/api", require("./routes/app.routes"))
app.use(errors.errorHandler)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.listen(process.env.port || 4000, function(){
    console.log("Ready to go!");
    

})
