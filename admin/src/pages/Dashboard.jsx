import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBids, setCurrentBids] = useState([]);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [players, setPlayers] = useState([]);
  const socket = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (socket && activeQuiz) {
      socket.emit('adminJoin', { quizId: activeQuiz._id });
      
      socket.on('currentUsers', (users) => {
        setPlayers(users);
      });
      
      socket.on('userJoined', (user) => {
        setPlayers(prev => {
          const exists = prev.find(p => p._id === user._id);
          if (exists) return prev.map(p => p._id === user._id ? user : p);
          return [...prev, user];
        });
      });

      socket.on('userDisconnected', (userId) => {
        setPlayers(prev => prev.map(p => p._id === userId ? { ...p, status: 'DISCONNECTED' } : p));
      });
      
      socket.on('adminBidUpdate', (data) => {
        console.log('Bid update:', data);
      });
      
      socket.on('quizStarted', (data) => setActiveQuiz(prev => ({...prev, status: data.status})));
      socket.on('categoryDisplayed', (data) => {
        setActiveQuiz(prev => ({...prev, status: data.status}));
        setPendingAnswer(null);
      });
      socket.on('questionDisplayed', (data) => {
        setActiveQuiz(prev => ({...prev, status: data.status}));
        setCurrentBids([]);
        setPendingAnswer(null);
      });
      socket.on('biddingStarted', (data) => setActiveQuiz(prev => ({...prev, status: data.status})));
      socket.on('biddingClosed', (data) => setActiveQuiz(prev => ({...prev, status: data.status})));
      socket.on('bidResults', (data) => {
        setActiveQuiz(prev => ({...prev, status: data.status}));
        setCurrentBids(data.bids);
      });
      socket.on('answerTurn', (data) => setActiveQuiz(prev => ({...prev, status: data.status})));
      socket.on('answerRevealed', (data) => setActiveQuiz(prev => ({...prev, status: data.status})));
      socket.on('leaderboardUpdated', (data) => setActiveQuiz(prev => ({...prev, status: data.status})));
      socket.on('nextQuestionReady', (data) => setActiveQuiz(prev => ({...prev, currentQuestionIndex: data.currentQuestionIndex, status: 'NEXT_QUESTION'})));
      
      socket.on('answerNeedsApproval', (data) => {
        setPendingAnswer(data);
        setActiveQuiz(prev => ({...prev, status: 'WAITING_FOR_ADMIN_APPROVAL'}));
      });
      
      return () => {
        socket.off('currentUsers');
        socket.off('userJoined');
        socket.off('userDisconnected');
        socket.off('adminBidUpdate');
        socket.off('quizStarted');
        socket.off('categoryDisplayed');
        socket.off('questionDisplayed');
        socket.off('biddingStarted');
        socket.off('biddingClosed');
        socket.off('bidResults');
        socket.off('answerTurn');
        socket.off('answerRevealed');
        socket.off('leaderboardUpdated');
        socket.off('nextQuestionReady');
        socket.off('answerNeedsApproval');
      }
    }
  }, [socket, activeQuiz]);

  const fetchQuizzes = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:5000/api/admin/quizzes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setQuizzes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectQuiz = async (quizId) => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:5000/api/admin/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setActiveQuiz(res.data.quiz);
      setQuestions(res.data.questions);
    } catch (err) {
      console.error(err);
      alert('Failed to connect to the server. The backend might be offline or experiencing database connection issues.');
    }
  };

  if (!activeQuiz) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <button onClick={() => navigate('/admin/create-quiz')} className="bg-cyan-600 px-6 py-3 rounded-xl text-white font-medium hover:bg-cyan-500 shadow-xl shadow-cyan-900/20 transition-colors">
            Create New Quiz
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quizzes.map(q => (
            <div key={q._id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <h2 className="text-xl font-bold mb-2">{q.title}</h2>
              <p className="text-slate-400 mb-4">Code: <span className="text-cyan-400 font-mono text-lg">{q.quizCode}</span></p>
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => selectQuiz(q._id)}
                  className="flex-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 py-2 rounded-xl font-medium"
                >
                  Manage
                </button>
                <button 
                  onClick={() => navigate(`/admin/edit-quiz/${q._id}`)}
                  className="flex-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 py-2 rounded-xl font-medium"
                >
                  Edit
                </button>
                <button 
                  onClick={() => window.open(`http://localhost:5175/`, '_blank')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-xl font-medium"
                >
                  Projector
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentQ = questions[activeQuiz.currentQuestionIndex];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <div>
          <h1 className="text-2xl font-bold">{activeQuiz.title}</h1>
          <p className="text-cyan-400 font-mono text-xl">{activeQuiz.quizCode}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-slate-400 uppercase text-sm font-bold tracking-wider mb-1">State</p>
            <div className="px-4 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-full font-medium inline-block">
              {activeQuiz.status}
            </div>
          </div>
          <button 
            onClick={() => {
              if(window.confirm('Are you sure you want to completely reset this quiz? All player scores and bids will be lost.')) {
                socket.emit('resetQuiz', { quizId: activeQuiz._id });
                setActiveQuiz(null);
                fetchQuizzes();
              }
            }}
            className="bg-red-600/20 text-red-500 hover:bg-red-600/30 px-4 py-2 rounded-xl font-medium border border-red-500/50 transition-colors"
          >
            Reset Quiz
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          {currentQ && (
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
              <h2 className="text-slate-400 uppercase text-sm font-bold tracking-wider mb-4">Question {activeQuiz.currentQuestionIndex + 1}/{questions.length}</h2>
              <p className="text-2xl font-bold mb-6">{currentQ.question}</p>
              <div className="grid grid-cols-2 gap-4">
                {currentQ.options.map((opt, i) => (
                  <div key={i} className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                      {['A', 'B', 'C', 'D'][i]}
                    </span>
                    <span className="font-medium">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-wrap gap-4">
            <button onClick={() => socket.emit('showCategory', { quizId: activeQuiz._id })} className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl font-medium">Show Category</button>
            <button onClick={() => socket.emit('startBidding', { quizId: activeQuiz._id })} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-medium">Start Bidding</button>
            <button onClick={() => socket.emit('stopBidding', { quizId: activeQuiz._id })} className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium">Stop Bidding</button>
            <button onClick={() => socket.emit('displayBids', { quizId: activeQuiz._id })} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium">Display Bids</button>
            
            {currentBids && currentBids.filter(b => !b.passed).slice(0, 2).map((bid, index) => (
              <button 
                key={bid.userId}
                onClick={() => socket.emit('startAnswer', { quizId: activeQuiz._id, playerIndex: index + 1, userId: bid.userId, bidAmount: bid.amount })} 
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium"
              >
                Start Answer: {bid.teamName} (Bid: {bid.amount})
              </button>
            ))}

            <button onClick={() => socket.emit('revealAnswer', { quizId: activeQuiz._id })} className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-medium">Reveal Answer</button>
            <button onClick={() => socket.emit('showLeaderboard', { quizId: activeQuiz._id })} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium">Leaderboard</button>
            
            <div className="w-full flex gap-4 mt-4">
              <button 
                onClick={() => socket.emit('previousQuestion', { quizId: activeQuiz._id })} 
                disabled={activeQuiz.currentQuestionIndex === 0}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium"
              >
                Previous Question
              </button>
              <button 
                onClick={() => socket.emit('nextQuestion', { quizId: activeQuiz._id })} 
                disabled={activeQuiz.currentQuestionIndex >= questions.length - 1}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium"
              >
                Next Question
              </button>
            </div>
          </div>

          {pendingAnswer && (
            <div className="bg-amber-900/30 border border-amber-500/50 p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-amber-400 mb-4">Manual Approval Needed</h3>
              <p className="mb-2"><strong>Team:</strong> {pendingAnswer.teamName}</p>
              <p className="mb-6"><strong>Submitted Answer:</strong> <span className="text-2xl font-black bg-slate-800 px-3 py-1 rounded border border-slate-700">{pendingAnswer.answer}</span></p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    socket.emit('resolveAnswer', { ...pendingAnswer, quizId: activeQuiz._id, isCorrect: true });
                    setPendingAnswer(null);
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex-1 transition-colors"
                >
                  Approve (Correct)
                </button>
                <button 
                  onClick={() => {
                    socket.emit('resolveAnswer', { ...pendingAnswer, quizId: activeQuiz._id, isCorrect: false });
                    setPendingAnswer(null);
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold flex-1 transition-colors"
                >
                  Reject (Wrong)
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
            Players
            <span className="bg-cyan-900/50 text-cyan-400 text-sm py-1 px-3 rounded-full">{players.length}</span>
          </h2>
          {players.length > 0 ? (
            <div className="space-y-3">
              {players.map(p => (
                <div key={p._id} className={`p-3 rounded-xl flex items-center justify-between border ${p.status === 'ACTIVE' ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/50 border-red-900/50 opacity-60'}`}>
                  <div>
                    <div className="font-bold text-white">{p.teamName}</div>
                    <div className="text-xs text-slate-500">{p.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-cyan-400">{p.score} pt</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${p.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}`}>
                      {p.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-sm italic">Connect via User app to see live updates.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
