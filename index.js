const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv').config();
const cors = require('cors');

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ✅ DB Connection
const connectdb = async () => {
  try {
    await mongoose.connect(process.env.MONGOOSE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// ✅ User Schema
const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
});

const userModel = mongoose.model("user", userSchema);

// ✅ Note Schema
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: String },
  userName: { type: String },
  date: { type: Date, default: Date.now }
}, {
  versionKey: false
});

const noteModel = mongoose.model("note", noteSchema);

// ✅ Register Route
app.post('/register', async (req, res) => {
  const { name, role, email, password } = req.body;

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).send('User is already registered');

    bcrypt.hash(password, 10, async (err, hashedPassword) => {
      if (err) return res.status(500).send({ message: err.message });

      const newUser = new userModel({ name, email, password: hashedPassword, role });
      await newUser.save();
      return res.status(201).send("User registered successfully");
    });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

// ✅ Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(401).send({ message: "User not found" });

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) return res.status(500).send({ message: err.message });
      if (!result) return res.status(401).send({ message: "Incorrect password" });

      const token = jwt.sign(
        { userId: user._id, userName: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).send({ message: "Logged in successfully", token });
    });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

// ✅ Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).send('Access denied: No token provided');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send('Invalid or expired token');

    req.body.userId = decoded.userId;
    req.body.userName = decoded.userName;
    next();
  });
};

// Get 

app.get('/',(req,res)=>{
  res.send('Hello World Raj')
})

// ✅ Get Notes
app.get("/myNotes", authMiddleware, async (req, res) => {
  try {
    const notes = await noteModel.find({ userId: req.body.userId });
    res.status(200).send(notes);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ✅ Add Note
app.post("/addNote", authMiddleware, async (req, res) => {
  const { title, description, userId, userName } = req.body;

  try {
    await noteModel.create({ title, description, userId, userName });
    res.status(201).send("Note added successfully");
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ✅ Update Note
app.put("/updateNote/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updateNote = req.body;
  const loggedInUserId = req.body.userId;

  try {
    const note = await noteModel.findById(id);
    if (!note) return res.status(404).send({ message: "Note not found" });

    if (note.userId !== loggedInUserId) {
      return res.status(403).send({ message: "You are not authorized to update this note" });
    }

    const updated = await noteModel.findByIdAndUpdate(id, updateNote, { new: true });
    return res.status(200).send({ message: "Note updated", note: updated });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

// ✅ Delete Note
app.delete("/deleteNote/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const loggedInUserId = req.body.userId;

  try {
    const note = await noteModel.findById(id);
    if (!note) return res.status(404).send({ message: "Note not found" });

    if (note.userId !== loggedInUserId) {
      return res.status(403).send({ message: "You are not authorized to delete this note" });
    }

    await noteModel.findByIdAndDelete(id);
    res.status(200).send({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ✅ Start Server
app.listen(PORT, async () => {
  await connectdb();
  console.log(`🚀 Server running on port ${PORT}`);
});
