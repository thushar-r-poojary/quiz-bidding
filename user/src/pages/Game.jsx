import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

const Game = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const [gameState, setGameState] = useState('CONNECTING');
  const [userData, setUserData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [question, setQuestion] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [bidConfig, setBidConfig] = useState(null);
  const [liveHighestBid, setLiveHighestBid] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [hasPassed, setHasPassed] = useState(false);
  const [bids, setBids] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [myConfirmedBid, setMyConfirmedBid] = useState(null);
  
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myBidAmount, setMyBidAmount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answerResult, setAnswerResult] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  
  const [leaderboard, setLeaderboard] = useState([]);
  
  useEffect(() => {
    if (!state?.quizCode) {
      navigate('/user/join');
      return;
    }

    if (socket) {
      socket.emit('joinQuiz', { 
        quizCode: state.quizCode, 
        playerName: state.playerName, 
        teamName: state.teamName 
      });

      socket.on('errorMsg', (msg) => {
        setErrorMsg(msg);
        setGameState('ERROR');
      });

      socket.on('joined', (data) => {
        setUserData({ userId: data.userId, quizId: data.quizId, score: data.score });
        setGameState(data.quizStatus);
        
        // Refresh Trap: Restore state if reconnecting mid-game
        if (data.question) setQuestion(data.question);
        if (data.category) setCategoryData({ category: data.category, order: data.order });
        if (data.startingBid) {
          setBidConfig({ startingBid: data.startingBid, bidIncrement: data.bidIncrement });
          setCurrentBid(data.startingBid);
          setActiveQuestionId(data.questionId);
        }
      });

      socket.on('quizStarted', (data) => setGameState(data.status));
      
      socket.on('categoryDisplayed', (data) => {
        setGameState(data.status);
        setCategoryData(data);
        setQuestion(null);
        setAnswerResult(null);
        setTextAnswer('');
        setHasPassed(false);
        setMyConfirmedBid(null);
        setLiveHighestBid(null);
        setPendingApproval(false);
      });

      socket.on('questionDisplayed', (data) => {
        setGameState(data.status);
        setQuestion(data.question);
        setCurrentBid(0);
        setBidConfig(null);
        setBids([]);
        setIsMyTurn(false);
        setCorrectAnswer(null);
        setAnswerResult(null);
        setTextAnswer('');
        setHasPassed(false);
        setMyConfirmedBid(null);
        setLiveHighestBid(null);
        setPendingApproval(false);
      });

      socket.on('biddingStarted', (data) => {
        setGameState(data.status);
        setBidConfig({ startingBid: data.startingBid, bidIncrement: data.bidIncrement });
        setCurrentBid(data.startingBid);
        setActiveQuestionId(data.questionId);
        setMyConfirmedBid(null);
        setHasPassed(false);
      });

      socket.on('bidConfirmed', (data) => {
        setMyConfirmedBid(data.amount);
      });

      socket.on('bidPassed', () => {
        setHasPassed(true);
      });

      socket.on('biddingClosed', (data) => {
        setGameState(data.status);
      });

      socket.on('liveHighestBids', (data) => {
        if (data && data.length > 0) {
          setLiveHighestBid(data[0]);
        }
      });

      socket.on('bidResults', (data) => {
        setGameState(data.status);
        setBids(data.bids);
      });

      socket.on('answerTurn', (data) => {
        setGameState(data.status);
        setCorrectAnswer(null);
        if (userData && data.userId === userData.userId) {
          setIsMyTurn(true);
          setMyBidAmount(data.bidAmount);
          setTimeLeft(data.answerTime);
        } else {
          setIsMyTurn(false);
        }
        if (data.question) {
          setQuestion(data.question);
        }
      });

      socket.on('timeUp', (data) => {
         if (userData && data.userId === userData.userId) {
             setIsMyTurn(false);
         }
      });

      socket.on('answerResult', (data) => {
        setPendingApproval(false);
        if (userData && data.userId === userData.userId) {
          setAnswerResult({ isCorrect: data.isCorrect, pointsChange: data.pointsChange });
          setUserData(prev => ({...prev, score: data.newScore}));
        }
      });

      socket.on('waitingForApproval', (data) => {
        setGameState(data.status);
        setAnswerResult(null);
        if (userData && data.userId === userData.userId) {
          setPendingApproval(true);
        }
      });

      socket.on('answerRevealed', (data) => {
        setGameState(data.status);
        setCorrectAnswer(data.correctAnswer);
      });

      socket.on('leaderboardUpdated', (data) => {
        setGameState(data.status);
        if (data.users) {
          setLeaderboard(data.users);
        }
      });

      socket.on('nextQuestionReady', () => {
        setGameState('LOBBY'); // Back to wait state
      });

      socket.on('quizReset', () => {
        alert('The Quiz Master has reset this quiz. You need to rejoin.');
        navigate('/user/join');
      });
    }

    return () => {
      if (socket) {
        socket.off('errorMsg');
        socket.off('joined');
        socket.off('quizStarted');
        socket.off('questionDisplayed');
        socket.off('biddingStarted');
        socket.off('bidConfirmed');
        socket.off('bidPassed');
        socket.off('biddingClosed');
        socket.off('bidResults');
        socket.off('answerTurn');
        socket.off('timeUp');
        socket.off('answerResult');
        socket.off('waitingForApproval');
        socket.off('answerRevealed');
        socket.off('leaderboardUpdated');
        socket.off('nextQuestionReady');
        socket.off('quizReset');
      }
    };
  }, [socket, state, navigate, userData?.userId]); // Be careful with userData dependency

  useEffect(() => {
    if (timeLeft > 0 && isMyTurn) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isMyTurn) {
      // Auto submit wrong answer if time is up (server also handles this but good for UI)
      setIsMyTurn(false);
    }
  }, [timeLeft, isMyTurn]);

  const handlePlaceBid = () => {
    if (socket && userData && activeQuestionId) {
      socket.emit('placeBid', {
        quizId: userData.quizId,
        questionId: activeQuestionId,
        userId: userData.userId,
        amount: currentBid
      });
      // Optionally optimistically update current bid UI
    }
  };

  const handleIncreaseBid = () => {
    if (bidConfig && userData) {
      setCurrentBid(prev => {
        const next = prev + bidConfig.bidIncrement;
        return next > userData.score ? prev : next; // Cannot bid more than current score
      });
    }
  };

  const handleDecreaseBid = () => {
    if (bidConfig && currentBid > bidConfig.startingBid) {
      setCurrentBid(prev => prev - bidConfig.bidIncrement);
    }
  };

  const handlePass = () => {
    if (socket && userData && activeQuestionId) {
      socket.emit('passBid', {
        quizId: userData.quizId,
        questionId: activeQuestionId,
        userId: userData.userId
      });
    }
  };

  const submitAnswer = (answerValue) => {
    if (socket && userData && question && isMyTurn) {
      socket.emit('submitAnswer', {
        quizId: userData.quizId,
        questionId: question._id,
        userId: userData.userId,
        answer: answerValue,
        bidAmount: myBidAmount
      });
      setIsMyTurn(false);
      setAnswerResult(null);
    }
  };

  if (gameState === 'ERROR') {
    return <div className="p-10 text-center text-red-500">{errorMsg}</div>;
  }

  if (userData && userData.score <= 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center border-8 border-red-900/50">
        <h1 className="text-5xl md:text-7xl font-black text-red-600 mb-6 tracking-widest">DISQUALIFIED</h1>
        <p className="text-2xl text-slate-300 font-bold mb-4">You have lost all your points.</p>
        <p className="text-lg text-slate-500">You are eliminated from the quiz. Watch the main screen to see how the other teams perform!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-8">
      {/* Top Bar */}
      {userData && (
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-8">
          <div>
            <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Team</div>
            <div className="font-bold text-slate-300 text-lg">{state?.teamName}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">Score</div>
            <div className="text-2xl font-black text-indigo-400">{userData.score}</div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col items-center justify-center w-full mx-auto ${question?.type === 'image' ? 'max-w-5xl' : 'max-w-md'}`}>
        <AnimatePresence mode="wait">
          
          {/* LOBBY / CONNECTING */}
          {(gameState === 'CONNECTING' || gameState === 'LOBBY' || gameState === 'NEXT_QUESTION') && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center w-full flex flex-col items-center">
              <img src="/waiting-bg.png" alt="Waiting" className="w-full max-w-md rounded-2xl shadow-2xl mb-6" />
              <h2 className="text-3xl font-bold mb-2">Waiting for Quiz Master</h2>
              <p className="text-slate-400">Get ready for the next question!</p>
            </motion.div>
          )}

          {/* CATEGORY REVEALED */}
          {gameState === 'CATEGORY_REVEALED' && (
            <motion.div key="category_disp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full">
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl mb-6 shadow-xl">
                 <h3 className="text-sm text-fuchsia-400 font-bold uppercase tracking-widest mb-4">Question {categoryData?.order + 1} Category</h3>
                 <h2 className="text-4xl font-black mb-4 uppercase text-white tracking-wider">{categoryData?.category}</h2>
                 <p className="text-slate-400">Get ready to bid on this category.</p>
               </div>
            </motion.div>
          )}

          {/* QUESTION DISPLAYED - WAITING FOR BIDDING TO START (or after bidding before answers) */}
          {gameState === 'QUESTION_DISPLAYED' && (
            <motion.div key="q_disp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full">
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 shadow-xl">
                 {question?.type === 'image' ? (
                   <div className="flex flex-col items-center w-full">
                     <div className={`grid gap-4 mb-4 w-full ${question.images?.length > 4 ? 'grid-cols-3' : question.images?.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                       {question.images?.map((img, idx) => (
                         <img key={idx} src={img} alt="Question" className="rounded-xl w-full h-auto max-h-[60vh] object-contain border border-slate-700 shadow-md bg-slate-950" />
                       ))}
                     </div>
                     <h2 className="text-xl font-bold mt-2">Guess the answer from the images.</h2>
                   </div>
                 ) : (
                   <h2 className="text-2xl font-bold mb-4">{question?.question}</h2>
                 )}
                 <p className="text-slate-400">Read the question carefully.</p>
               </div>
            </motion.div>
          )}

          {/* BIDDING ACTIVE */}
          {gameState === 'BIDDING' && (
            <motion.div key="bidding" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 shadow-xl text-center">
                <h2 className="text-lg text-slate-400 font-bold uppercase tracking-wider mb-2">Category</h2>
                <p className="text-3xl font-black mb-6 uppercase text-fuchsia-400">{categoryData?.category}</p>
                
                {hasPassed ? (
                  <div className="py-8 bg-slate-800/50 rounded-2xl border border-slate-700">
                    <h3 className="text-2xl font-black text-slate-500">YOU PASSED</h3>
                    <p className="text-slate-400 mt-2">Wait for bidding to close.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {liveHighestBid && (
                      <div className="bg-slate-800/80 p-4 rounded-xl border border-amber-500/30">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Highest Bid</div>
                        <div className="text-3xl font-black text-amber-400">{liveHighestBid.amount}</div>
                        <div className="text-sm font-medium text-slate-300 mt-1">by {liveHighestBid.teamName}</div>
                      </div>
                    )}

                    {myConfirmedBid !== null && (
                      <div className="bg-green-900/40 p-3 rounded-xl border border-green-500/50 mb-4">
                        <span className="text-green-400 font-bold">Successfully bidded: {myConfirmedBid}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-6">
                      <button 
                        onClick={handleDecreaseBid}
                        className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl font-bold flex items-center justify-center text-slate-300 transition-colors"
                      >-</button>
                      <div className="text-5xl font-black text-amber-400 w-32">{currentBid}</div>
                      <button 
                        onClick={handleIncreaseBid}
                        className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl font-bold flex items-center justify-center text-slate-300 transition-colors"
                      >+</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handlePass}
                        className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-lg border border-slate-700"
                      >PASS</button>
                      <button 
                        onClick={handlePlaceBid}
                        disabled={currentBid > userData.score}
                        className="py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:bg-slate-700 text-white font-bold rounded-2xl text-lg shadow-lg shadow-amber-500/20"
                      >PLACE BID</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* BIDDING CLOSED */}
          {gameState === 'BIDDING_CLOSED' && (
            <motion.div key="bidding_closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
              <h2 className="text-3xl font-black text-red-500 mb-2">BIDDING CLOSED</h2>
              <p className="text-slate-400">Waiting for Quiz Master to reveal results...</p>
            </motion.div>
          )}

          {/* BIDS REVEALED */}
          {gameState === 'BIDS_REVEALED' && (
            <motion.div key="bids_revealed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full">
              <h2 className="text-2xl font-bold mb-6 text-indigo-400">Look at the main screen!</h2>
              <p className="text-slate-400 mb-8">Bid results are being displayed.</p>
              
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold mb-4">Your Status</h3>
                {bids.findIndex(b => b.userId === userData?.userId) !== -1 ? (
                  <div className="text-center">
                    {(() => {
                      const myBid = bids.find(b => b.userId === userData?.userId);
                      return (
                        <>
                          <div className="text-sm text-slate-500 font-bold uppercase mb-1">Rank</div>
                          <div className="text-4xl font-black mb-4">{myBid.rank}</div>
                          <div className="text-sm text-slate-500 font-bold uppercase mb-1">Amount</div>
                          <div className={`text-3xl font-bold ${myBid.passed ? 'text-slate-500' : 'text-amber-400'}`}>
                            {myBid.passed ? 'PASSED' : myBid.amount}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">No bid recorded.</div>
                )}
              </div>
            </motion.div>
          )}

          {/* ANSWERING PHASES */}
          {(gameState === 'ANSWERING_PLAYER_ONE' || gameState === 'ANSWERING_PLAYER_TWO') && (
            <motion.div key="answering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              {isMyTurn ? (
                <div className="bg-indigo-600 border border-indigo-500 p-6 rounded-3xl mb-6 shadow-2xl shadow-indigo-500/30">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white tracking-tight">YOUR TURN!</h2>
                    <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center font-bold text-xl bg-indigo-700">
                      {timeLeft}
                    </div>
                  </div>
                  <p className="text-lg font-medium text-indigo-100 mb-6">{question?.type === 'image' ? 'Image Question' : question?.question}</p>
                  {question?.type === 'image' ? (
                    <div className="flex flex-col items-center w-full">
                      <div className={`grid gap-4 mb-6 w-full ${question.images?.length > 4 ? 'grid-cols-3' : question.images?.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {question.images?.map((img, idx) => (
                          <img key={idx} src={img} alt="Question" className="rounded-xl w-full h-auto max-h-[50vh] object-contain border border-indigo-400 shadow-sm bg-slate-950" />
                        ))}
                      </div>
                      <input 
                        type="text" 
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full max-w-lg p-4 rounded-2xl bg-white text-indigo-900 font-bold text-xl text-center focus:outline-none focus:ring-4 focus:ring-indigo-300 mb-4"
                        autoFocus
                      />
                      <button 
                        onClick={() => submitAnswer(textAnswer)}
                        disabled={!textAnswer.trim()}
                        className="w-full max-w-lg p-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:bg-slate-500 text-white font-black rounded-2xl text-xl shadow-lg shadow-amber-500/20 uppercase tracking-widest transition-colors"
                      >
                        Submit Guess
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {question?.options.map((opt, i) => (
                        <button 
                          key={i}
                          onClick={() => submitAnswer(i)}
                          className="p-4 bg-white text-indigo-900 font-bold rounded-2xl text-left flex items-center gap-4 hover:bg-indigo-50 transition-colors"
                        >
                          <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            {['A', 'B', 'C', 'D'][i]}
                          </span>
                          <span>{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                  <h2 className="text-2xl font-bold mb-4">Another player is answering</h2>
                  <p className="text-slate-400">Watch the main screen.</p>
                  {answerResult && (
                    <div className={`mt-6 p-4 rounded-xl font-bold ${answerResult.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      You answered {answerResult.isCorrect ? 'Correctly!' : 'Incorrectly'}
                      <br/>
                      {answerResult.pointsChange > 0 ? '+' : ''}{answerResult.pointsChange} points
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* WAITING FOR ADMIN APPROVAL */}
          {gameState === 'WAITING_FOR_ADMIN_APPROVAL' && (
            <motion.div key="waiting_approval" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
              {answerResult ? (
                <div className={`p-8 rounded-3xl mb-6 shadow-2xl border-4 ${answerResult.isCorrect ? 'bg-green-900/40 border-green-500 shadow-green-500/30' : 'bg-red-900/40 border-red-500 shadow-red-500/30'}`}>
                  <h2 className={`text-4xl md:text-5xl font-black mb-4 ${answerResult.isCorrect ? 'text-green-400' : 'text-red-500'}`}>
                    {answerResult.isCorrect ? 'CORRECT!' : 'INCORRECT!'}
                  </h2>
                  <div className="text-2xl font-bold text-white">
                    {answerResult.pointsChange > 0 ? '+' : ''}{answerResult.pointsChange} points
                  </div>
                </div>
              ) : pendingApproval ? (
                <div className="bg-amber-600 border border-amber-500 p-8 rounded-3xl mb-6 shadow-2xl shadow-amber-500/30">
                  <h2 className="text-3xl font-black text-white mb-4">Answer Submitted</h2>
                  <p className="text-amber-100 font-medium mb-6">Waiting for the Quiz Master to review your answer...</p>
                  <div className="bg-amber-800/50 p-4 rounded-xl border border-amber-500/50">
                    <p className="text-amber-200 text-sm font-bold uppercase tracking-wider mb-1">Your Guess</p>
                    <p className="text-2xl font-black text-white">{textAnswer}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                  <h2 className="text-2xl font-bold mb-4">Manual Review</h2>
                  <p className="text-slate-400">The Quiz Master is reviewing the submitted answer.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ANSWER REVEALED */}
          {gameState === 'ANSWER_REVEALED' && (
             <motion.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
               <h2 className="text-2xl font-bold mb-4">Answer Revealed!</h2>
               
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 shadow-xl">
                 <p className="text-xl font-medium mb-6">{question?.type === 'image' ? 'Image Question' : question?.question}</p>
                 
                 {question?.type === 'image' ? (
                   <div className="text-center p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
                     <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">Look at the main screen</p>
                     <p className="text-white text-xl">The correct answer is revealed on the projector!</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-3">
                     {question?.options.map((opt, i) => (
                       <div 
                         key={i}
                         className={`p-4 rounded-2xl text-left flex items-center gap-4 border-2 ${
                           correctAnswer === i 
                             ? 'bg-green-500/20 border-green-500 text-white' 
                             : 'bg-slate-800/50 border-slate-700 text-slate-400 opacity-50'
                         }`}
                       >
                         <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                           correctAnswer === i ? 'bg-green-500 text-white' : 'bg-slate-700'
                         }`}>
                           {['A', 'B', 'C', 'D'][i]}
                         </span>
                         <span className={correctAnswer === i ? 'font-bold' : ''}>{opt}</span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               
               {answerResult && (
                  <div className={`mt-6 p-4 rounded-xl font-bold shadow-xl ${answerResult.isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    You answered {answerResult.isCorrect ? 'Correctly!' : 'Incorrectly'}
                    <br/>
                    {answerResult.pointsChange > 0 ? '+' : ''}{answerResult.pointsChange} points
                  </div>
                )}
             </motion.div>
          )}

          {/* LEADERBOARD */}
          {gameState === 'LEADERBOARD' && (
             <motion.div key="leaderboard_view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
               <h2 className="text-3xl font-black text-amber-400 mb-6 text-center">LEADERBOARD</h2>
               <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                 {leaderboard.map((user, index) => (
                   <div 
                     key={user._id} 
                     className={`flex items-center justify-between p-4 border-b border-slate-800 ${userData?.userId === user._id ? 'bg-indigo-900/40' : ''}`}
                   >
                     <div className="flex items-center gap-4">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                         index === 0 ? 'bg-amber-400 text-amber-900' : 
                         index === 1 ? 'bg-slate-300 text-slate-800' :
                         index === 2 ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400'
                       }`}>
                         {index + 1}
                       </div>
                       <div>
                         <div className="font-bold text-white text-lg">{user.teamName}</div>
                       </div>
                     </div>
                     <div className="text-xl font-black text-indigo-400">{user.score}</div>
                   </div>
                 ))}
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Game;
