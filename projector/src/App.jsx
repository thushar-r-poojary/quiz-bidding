import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Join from './pages/Join';
import ProjectorView from './pages/ProjectorView';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Join />} />
      <Route path="/projector" element={<ProjectorView />} />
    </Routes>
  );
};

export default App;
