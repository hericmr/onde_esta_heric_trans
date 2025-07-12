import React from 'react';
import Transmitter from './components/Transmitter';
import './App.css';

function App() {
  return (
    <div className="App">
      <img src="https://hericmr.github.io/me/imagens/heric.png" alt="Heric" className="profile-pic" />
      <h1>Bem-vindo Heric</h1>
      <Transmitter />
    </div>
  );
}

export default App;
