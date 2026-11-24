const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');

mongoose.connect('mongodb://127.0.0.1:27017/quiz-bidding').then(async () => {
  const quizzes = await Quiz.find();
  for (const quiz of quizzes) {
    const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });
    const toDelete = [];
    
    // Simple deduplication logic: check if next question has the exact same text/category/type
    let lastQ = null;
    let newOrder = 0;
    
    for (const q of questions) {
      if (lastQ && lastQ.question === q.question && lastQ.correctAnswerText === q.correctAnswerText && lastQ.type === q.type) {
        // It's a duplicate
        toDelete.push(q._id);
      } else {
        lastQ = q;
        q.order = newOrder++;
        await q.save();
      }
    }
    
    if (toDelete.length > 0) {
      await Question.deleteMany({ _id: { $in: toDelete } });
      console.log(`Quiz '${quiz.title}': Deleted ${toDelete.length} duplicated questions and reordered.`);
    }
  }
  process.exit(0);
});
