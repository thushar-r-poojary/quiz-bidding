const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Admin = require('../models/Admin');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // unique filename
  }
});
const upload = multer({ storage: storage });

// Admin Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // For demo purposes, we will create the admin if it doesn't exist
    let admin = await Admin.findOne({ username });
    if (!admin) {
      if (username === 'admin' && password === 'admin') { // default
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        admin = new Admin({ username, passwordHash });
        await admin.save();
      } else {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }
    } else {
      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { admin: { id: admin.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Create Quiz
router.post('/quizzes', auth, async (req, res) => {
  const { title, startingBid, bidIncrement, answerTime } = req.body;
  
  // Generate random 6-character code
  const quizCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const newQuiz = new Quiz({
      title,
      quizCode,
      startingBid: startingBid || 100,
      bidIncrement: bidIncrement || 50,
      answerTime: answerTime || 10
    });
    const quiz = await newQuiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get all Quizzes
router.get('/quizzes', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Add Questions to Quiz
router.post('/quizzes/:id/questions', auth, async (req, res) => {
  const questions = req.body; // Expect array of questions
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ msg: 'Quiz not found' });

    const newQuestions = questions.map((q, index) => ({
      quizId: quiz._id,
      type: q.type || 'mcq',
      category: q.category || 'General',
      question: q.question,
      options: q.options,
      images: q.images || [],
      correctAnswer: q.correctAnswer,
      correctAnswerText: q.correctAnswerText || '',
      points: q.points || 0,
      order: index
    }));

    await Question.insertMany(newQuestions);
    res.json({ msg: 'Questions added successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get Quiz details including questions
router.get('/quizzes/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ msg: 'Quiz not found' });
    
    const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });
    res.json({ quiz, questions });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Update Quiz and its questions
router.put('/quizzes/:id', auth, async (req, res) => {
  const { title, startingBid, bidIncrement, answerTime, questions } = req.body;
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ msg: 'Quiz not found' });

    quiz.title = title || quiz.title;
    quiz.startingBid = startingBid || quiz.startingBid;
    quiz.bidIncrement = bidIncrement || quiz.bidIncrement;
    quiz.answerTime = answerTime || quiz.answerTime;
    
    await quiz.save();

    // Recreate all questions for simplicity
    if (questions && Array.isArray(questions)) {
      await Question.deleteMany({ quizId: quiz._id });
      
      const newQuestions = questions.map((q, index) => ({
        quizId: quiz._id,
        type: q.type || 'mcq',
        category: q.category || 'General',
        question: q.question,
        options: q.options,
        images: q.images || [],
        correctAnswer: q.correctAnswer,
        correctAnswerText: q.correctAnswerText || '',
        points: q.points || 0,
        order: index
      }));

      await Question.insertMany(newQuestions);
    }

    res.json({ msg: 'Quiz updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Upload Image Endpoint
router.post('/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }
  // Construct URL for the uploaded file
  // Using relative path for the frontend to append to the base URL or storing just the path
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

module.exports = router;
