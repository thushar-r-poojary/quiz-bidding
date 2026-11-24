import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Join = () => {
  const [quizCode, setQuizCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (quizCode && teamName) {
      // Pass data to game route via state (using teamName as playerName for backend compatibility)
      navigate('/user/game', { 
        state: { 
          quizCode: quizCode.toUpperCase(), 
          playerName: teamName, 
          teamName 
        } 
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-indigo-500/10 rounded-2xl">
            <Gamepad2 className="w-12 h-12 text-indigo-400" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tight">Join Quiz</h2>
        <p className="text-slate-400 text-center mb-8">Enter details to enter the arena</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quiz Code</label>
            <input 
              type="text" 
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white font-mono text-xl text-center placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 uppercase transition-all"
              placeholder="e.g. QZ-8F42"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team Name</label>
            <input 
              type="text" 
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="Team Alpha"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            ENTER ARENA
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Join;
