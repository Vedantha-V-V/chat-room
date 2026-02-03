import { useState, useEffect } from 'react';
import OnboardingScreen from './components/onboarding/OnboardingScreen';
import QueueScreen from './components/queue/QueueScreen';
import ChatScreen from './components/chat/ChatScreen';
import '../src/styles/matrix-theme.css';
import './App.css';

/**
 * Main App Component
 * Handles the complete user flow:
 * 1. Onboarding (Device ID + Verification)
 * 2. Queue (Find Match)
 * 3. Chat (1-to-1 messaging)
 */
function App() {
  const [userData, setUserData] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [appState, setAppState] = useState('onboarding'); // onboarding, queue, chat

  // Load saved user data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('anonymous_chat_user');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setUserData(data);
        setAppState('queue');
      } catch (e) {
        console.error('Failed to load user data:', e);
      }
    }
  }, []);

  const handleOnboardingComplete = (data) => {
    // Save user data
    const userDataToSave = {
      deviceId: data.deviceId,
      gender: data.gender,
      verifiedAt: new Date().toISOString(),
    };
    localStorage.setItem('anonymous_chat_user', JSON.stringify(userDataToSave));
    setUserData(userDataToSave);
    setAppState('queue');
  };

  const handleMatchFound = (match) => {
    setCurrentMatch(match);
    setAppState('chat');
  };

  const handleChatDisconnect = () => {
    setCurrentMatch(null);
    setAppState('queue');
  };

  return (
    <div className="app">
      <div className="matrix-bg"></div>
      
      {appState === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {appState === 'queue' && userData && (
        <QueueScreen
          onMatchFound={handleMatchFound}
          userGender={userData.gender}
        />
      )}

      {appState === 'chat' && currentMatch && (
        <ChatScreen
          matchId={currentMatch.matchId}
          onDisconnect={handleChatDisconnect}
        />
      )}
    </div>
  );
}

export default App;
