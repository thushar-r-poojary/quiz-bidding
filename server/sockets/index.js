const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const User = require('../models/User');
const Bid = require('../models/Bid');
const GameHistory = require('../models/GameHistory');
const mongoose = require('mongoose');

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ----- USER JOIN -----
    socket.on('joinQuiz', async ({ quizCode, playerName, teamName }) => {
      try {
        const quiz = await Quiz.findOne({ quizCode });
        if (!quiz) {
          return socket.emit('errorMsg', 'Invalid quiz code');
        }

        let user = await User.findOne({ teamName, quizId: quiz._id });
        if (!user) {
          user = new User({
            name: playerName,
            teamName,
            quizId: quiz._id,
            socketId: socket.id
          });
        } else {
          user.socketId = socket.id;
          user.status = 'ACTIVE';
        }
        await user.save();

        socket.join(`quiz_${quiz._id}`);
        
        // When joining, send current state info (Refresh Trap fix)
        let currentStateData = { userId: user._id, quizId: quiz._id, quizStatus: quiz.status, score: user.score };
        
        const question = await Question.findOne({ quizId: quiz._id, order: quiz.currentQuestionIndex });
        if (question) {
          if (['QUESTION_DISPLAYED', 'BIDDING', 'BIDDING_CLOSED', 'BIDS_REVEALED', 'ANSWERING_PLAYER_ONE', 'ANSWERING_PLAYER_TWO', 'WAITING_FOR_ADMIN_APPROVAL'].includes(quiz.status)) {
             currentStateData.question = {
               _id: question._id, type: question.type, question: question.question,
               options: question.options, images: question.images, points: question.points, order: question.order
             };
          }
          if (['CATEGORY_REVEALED', 'QUESTION_DISPLAYED', 'BIDDING', 'BIDDING_CLOSED', 'BIDS_REVEALED', 'ANSWERING_PLAYER_ONE', 'ANSWERING_PLAYER_TWO', 'WAITING_FOR_ADMIN_APPROVAL'].includes(quiz.status)) {
             currentStateData.category = question.category;
             currentStateData.order = question.order;
          }
          if (quiz.status === 'BIDDING') {
             currentStateData.startingBid = quiz.startingBid;
             currentStateData.bidIncrement = quiz.bidIncrement;
             currentStateData.questionId = question._id;
          }
        }
        
        socket.emit('joined', currentStateData);
        
        // Notify admin
        io.to(`admin_${quiz._id}`).emit('userJoined', user);
      } catch (err) {
        console.error(err);
      }
    });

    // ----- PROJECTOR ACTIONS -----
    socket.on('validateQuizCode', async ({ quizCode }, callback) => {
      try {
        const quiz = await Quiz.findOne({ quizCode: quizCode.toUpperCase() });
        if (!quiz) {
          return callback({ error: 'Invalid quiz code' });
        }
        callback({ success: true, quizId: quiz._id });
      } catch (err) {
        console.error(err);
        callback({ error: 'Server error' });
      }
    });

    // ----- ADMIN JOIN -----
    socket.on('adminJoin', async ({ quizId }) => {
      socket.join(`admin_${quizId}`);
      socket.join(`quiz_${quizId}`); // Admin also listens to general quiz room if needed
      
      const users = await User.find({ quizId });
      socket.emit('currentUsers', users);
    });

    // ----- ADMIN ACTIONS -----
    socket.on('startQuiz', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        quiz.status = 'LOBBY'; // Or go straight to QUESTION_DISPLAYED if configured so
        io.to(`quiz_${quizId}`).emit('quizStarted', { status: quiz.status });
        quiz.save().catch(console.error);
      }
    });

    socket.on('showCategory', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        const question = await Question.findOne({ quizId, order: quiz.currentQuestionIndex });
        if (question) {
          quiz.status = 'CATEGORY_REVEALED';
          io.to(`quiz_${quizId}`).emit('categoryDisplayed', { category: question.category, order: question.order, status: quiz.status });
          quiz.save().catch(console.error);
        }
      }
    });

    socket.on('showQuestion', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        const question = await Question.findOne({ quizId, order: quiz.currentQuestionIndex });
        if (question) {
          quiz.status = 'QUESTION_DISPLAYED';
          // Hide correct answer from users
          const qToSend = { 
            _id: question._id, 
            type: question.type, 
            question: question.question, 
            options: question.options, 
            images: question.images,
            points: question.points, 
            order: question.order 
          };
          io.to(`quiz_${quizId}`).emit('questionDisplayed', { question: qToSend, status: quiz.status });
          quiz.save().catch(console.error);
        }
      }
    });

    socket.on('startBidding', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        const question = await Question.findOne({ quizId, order: quiz.currentQuestionIndex });
        quiz.status = 'BIDDING';
        io.to(`quiz_${quizId}`).emit('biddingStarted', { 
          startingBid: quiz.startingBid, 
          bidIncrement: quiz.bidIncrement,
          questionId: question ? question._id : null,
          status: quiz.status 
        });
        quiz.save().catch(console.error);
      }
    });

    socket.on('stopBidding', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        quiz.status = 'BIDDING_CLOSED';
        io.to(`quiz_${quizId}`).emit('biddingClosed', { status: quiz.status });
        quiz.save().catch(console.error);
      }
    });

    socket.on('displayBids', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        const question = await Question.findOne({ quizId, order: quiz.currentQuestionIndex });
        if (!question) return;
        
        // Aggregate highest bids for the current question
        // Need to get the latest bid for each user, or the one with 'passed: true'
        const bids = await Bid.aggregate([
          { $match: { quizId: quiz._id, questionId: question._id } },
          { $sort: { amount: -1, createdAt: 1 } },
          { $group: {
              _id: "$userId",
              amount: { $first: "$amount" },
              passed: { $first: "$passed" },
              createdAt: { $first: "$createdAt" }
            }
          },
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
          { $unwind: "$user" },
          { $sort: { passed: 1, amount: -1, createdAt: 1 } }
        ]);

        const formattedBids = bids.map((b, index) => ({
          rank: b.passed ? '-' : index + 1,
          teamName: b.user.teamName,
          userId: b._id,
          amount: b.passed ? 'PASS' : b.amount,
          passed: b.passed
        }));

        quiz.status = 'BIDS_REVEALED';
        io.to(`quiz_${quizId}`).emit('bidResults', { bids: formattedBids, status: quiz.status });
        quiz.save().catch(console.error);
      }
    });

    socket.on('startAnswer', async ({ quizId, playerIndex, userId, bidAmount }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        const question = await Question.findOne({ quizId, order: quiz.currentQuestionIndex });
        quiz.status = playerIndex === 1 ? 'ANSWERING_PLAYER_ONE' : 'ANSWERING_PLAYER_TWO';
        io.to(`quiz_${quizId}`).emit('answerTurn', { 
          userId, 
          bidAmount, 
          status: quiz.status,
          answerTime: quiz.answerTime,
          question: question ? { 
            _id: question._id, 
            type: question.type,
            question: question.question, 
            options: question.options, 
            images: question.images,
            points: question.points, 
            order: question.order 
          } : null
        });
        quiz.save().catch(console.error);

        // Simple server-side timer
        setTimeout(async () => {
          const latestQuiz = await Quiz.findById(quizId);
          // Only execute timeout logic if we are still answering THIS specific turn
          if (latestQuiz && latestQuiz.status === quiz.status && latestQuiz.currentQuestionIndex === quiz.currentQuestionIndex) {
            const historyEntry = await GameHistory.findOne({ quizId: quiz._id, questionId: question._id, userId });
            if (!historyEntry) {
              // No answer submitted in time. Auto-submit incorrect answer (-1).
              const user = await User.findById(userId);
              if (user) {
                user.score -= bidAmount;
                await user.save();
                
                const history = new GameHistory({
                  quizId, questionId: question._id, userId, bidAmount, answer: -1, correct: false, pointsChange: -bidAmount
                });
                await history.save();

                io.to(`quiz_${quizId}`).emit('answerResult', { 
                  userId,
                  teamName: user.teamName,
                  selectedOption: -1, // -1 means timeout
                  isCorrect: false, 
                  pointsChange: -bidAmount,
                  newScore: user.score
                });
              }
            }
            io.to(`quiz_${quizId}`).emit('timeUp', { userId });
          }
        }, quiz.answerTime * 1000 + 2000); // 2 sec buffer
      }
    });

    socket.on('revealAnswer', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        const question = await Question.findOne({ quizId, order: quiz.currentQuestionIndex });
        if (!question) return;
        quiz.status = 'ANSWER_REVEALED';
        io.to(`quiz_${quizId}`).emit('answerRevealed', { 
          correctAnswer: question.correctAnswer, 
          correctAnswerText: question.correctAnswerText,
          status: quiz.status 
        });
        quiz.save().catch(console.error);
      }
    });

    socket.on('showLeaderboard', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        quiz.status = 'LEADERBOARD';
        const users = await User.find({ quizId }).sort({ score: -1 });
        io.to(`quiz_${quizId}`).emit('leaderboardUpdated', { users, status: quiz.status });
        quiz.save().catch(console.error);
      }
    });

    socket.on('nextQuestion', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        quiz.currentQuestionIndex += 1;
        quiz.status = 'NEXT_QUESTION'; // Will transition back to QUESTION_DISPLAYED on next admin action
        io.to(`quiz_${quizId}`).emit('nextQuestionReady', { currentQuestionIndex: quiz.currentQuestionIndex });
        quiz.save().catch(console.error);
      }
    });

    socket.on('previousQuestion', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz && quiz.currentQuestionIndex > 0) {
        quiz.currentQuestionIndex -= 1;
        quiz.status = 'NEXT_QUESTION'; 
        io.to(`quiz_${quizId}`).emit('nextQuestionReady', { currentQuestionIndex: quiz.currentQuestionIndex });
        quiz.save().catch(console.error);
      }
    });

    socket.on('resetQuiz', async ({ quizId }) => {
      const quiz = await Quiz.findById(quizId);
      if (quiz) {
        quiz.status = 'LOBBY';
        quiz.currentQuestionIndex = 0;
        
        // Notify all clients to leave first, so they don't see errors during cleanup
        io.to(`quiz_${quizId}`).emit('quizReset');

        quiz.save().catch(console.error);

        // Cleanup DB in background
        User.deleteMany({ quizId: quiz._id }).catch(console.error);
        Bid.deleteMany({ quizId: quiz._id }).catch(console.error);
        GameHistory.deleteMany({ quizId: quiz._id }).catch(console.error);
      }
    });

    // ----- USER ACTIONS -----
    socket.on('placeBid', async ({ quizId, questionId, userId, amount }) => {
      try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz || quiz.status !== 'BIDDING') return socket.emit('errorMsg', 'Bidding is not open.');
        
        const user = await User.findById(userId);
        if (!user) return;
        
        const bidValue = parseInt(amount, 10);
        if (isNaN(bidValue) || bidValue <= 0) return socket.emit('errorMsg', 'Invalid bid amount.');
        if (user.score <= 0) return socket.emit('errorMsg', 'You are disqualified.');
        if (bidValue > user.score) return socket.emit('errorMsg', 'Bid exceeds your points.');

        const bid = new Bid({ quizId, questionId, userId, amount: bidValue, passed: false });
        await bid.save();
        // Just acknowledge back to user, do not broadcast until displayBids
        socket.emit('bidConfirmed', { amount });
        
        // Notify admin of real-time bid updates
        io.to(`admin_${quizId}`).emit('adminBidUpdate', { userId, amount, passed: false });

        // Aggregate current highest bids for all users to broadcast live standings
        const liveBids = await Bid.aggregate([
          { $match: { quizId: new mongoose.Types.ObjectId(quizId), questionId: new mongoose.Types.ObjectId(questionId) } },
          { $sort: { amount: -1, createdAt: 1 } },
          { $group: {
              _id: "$userId",
              amount: { $first: "$amount" },
              passed: { $first: "$passed" }
            }
          },
          { $match: { passed: false } },
          { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
          { $unwind: "$user" },
          { $sort: { amount: -1 } },
          { $project: { userId: "$_id", teamName: "$user.teamName", amount: 1, _id: 0 } }
        ]);

        // Broadcast the live bids array to everyone
        io.to(`quiz_${quizId}`).emit('liveHighestBids', liveBids);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('passBid', async ({ quizId, questionId, userId }) => {
      try {
        const bid = new Bid({ quizId, questionId, userId, amount: 0, passed: true });
        await bid.save();
        socket.emit('bidPassed');
        
        io.to(`admin_${quizId}`).emit('adminBidUpdate', { userId, amount: 0, passed: true });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('submitAnswer', async ({ quizId, questionId, userId, answer, bidAmount }) => {
      try {
        const question = await Question.findById(questionId);
        if (!question) return;
        const user = await User.findById(userId);
        if (!user) return;
        
        // Exploit fix: check if already answered
        const existingHistory = await GameHistory.findOne({ quizId, questionId, userId });
        if (existingHistory) return; 

        if (question.type === 'image' && answer !== -1) {
          // Manual approval flow
          const history = new GameHistory({
            quizId, questionId, userId, bidAmount, answer: String(answer), correct: false, pointsChange: 0
          });
          await history.save();

          const quiz = await Quiz.findById(quizId);
          quiz.status = 'WAITING_FOR_ADMIN_APPROVAL';
          await quiz.save();

          io.to(`admin_${quizId}`).emit('answerNeedsApproval', {
            userId,
            teamName: user.teamName,
            answer: String(answer),
            bidAmount,
            questionId
          });

          io.to(`quiz_${quizId}`).emit('waitingForApproval', {
            userId,
            teamName: user.teamName,
            answer: String(answer),
            status: quiz.status
          });

          return; // Stop execution, wait for admin
        }

        let isCorrect = false;
        
        if (question.type === 'image') {
          // This is a timeout (-1)
          isCorrect = false;
        } else {
          isCorrect = question.correctAnswer === answer;
        }

        const pointsChange = isCorrect ? bidAmount : -bidAmount;
        
        user.score += pointsChange;
        await user.save();

        const history = new GameHistory({
          quizId, questionId, userId, bidAmount, answer: String(answer), correct: isCorrect, pointsChange
        });
        await history.save();

        // Broadcast result
        io.to(`quiz_${quizId}`).emit('answerResult', { 
          userId,
          teamName: user.teamName,
          selectedOption: answer,
          isCorrect, 
          pointsChange,
          newScore: user.score
        });

      } catch (err) {
        console.error(err);
      }
    });

    socket.on('resolveAnswer', async ({ quizId, questionId, userId, isCorrect, bidAmount }) => {
      try {
        const user = await User.findById(userId);
        if (!user) return;

        const history = await GameHistory.findOne({ quizId, questionId, userId });
        if (!history || history.pointsChange !== 0) {
          // Prevent double admin approval exploits
          return;
        }

        const pointsChange = isCorrect ? bidAmount : -bidAmount;
        user.score += pointsChange;
        await user.save();

        history.correct = isCorrect;
        history.pointsChange = pointsChange;
        await history.save();

        io.to(`quiz_${quizId}`).emit('answerResult', { 
          userId,
          teamName: user.teamName,
          selectedOption: history.answer,
          isCorrect, 
          pointsChange,
          newScore: user.score
        });

      } catch (err) {
        console.error(err);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id}`);
      // Find user and mark as disconnected
      const user = await User.findOne({ socketId: socket.id });
      if (user) {
        user.status = 'DISCONNECTED';
        await user.save();
        io.to(`admin_${user.quizId}`).emit('userDisconnected', user._id);
      }
    });
  });
};
