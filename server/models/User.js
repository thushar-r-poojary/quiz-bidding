const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teamName: { type: String, required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, default: 5000 },
  socketId: { type: String },
  status: { type: String, enum: ['ACTIVE', 'DISCONNECTED'], default: 'ACTIVE' },
  joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
