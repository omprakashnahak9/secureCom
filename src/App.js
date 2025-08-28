import React, { useState, useEffect, useRef } from 'react';
import CryptoJS from 'crypto-js';

const CHAT_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const MESSAGE_CHARACTERISTIC_UUID = '87654321-4321-4321-4321-cba987654321';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
    
    // Generate encryption key
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    setEncryptionKey(key);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const encryptMessage = (message) => {
    return CryptoJS.AES.encrypt(message, encryptionKey).toString();
  };

  const decryptMessage = (encryptedMessage) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return '[Decryption failed]';
    }
  };

  const connectToDevice = async () => {
    try {
      setIsConnecting(true);
      setError('');

      // Request device
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [CHAT_SERVICE_UUID] }],
        optionalServices: [CHAT_SERVICE_UUID]
      });

      setDevice(selectedDevice);

      // Connect to GATT server
      const server = await selectedDevice.gatt.connect();
      
      // Get service
      const service = await server.getPrimaryService(CHAT_SERVICE_UUID);
      
      // Get characteristic
      const char = await service.getCharacteristic(MESSAGE_CHARACTERISTIC_UUID);
      setCharacteristic(char);

      // Start notifications
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', handleIncomingMessage);

      // Handle disconnection
      selectedDevice.addEventListener('gattserverdisconnected', handleDisconnection);

      setIsConnected(true);
      setIsConnecting(false);
      
      addSystemMessage('Connected successfully! Messages are encrypted.');
      
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
      setIsConnecting(false);
    }
  };

  const handleIncomingMessage = (event) => {
    const value = event.target.value;
    const encryptedMessage = new TextDecoder().decode(value);
    const decryptedMessage = decryptMessage(encryptedMessage);
    
    if (decryptedMessage && decryptedMessage !== '[Decryption failed]') {
      addMessage(decryptedMessage, 'received');
    }
  };

  const handleDisconnection = () => {
    setIsConnected(false);
    setDevice(null);
    setCharacteristic(null);
    addSystemMessage('Disconnected from device.');
  };

  const disconnect = async () => {
    if (device && device.gatt.connected) {
      device.gatt.disconnect();
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !characteristic || !isConnected) return;

    try {
      const encryptedMessage = encryptMessage(inputMessage.trim());
      const encoder = new TextEncoder();
      const data = encoder.encode(encryptedMessage);
      
      await characteristic.writeValue(data);
      addMessage(inputMessage.trim(), 'sent');
      setInputMessage('');
      
    } catch (err) {
      setError(`Failed to send message: ${err.message}`);
    }
  };

  const addMessage = (text, type) => {
    const message = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, message]);
  };

  const addSystemMessage = (text) => {
    const message = {
      id: Date.now(),
      text,
      type: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, message]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getConnectionStatus = () => {
    if (isConnecting) return { text: 'Connecting...', class: 'connecting' };
    if (isConnected) return { text: 'Connected', class: 'connected' };
    return { text: 'Disconnected', class: 'disconnected' };
  };

  const status = getConnectionStatus();

  if (!navigator.bluetooth) {
    return (
      <div className="app">
        <div className="header">
          <h1>Bluetooth Chat</h1>
        </div>
        <div className="connection-panel">
          <h2>Not Supported</h2>
          <p>Web Bluetooth is not supported in this browser. Please use:</p>
          <ul style={{ textAlign: 'left', margin: '20px 0' }}>
            <li>Chrome (desktop/mobile)</li>
            <li>Microsoft Edge</li>
            <li>Opera</li>
          </ul>
          <p>Make sure Bluetooth is enabled on your device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Bluetooth Chat</h1>
        <div className="status">
          <div className={`status-dot ${status.class}`}></div>
          {status.text}
        </div>
        {isConnected && (
          <div className="encryption-status">
            🔒 Encrypted
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!isConnected && !isConnecting ? (
        <div className="connection-panel">
          <h2>Connect to Chat</h2>
          <p>
            Connect to another device running this app to start chatting securely over Bluetooth.
          </p>
          <p>
            Make sure both devices have Bluetooth enabled and are nearby.
          </p>
          <button 
            className="btn" 
            onClick={connectToDevice}
            disabled={isConnecting}
          >
            Find & Connect
          </button>
        </div>
      ) : (
        <div className="chat-container">
          <div className="messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.type}`}
              >
                <div className="message-bubble">
                  {message.text}
                </div>
                <div className="message-time">
                  {message.timestamp}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {isConnected && (
            <div className="input-container">
              <textarea
                className="message-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                rows={1}
              />
              <button 
                className="btn send-btn" 
                onClick={sendMessage}
                disabled={!inputMessage.trim()}
              >
                ➤
              </button>
            </div>
          )}

          {isConnected && (
            <div style={{ padding: '10px 20px', textAlign: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={disconnect}
                style={{ fontSize: '0.9rem', padding: '8px 16px' }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;