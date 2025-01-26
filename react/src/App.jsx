import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBV7JfHW-LdAcbKPRPeOWXKBkllV6NfUDM",
  authDomain: "pollster-8f771.firebaseapp.com",
  projectId: "pollster-8f771",
  storageBucket: "pollster-8f771.firebasestorage.app",
  messagingSenderId: "883173624830",
  appId: "1:883173624830:web:7e92b40f1428e7e67f4eaf",
  databaseURL: "https://pollster-8f771-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

function App() {
  const [polls, setPolls] = useState([]);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [votedPolls, setVotedPolls] = useState(() => {
    const saved = localStorage.getItem('votedPolls');
    return saved ? JSON.parse(saved) : {};
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(true);
        setShowAdminLogin(false);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const pollsRef = ref(db, 'polls');
    onValue(pollsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const pollsList = Object.entries(data).map(([id, poll]) => ({
          id,
          ...poll,
        }));
        setPolls(pollsList);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('votedPolls', JSON.stringify(votedPolls));
  }, [votedPolls]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setError('');
    } catch (error) {
      setError('Invalid email or password');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreatePoll = () => {
    if (!isAdmin) {
      setShowAdminLogin(true);
      return;
    }

    if (!newPollTitle.trim()) {
      setError('Please enter a poll title');
      return;
    }
    if (newPollOptions.some(option => !option.trim())) {
      setError('Please fill in all options');
      return;
    }

    const pollsRef = ref(db, 'polls');
    const newPoll = {
      title: newPollTitle,
      options: newPollOptions.reduce((acc, option, index) => {
        acc[index] = { text: option, votes: 0 };
        return acc;
      }, {}),
      createdAt: Date.now(),
      createdBy: auth.currentUser.email,
    };
    push(pollsRef, newPoll);
    setNewPollTitle('');
    setNewPollOptions(['', '']);
    setError('');
  };

  const handleVote = (pollId, optionIndex) => {
    if (votedPolls[pollId]) {
      setError('You have already voted on this poll!');
      return;
    }

    const pollRef = ref(db, `polls/${pollId}/options/${optionIndex}/votes`);
    const poll = polls.find(p => p.id === pollId);
    const currentVotes = poll.options[optionIndex].votes || 0;
    
    set(pollRef, currentVotes + 1).then(() => {
      setVotedPolls(prev => ({
        ...prev,
        [pollId]: optionIndex
      }));
      setError('');
    });
  };

  const addOption = () => {
    if (newPollOptions.length >= 5) {
      setError('Maximum 5 options allowed');
      return;
    }
    setNewPollOptions([...newPollOptions, '']);
    setError('');
  };

  const hasVoted = (pollId) => {
    return votedPolls[pollId] !== undefined;
  };

  const getTotalVotes = (poll) => {
    return Object.values(poll.options).reduce((sum, option) => sum + (option.votes || 0), 0);
  };

  return (
    <div className="container">
      <div className="app-header">
        <h1>Real-time Polling App</h1>
        {!isAdmin && (
          <button 
            onClick={() => setShowAdminLogin(true)}
            className="admin-login-button"
          >
            Login as Admin
          </button>
        )}
      </div>
      
      {isAdmin && (
        <div className="admin-header">
          <span>Admin Mode ({auth.currentUser.email})</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {showAdminLogin && !isAdmin && (
        <div className="login-container">
          <h2>Admin Login</h2>
          <form onSubmit={handleAdminLogin} className="login-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button type="submit">Login</button>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="create-poll">
          <h2>Create New Poll</h2>
          <input
            type="text"
            value={newPollTitle}
            onChange={(e) => setNewPollTitle(e.target.value)}
            placeholder="Poll question"
            maxLength={100}
          />
          {newPollOptions.map((option, index) => (
            <input
              key={index}
              type="text"
              value={option}
              onChange={(e) => {
                const newOptions = [...newPollOptions];
                newOptions[index] = e.target.value;
                setNewPollOptions(newOptions);
              }}
              placeholder={`Option ${index + 1}`}
              maxLength={50}
            />
          ))}
          <button onClick={addOption} disabled={newPollOptions.length >= 5}>
            Add Option
          </button>
          <button onClick={handleCreatePoll}>Create Poll</button>
        </div>
      )}

      <div className="polls-list">
        <h2>Active Polls</h2>
        {polls.sort((a, b) => b.createdAt - a.createdAt).map((poll) => (
          <div key={poll.id} className="poll">
            <h3>{poll.title}</h3>
            <div className="poll-creator">
              Created at: {new Date(poll.createdAt).toLocaleString()}
            </div>
            <div className="options">
              {Object.entries(poll.options).map(([index, option]) => {
                const totalVotes = getTotalVotes(poll);
                const percentage = totalVotes > 0 
                  ? Math.round((option.votes || 0) / totalVotes * 100) 
                  : 0;
                
                return (
                  <div key={index} className="option">
                    <button 
                      onClick={() => handleVote(poll.id, index)}
                      disabled={hasVoted(poll.id)}
                      style={{
                        background: hasVoted(poll.id) 
                          ? (votedPolls[poll.id] === Number(index) ? '#e3f2fd' : '#f8f9fa')
                          : '#f8f9fa'
                      }}
                    >
                      {option.text} ({option.votes || 0} votes - {percentage}%)
                      {hasVoted(poll.id) && votedPolls[poll.id] === Number(index) && ' ✓'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="poll-footer">
              Total votes: {getTotalVotes(poll)}
              {hasVoted(poll.id) && <span className="voted-message">You voted on this poll</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
