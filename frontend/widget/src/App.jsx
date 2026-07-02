import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Landing from './screens/Landing';
import Calling from './screens/Calling';
import EndCall from './screens/EndCall';

const SERVER_URL = 'http://localhost:5000';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [socket, setSocket] = useState(null);
  const [callData, setCallData] = useState(null);
  const [error, setError] = useState('');
  const [agentText, setAgentText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [userText, setUserText] = useState('');

  // Get product ID from URL
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('pid');

  useEffect(() => {
    // Init socket
    const s = io(SERVER_URL);
    setSocket(s);

    s.on('connect', () => {
      console.log('Socket connected');
    });

    s.on('demo-started', (data) => {
      setCallData(data);
      setScreen('calling');
    });

    s.on('demo-error', (data) => {
      setError(data.message);
    });

    s.on('agent-speaking', (data) => {
      setAgentText(data.text);
    });

    s.on('agent-thinking', (thinking) => {
      setIsThinking(thinking);
    });

    s.on('user-transcript', (data) => {
      setUserText(data.text);
    });

    s.on('demo-ended', () => {
      setScreen('end');
    });

    return () => s.disconnect();
  }, []);

  const startDemo = () => {
    if (!socket || !productId) return;
    setError('');
    socket.emit('start-demo', { productId });
    setScreen('loading');
  };

  const endDemo = (email, name) => {
    if (!socket || !callData) return;
    socket.emit('end-demo', {
      callId: callData.callId,
      prospectEmail: email,
      prospectName: name
    });
  };

  if (!productId) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-red-400 text-sm">No product ID provided</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {screen === 'landing' && (
        <Landing onStart={startDemo} error={error} />
      )}
      {screen === 'loading' && (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Starting your demo...</p>
        </div>
      )}
      {screen === 'calling' && callData && (
        <Calling
          callData={callData}
          socket={socket}
          agentText={agentText}
          isThinking={isThinking}
          userText={userText}
          onEnd={() => setScreen('ending')}
        />
      )}
      {screen === 'ending' && (
        <EndCall onSubmit={endDemo} />
      )}
      {screen === 'end' && (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4 px-6">
          <div className="text-4xl">🎉</div>
          <h2 className="text-white text-xl font-bold text-center">Thanks for the demo!</h2>
          <p className="text-gray-500 text-sm text-center">Our team will be in touch soon.</p>
        </div>
      )}
    </div>
  );
}