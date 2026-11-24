const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  quizCode: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['LOBBY', 'CATEGORY_REVEALED', 'QUESTION_DISPLAYED', 'BIDDING', 'BIDDING_CLOSED', 'BIDS_REVEALED', 'ANSWERING_PLAYER_ONE', 'ANSWERING_PLAYER_TWO', 'WAITING_FOR_ADMIN_APPROVAL', 'ANSWER_COMPLETED', 'ANSWER_REVEALED', 'LEADERBOARD', 'NEXT_QUESTION', 'QUIZ_COMPLETED'],
    default: 'LOBBY'
  },
  currentQuestionIndex: { type: Number, default: 0 },
  startingBid: { type: Number, default: 100 },
  bidIncrement: { type: Number, default: 50 },
  answerTime: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
