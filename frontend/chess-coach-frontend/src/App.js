import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Chess Coach</h1>
        <p>
          Welcome to Chess Coach!<br />
          Your personal assistant to improve your chess skills.
        </p>
        <div style={{ marginTop: '2rem' }}>
          {/* Future navigation or features will go here */}
          <button style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: '#61dafb',
            color: '#282c34',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            Get Started
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
