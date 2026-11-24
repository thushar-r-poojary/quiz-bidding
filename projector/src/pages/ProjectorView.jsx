import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectorView = () => {
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('id');
  const socket = useSocket();
  
  const [gameState, setGameState] = useState('LOBBY');
  const [question, setQuestion] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [biddingInfo, setBiddingInfo] = useState(null);
  const [liveBids, setLiveBids] = useState([]);
  const [bids, setBids] = useState([]);
  const [answerTurn, setAnswerTurn] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [correctAnswerText, setCorrectAnswerText] = useState('');
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answerResultData, setAnswerResultData] = useState(null);

  useEffect(() => {
    if (socket && quizId) {
      socket.emit('adminJoin', { quizId });

      socket.on('quizStarted', (data) => setGameState(data.status));
      
      socket.on('categoryDisplayed', (data) => {
        setGameState(data.status);
        setCategoryData(data);
        setLiveBids([]); // Reset live bids for the new question
        setCorrectAnswer(null);
        setCorrectAnswerText('');
        setAnswerResultData(null);
        setQuestion(null);
        setPendingAnswer(null);
      });

      socket.on('questionDisplayed', (data) => {
        setGameState(data.status);
        setQuestion(data.question);
        setCorrectAnswer(null);
        setCorrectAnswerText('');
        setBiddingInfo(null);
        setBids([]);
        setAnswerTurn(null);
        setAnswerResultData(null);
        setPendingAnswer(null);
      });

      socket.on('biddingStarted', (data) => {
        setGameState(data.status);
        setBiddingInfo({ startingBid: data.startingBid, bidIncrement: data.bidIncrement });
      });

      socket.on('liveHighestBids', (data) => {
        setLiveBids(data.slice(0, 5)); // display top 5 bids
      });

      socket.on('biddingClosed', (data) => setGameState(data.status));

      socket.on('bidResults', (data) => {
        setGameState(data.status);
        setBids(data.bids);
      });

      socket.on('answerTurn', (data) => {
        setGameState(data.status);
        setAnswerTurn({ userId: data.userId, bidAmount: data.bidAmount });
        setTimeLeft(data.answerTime);
        setAnswerResultData(null);
        setCorrectAnswer(null);
        setCorrectAnswerText('');
        if (data.question) setQuestion(data.question);
      });

      socket.on('answerResult', (data) => {
        setAnswerResultData(data);
        // Do not reset pendingAnswer here so we can transition smoothly or just leave it
      });

      socket.on('waitingForApproval', (data) => {
        setGameState(data.status);
        setPendingAnswer(data);
      });

      socket.on('answerRevealed', (data) => {
        setGameState(data.status);
        setCorrectAnswer(data.correctAnswer);
        setCorrectAnswerText(data.correctAnswerText || '');
      });

      socket.on('leaderboardUpdated', (data) => {
        setGameState(data.status);
        setLeaderboard(data.users);
      });

      socket.on('nextQuestionReady', () => {
        setGameState('LOBBY'); // Temporary state until admin shows next
      });
    }
  }, [socket, quizId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  if (!quizId) return <div className="p-10 text-2xl text-center text-red-500">No Quiz ID provided</div>;

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden relative box-border">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {gameState === 'LOBBY' && (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center flex flex-col items-center"
          >
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 mb-8 tracking-tight">
              {quizId ? 'BIDDING QUIZ' : 'BIDDING QUIZ'}
            </h1>
            <img src="/waiting-bg.png" alt="Waiting" className="w-full max-w-xl md:max-w-2xl rounded-3xl shadow-2xl mb-8 border border-slate-800" />
            <p className="text-3xl md:text-4xl text-slate-400">Waiting for Quiz Master to start...</p>
          </motion.div>
        )}

        {gameState === 'CATEGORY_REVEALED' && categoryData && (
          <motion.div
            key="category"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full max-w-5xl"
          >
            <span className="px-6 py-2 bg-fuchsia-900/50 border border-fuchsia-500 rounded-full text-fuchsia-400 font-bold tracking-widest uppercase mb-6 inline-block text-xl">
              Question {categoryData.order + 1} Category
            </span>
            <h2 className="text-6xl md:text-8xl font-black leading-tight mt-6 text-white uppercase tracking-wider drop-shadow-2xl">
              {categoryData.category}
            </h2>
            <div className="mt-12 text-3xl text-slate-400 animate-pulse">Get ready to bid!</div>
          </motion.div>
        )}

        {(gameState === 'QUESTION_DISPLAYED' || gameState === 'BIDDING' || gameState === 'BIDDING_CLOSED' || gameState === 'BIDS_REVEALED' || gameState === 'ANSWERING_PLAYER_ONE' || gameState === 'ANSWERING_PLAYER_TWO' || gameState === 'WAITING_FOR_ADMIN_APPROVAL' || gameState === 'ANSWER_REVEALED') && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-7xl"
          >
            {question ? (
              <div className="text-center mb-8">
                <span className="px-6 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-cyan-400 font-bold tracking-widest uppercase mb-4 inline-block text-lg">
                  Question {question.order + 1}
                </span>
                {question.type === 'mcq' && (
                  <h2 className="text-4xl md:text-5xl font-bold leading-tight mt-2">{question.question}</h2>
                )}
                {question.type === 'image' && (
                  <div className={`grid gap-6 mt-6 justify-center mx-auto ${
                    question.images?.length > 4 ? 'grid-cols-3' :
                    question.images?.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                  }`}>
                    {question.images?.map((img, i) => (
                      <img key={i} src={img} alt={`Question Image ${i + 1}`} className="w-full h-auto max-h-[60vh] object-contain rounded-2xl shadow-xl border-4 border-slate-700 bg-slate-900/50" />
                    ))}
                  </div>
                )}
              </div>
            ) : categoryData ? (
              <div className="text-center mb-8">
                <span className="px-6 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-fuchsia-400 font-bold tracking-widest uppercase mb-4 inline-block text-lg">
                  Question {categoryData.order + 1} Category
                </span>
                <h2 className="text-4xl md:text-5xl font-black leading-tight mt-2 text-fuchsia-400 uppercase tracking-wider">{categoryData.category}</h2>
              </div>
            ) : null}

            {(gameState === 'ANSWERING_PLAYER_ONE' || gameState === 'ANSWERING_PLAYER_TWO' || gameState === 'ANSWER_REVEALED') && question && (
              <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8 w-full">
                {question.type === 'mcq' ? (
                  question.options.map((opt, i) => (
                    <motion.div 
                      key={i}
                      animate={{
                        borderColor: correctAnswer === i ? '#22c55e' : '#334155',
                        backgroundColor: correctAnswer === i ? 'rgba(34, 197, 94, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                      }}
                      className="p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 flex items-center gap-4 md:gap-6"
                    >
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black shrink-0 ${correctAnswer === i ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {['A', 'B', 'C', 'D'][i]}
                      </div>
                      <span className="text-xl md:text-3xl font-semibold leading-snug">{opt}</span>
                    </motion.div>
                  ))
                ) : gameState === 'ANSWER_REVEALED' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="col-span-2 p-8 rounded-3xl border-4 border-green-500 bg-green-900/30 text-center shadow-2xl shadow-green-900/50"
                  >
                    <div className="text-2xl text-green-400 font-bold mb-4 uppercase tracking-widest">Correct Answer</div>
                    <div className="text-6xl font-black text-white tracking-wide">{correctAnswerText}</div>
                  </motion.div>
                )}
              </div>
            )}

            {gameState === 'BIDDING' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
                <div className="inline-block p-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 animate-pulse mb-8">
                  <div className="bg-slate-950 px-8 py-3 rounded-xl">
                    <h3 className="text-3xl font-black text-amber-500 tracking-wider">BIDDING OPEN</h3>
                  </div>
                </div>

                {liveBids.length > 0 ? (
                  <div className="flex flex-col gap-4 items-center">
                    <div className="text-slate-400 text-lg uppercase font-bold tracking-wider mb-2">Top Live Bids</div>
                    {liveBids.map((bid, index) => (
                      <motion.div
                        key={bid.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`bg-slate-800/80 p-4 rounded-2xl flex items-center justify-between w-full max-w-md ${index === 0 ? 'border-2 border-amber-500/50' : 'border border-slate-700'}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`font-black text-xl ${index === 0 ? 'text-amber-400' : 'text-slate-500'}`}>#{index + 1}</span>
                          <span className="font-bold text-xl text-white truncate">{bid.teamName}</span>
                        </div>
                        <div className={`text-3xl font-black ${index === 0 ? 'text-white' : 'text-slate-300'}`}>{bid.amount}</div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-2xl text-slate-500 italic mt-8">Waiting for bids...</div>
                )}
              </motion.div>
            )}

            {gameState === 'BIDDING_CLOSED' && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <h3 className="text-4xl md:text-5xl font-black text-red-500 tracking-wider">BIDDING CLOSED</h3>
              </motion.div>
            )}

            {gameState === 'BIDS_REVEALED' && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-700 p-6 md:p-8 rounded-3xl backdrop-blur-sm max-h-[45vh] overflow-hidden flex flex-col">
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-center text-cyan-400 shrink-0">BID RANKING</h3>
                <div className="space-y-2 md:space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {bids.map((b, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className={`flex justify-between items-center p-3 md:p-4 rounded-xl ${i < 2 && !b.passed ? 'bg-indigo-600/20 border border-indigo-500/50' : 'bg-slate-800'}`}
                    >
                      <div className="flex items-center gap-3 md:gap-4 text-lg md:text-xl">
                        <span className="w-8 text-slate-500 font-bold">{b.rank}</span>
                        <span className="font-bold truncate max-w-[200px] md:max-w-xs">{b.teamName}</span>
                      </div>
                      <div className={`text-xl md:text-3xl font-black ${b.passed ? 'text-slate-500' : 'text-amber-400'}`}>
                        {b.passed ? 'PASS' : b.amount}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            
            {(gameState === 'ANSWERING_PLAYER_ONE' || gameState === 'ANSWERING_PLAYER_TWO' || gameState === 'WAITING_FOR_ADMIN_APPROVAL') && (
               <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-4">
                 {answerResultData ? (
                   <div className={`p-6 md:p-8 rounded-3xl border-4 shadow-2xl inline-block ${answerResultData.isCorrect ? 'bg-green-900/40 border-green-500' : 'bg-red-900/40 border-red-500'}`}>
                     <div className="text-2xl md:text-4xl text-white mb-4 md:mb-6">
                       {answerResultData.selectedOption === -1 ? (
                         <><span className="font-bold text-amber-400">{answerResultData.teamName}</span> ran out of time!</>
                       ) : question?.type === 'image' ? (
                         <><span className="font-bold text-amber-400">{answerResultData.teamName}</span> guessed: <span className="font-bold text-white bg-slate-800 px-3 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl">{answerResultData.selectedOption}</span></>
                       ) : (
                         <><span className="font-bold text-amber-400">{answerResultData.teamName}</span> selected Option <span className="font-bold text-white bg-slate-800 px-3 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl">{['A', 'B', 'C', 'D'][answerResultData.selectedOption]}</span></>
                       )}
                     </div>
                     <div className={`text-6xl md:text-8xl font-black ${answerResultData.isCorrect ? 'text-green-400' : 'text-red-500'}`}>
                       {answerResultData.isCorrect ? 'CORRECT!' : 'INCORRECT!'}
                     </div>
                   </div>
                 ) : gameState === 'WAITING_FOR_ADMIN_APPROVAL' && pendingAnswer ? (
                   <div className="p-6 md:p-8 rounded-3xl border-4 shadow-2xl inline-block bg-amber-900/40 border-amber-500">
                     <div className="text-2xl md:text-4xl text-white mb-4 md:mb-6">
                       <span className="font-bold text-amber-400">{pendingAnswer.teamName}</span> submitted:
                     </div>
                     <div className="text-5xl md:text-7xl font-black text-white bg-slate-900 px-6 py-4 rounded-2xl border-2 border-slate-700">
                       {pendingAnswer.answer}
                     </div>
                     <div className="mt-8 text-xl text-amber-300 animate-pulse font-bold tracking-widest uppercase">
                       Waiting for Quiz Master to review...
                     </div>
                   </div>
                 ) : (
                   <>
                     <div className="text-6xl md:text-8xl font-black text-amber-400 mb-2 md:mb-4">{timeLeft}s</div>
                     <div className="text-2xl md:text-3xl text-cyan-400 font-bold">Waiting for answer...</div>
                   </>
                 )}
               </motion.div>
            )}
          </motion.div>
        )}

        {gameState === 'LEADERBOARD' && (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl max-h-[85vh] flex flex-col"
          >
            <h2 className="text-5xl md:text-7xl font-black text-center mb-8 md:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600 shrink-0">
              LEADERBOARD
            </h2>
            <div className="space-y-4 overflow-y-auto pr-4 custom-scrollbar flex-1 pb-4">
              {leaderboard.map((user, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={user._id} 
                  className={`flex justify-between items-center p-4 md:p-6 rounded-2xl md:rounded-3xl ${i === 0 ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/50' : 'bg-slate-800/80'}`}
                >
                  <div className="flex items-center gap-4 md:gap-8 text-2xl md:text-4xl">
                    <span className={`font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                      #{i + 1}
                    </span>
                    <span className="font-bold truncate max-w-[200px] md:max-w-xs">{user.teamName}</span>
                  </div>
                  <div className="text-3xl md:text-5xl font-black text-cyan-400">
                    {user.score}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectorView;
