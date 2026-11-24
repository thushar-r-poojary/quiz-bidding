import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState('');
  const [startingBid, setStartingBid] = useState(100);
  const [bidIncrement, setBidIncrement] = useState(50);
  const [answerTime, setAnswerTime] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  
  const [questions, setQuestions] = useState([
    {
      type: 'mcq',
      category: 'General',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      images: [],
      correctAnswerText: ''
    }
  ]);

  useEffect(() => {
    if (isEditMode) {
      fetchQuizData();
    }
  }, [id]);

  const fetchQuizData = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:5000/api/admin/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const { quiz, questions: fetchedQuestions } = res.data;
      setTitle(quiz.title);
      setStartingBid(quiz.startingBid);
      setBidIncrement(quiz.bidIncrement);
      setAnswerTime(quiz.answerTime);
      
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions.map(q => ({
          type: q.type || 'mcq',
          category: q.category || 'General',
          question: q.question || '',
          options: q.options || ['', '', '', ''],
          correctAnswer: q.correctAnswer || 0,
          images: q.images || [],
          correctAnswerText: q.correctAnswerText || ''
        })));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch quiz data');
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { type: 'mcq', category: 'General', question: '', options: ['', '', '', ''], correctAnswer: 0, images: [], correctAnswerText: '' }
    ]);
  };

  const handleAddImageQuestion = () => {
    setQuestions([
      ...questions,
      { type: 'image', category: 'General', question: '', options: [], correctAnswer: null, images: [''], correctAnswerText: '' }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    const newQ = [...questions];
    newQ.splice(index, 1);
    setQuestions(newQ);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQ = [...questions];
    newQ[index][field] = value;
    setQuestions(newQ);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const newQ = [...questions];
    newQ[qIndex].options[optIndex] = value;
    setQuestions(newQ);
  };

  const handleImageChange = (qIndex, imgIndex, value) => {
    const newQ = [...questions];
    newQ[qIndex].images[imgIndex] = value;
    setQuestions(newQ);
  };

  const handleImageUpload = async (qIndex, imgIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await axios.post(`http://${window.location.hostname}:5000/api/admin/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      handleImageChange(qIndex, imgIndex, res.data.url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    }
  };

  const handleAddImage = (qIndex) => {
    const newQ = [...questions];
    newQ[qIndex].images.push('');
    setQuestions(newQ);
  };

  const handleRemoveImage = (qIndex, imgIndex) => {
    const newQ = [...questions];
    newQ[qIndex].images.splice(imgIndex, 1);
    setQuestions(newQ);
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isEditMode) {
        await axios.put(`http://${window.location.hostname}:5000/api/admin/quizzes/${id}`, {
          title,
          startingBid,
          bidIncrement,
          answerTime,
          questions
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      } else {
        // 1. Create the quiz
        const quizRes = await axios.post(`http://${window.location.hostname}:5000/api/admin/quizzes`, {
          title,
          startingBid,
          bidIncrement,
          answerTime
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });

        const quizId = quizRes.data._id;

        // 2. Add the questions
        await axios.post(`http://${window.location.hostname}:5000/api/admin/quizzes/${quizId}/questions`, questions, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      }

      // Navigate back to dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl mb-8">
        <h1 className="text-3xl font-bold mb-6">{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</h1>
        
        <form onSubmit={handleSaveQuiz} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Quiz Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g. Weekly Tech Trivia"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Starting Bid</label>
              <input 
                type="number" 
                value={startingBid}
                onChange={(e) => setStartingBid(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Bid Increment</label>
              <input 
                type="number" 
                value={bidIncrement}
                onChange={(e) => setBidIncrement(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Answer Time (sec)</label>
              <input 
                type="number" 
                value={answerTime}
                onChange={(e) => setAnswerTime(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl"
                required
              />
            </div>
          </div>
        </form>
      </div>

      <div className="space-y-6 mb-8">
        <h2 className="text-2xl font-bold">Questions</h2>
        
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative">
            {questions.length > 1 && (
              <button 
                onClick={() => handleRemoveQuestion(qIndex)}
                className="absolute top-6 right-6 text-slate-500 hover:text-red-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <h3 className="text-cyan-400 font-bold mb-4 uppercase text-sm tracking-wider">
              {q.type === 'image' ? 'Image Question' : 'MCQ'} {qIndex + 1}
            </h3>
            
            <div className={`grid grid-cols-1 gap-4 mb-4 ${q.type === 'mcq' ? 'md:grid-cols-2' : ''}`}>
              <input 
                type="text" 
                value={q.category}
                onChange={(e) => handleQuestionChange(qIndex, 'category', e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="Category (e.g., Science, General)"
                required
              />
              {q.type === 'mcq' && (
                <input 
                  type="text" 
                  value={q.question}
                  onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="Enter the question..."
                  required
                />
              )}
            </div>

            {q.type === 'mcq' && (
              <div className="grid grid-cols-2 gap-4">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-700 focus-within:border-cyan-500">
                    <input 
                      type="radio" 
                      name={`correct-${qIndex}`}
                      checked={q.correctAnswer === oIndex}
                      onChange={() => handleQuestionChange(qIndex, 'correctAnswer', oIndex)}
                      className="w-5 h-5 text-cyan-600 bg-slate-800 border-slate-600 focus:ring-cyan-600 focus:ring-offset-slate-900"
                    />
                    <span className="font-bold text-slate-500">{['A', 'B', 'C', 'D'][oIndex]}</span>
                    <input 
                      type="text" 
                      value={opt}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-600"
                      placeholder={`Option ${oIndex + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>
            )}

            {q.type === 'image' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-400">Image URLs or Upload</label>
                  {q.images.map((imgUrl, imgIndex) => (
                    <div key={imgIndex} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="url" 
                          value={imgUrl}
                          onChange={(e) => handleImageChange(qIndex, imgIndex, e.target.value)}
                          className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          placeholder="https://example.com/image.jpg"
                          required
                        />
                        <span className="text-slate-500 font-bold text-sm">OR</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleImageUpload(qIndex, imgIndex, e)}
                          className="w-48 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-cyan-900 file:text-cyan-400 hover:file:bg-cyan-800"
                        />
                        {q.images.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveImage(qIndex, imgIndex)}
                            className="p-2 text-slate-500 hover:text-red-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {imgUrl && (
                        <img src={imgUrl} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-slate-700" />
                      )}
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => handleAddImage(qIndex)}
                    className="text-cyan-400 text-sm font-bold hover:text-cyan-300"
                  >
                    + Add Another Image
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Correct Answer (Text)</label>
                  <input 
                    type="text" 
                    value={q.correctAnswerText}
                    onChange={(e) => handleQuestionChange(qIndex, 'correctAnswerText', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter the correct answer text..."
                    required
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleAddQuestion}
            className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-cyan-500 hover:text-cyan-400 text-slate-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add MCQ Question
          </button>
          
          <button 
            onClick={handleAddImageQuestion}
            className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-fuchsia-500 hover:text-fuchsia-400 text-slate-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Image Question
          </button>
        </div>
      </div>

      <button 
        onClick={handleSaveQuiz}
        disabled={isSaving || !title || questions.some(q => q.type === 'mcq' ? (!q.question || q.options.some(o => !o)) : (!q.images[0] || !q.correctAnswerText))}
        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-cyan-900/20 transition-colors"
      >
        <Save className="w-5 h-5" /> {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save & Create Quiz')}
      </button>

    </div>
  );
};

export default CreateQuiz;
