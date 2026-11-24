const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  type: { type: String, enum: ['mcq', 'image'], default: 'mcq' },
  category: { type: String, required: true, default: 'General' },
  question: { type: String, required: false }, // Text might be empty for image questions
  options: { type: [String], default: [] }, // [A, B, C, D] (empty for image questions)
  correctAnswer: { type: Number }, // Index of correct option (0-3) for mcq
  images: { type: [String], default: [] }, // URLs of images for image questions
  correctAnswerText: { type: String }, // Text answer for image questions
  points: { type: Number, default: 0 }, // For non-bidding questions (if any) or base points
  order: { type: Number, required: true }
});

module.exports = mongoose.model('Question', questionSchema);
