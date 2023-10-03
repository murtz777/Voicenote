const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

app.use(cors());
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "audio",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
app.use(express.static("public"));
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images"); // Specify the destination folder for images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate a unique filename
  },
});

const upload = multer({ storage: imageStorage });


let currentGroup = "g1";
io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("send-audio", async ({ audioBlob }) => {
    const group = currentGroup;
    console.log("Received audio from group:", group);
    const audioFileName = `${Date.now()}.webm`;

    const audioPath = path.join(__dirname, "public", "audio", audioFileName);

    fs.writeFile(audioPath, audioBlob, async (err) => {
      if (err) {
        console.error("Error writing audio file:", err);
        return;
      }
      try {
        const audioURL = `/audio/${audioFileName}`;

        // Save audio message in the database
        const insertQuery =
          "INSERT INTO audio_message (sender, audio_url, group_name) VALUES (?, ?, ?)";
        await pool.query(insertQuery, [socket.id, audioURL, currentGroup]);

        // Broadcast the audio to all connected users
        socket.broadcast.emit("received-audio", audioURL);

        // Now, let's fetch audio messages for the same group
        const group = currentGroup; // You can customize this if needed
        const selectQuery = "SELECT * FROM audio_message WHERE group_name = ?";
        const [rows, fields] = await pool.execute(selectQuery, [group]);
        console.log("Response========>:", rows);
      } catch (error) {
        console.error("Error saving audio message in the database:", error);
      }
    });
  });

  // New endpoint to send text messages
  socket.on("send-text", async ({ sender, messageText }) => {
    const group = currentGroup;
    console.log("Received text message from group:", group);

    try {
      // Save text message in the database
      const insertQuery =
        "INSERT INTO text_message (sender, message_text, group_name) VALUES (?, ?, ?)";
      await pool.query(insertQuery, [sender, messageText, currentGroup]);
    } catch (error) {
      console.error("Error saving text message in the database:", error);
    }
  });

  app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    try {
      // Get the uploaded image file
      const imageFile = req.file;
  
      if (!imageFile) {
        return res.status(400).json({ error: "No image file uploaded" });
      }
  
      // Save image file information in the database
      const imageUrl = `/images/${imageFile.filename}`;
      const insertQuery =
        "INSERT INTO image_message (sender, image_url, group_name) VALUES (?, ?, ?)";
      await pool.query(insertQuery, [socket.id, imageUrl, currentGroup]);
  
      res.status(201).json({ message: "Image uploaded successfully" });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Error uploading image" });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  // Join a group
  socket.on("join-group", (group) => {
    socket.leave(currentGroup); // Leave the current group
    currentGroup = group; // Update the current group
    socket.join(currentGroup); // Join the new group
  });
});

app.post("/api/store-audio", async (req, res) => {
  const { sender, audioPath } = req.body;

  try {
    // Save audio message in the database
    const insertQuery =
      "INSERT INTO audio_message (sender, audio_url, group_name) VALUES (?, ?, ?)";
    await pool.execute(insertQuery, [sender, audioPath, currentGroup]);

    res.status(201).json({ message: "Audio message stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error storing audio message" });
  }
});

// API endpoint to fetch audio messages
// app.get("/api/audio-messages", async (req, res) => {
//   const group = req.query.group || currentGroup; // Use the selected group or the current group

//   try {
//     const selectQuery = "SELECT * FROM audio_message WHERE group_name = ?";
//     const [rows, fields] = await pool.execute(selectQuery, [group]);
//     console.log("Response:", rows);
//     res.status(200).json(rows);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Error fetching audio messages" });
//   }
// });

app.get("/api/messages", async (req, res) => {
  const group = req.query.group || currentGroup; // Use the selected group or the current group

  try {
    // Fetch audio messages
    const audioSelectQuery = "SELECT * FROM audio_message WHERE group_name = ?";
    const [audioRows, audioFields] = await pool.execute(audioSelectQuery, [
      group,
    ]);

    // Fetch text messages
    const textSelectQuery = "SELECT * FROM text_message WHERE group_name = ?";
    const [textRows, textFields] = await pool.execute(textSelectQuery, [group]);

     // Fetch text messages
     const imageSelectQuery = "SELECT * FROM image_message WHERE group_name = ?";
     const [imageRows, imageFields] = await pool.execute(imageSelectQuery, [group]);

    res.status(200).json({ audioMessages: audioRows, textMessages: textRows, imageMessages:imageRows  });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// Serve audio files from the 'public' folder
app.use("/audio", express.static(path.join(__dirname, "public", "audio")));

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
