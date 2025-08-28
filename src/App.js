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
  const [secretKey, setSecretKey] = useState('');
  const [connectionMode, setConnectionMode] = useState('secret'); // 'secret' or 'scan'
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
  }, []);

  // Generate encryption key from secret key
  useEffect(() => {
    if (secretKey) {
      const key = CryptoJS.SHA256(secretKey).toString();
      setEncryptionKey(key);
    }
  }, [secretKey]);

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

  // Generate service UUID from secret key for instant pairing
  const generateServiceUUID = (key) => {
    const hash = CryptoJS.SHA256(key).toString();
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  };

  // Connect using secret key (instant pairing)
  const connectWithSecretKey = async () => {
    if (!secretKey.trim()) {
      setError('Please enter a secret key');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');
      
      const keyServiceUUID = generateServiceUUID(secretKey);
      addSystemMessage(`Looking for devices with key: ${secretKey.substring(0, 3)}***`);

      // Try to find device with matching secret key service
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [keyServiceUUID] }],
        optionalServices: [keyServiceUUID, CHAT_SERVICE_UUID]
      });

      setDevice(selectedDevice);
      const server = await selectedDevice.gatt.connect();
      
      try {
        // Try to get the key-based service first
        const keyService = await server.getPrimaryService(keyServiceUUID);
        const keyChar = await keyService.getCharacteristic(MESSAGE_CHARACTERISTIC_UUID);
        setCharacteristic(keyChar);

        await keyChar.startNotifications();
        keyChar.addEventListener('characteristicvaluechanged', handleIncomingMessage);
        
        addSystemMessage('🔑 Connected via secret key! End-to-end encrypted.');
      } catch (keyServiceError) {
        // Fallback to regular chat service
        const service = await server.getPrimaryService(CHAT_SERVICE_UUID);
        const char = await service.getCharacteristic(MESSAGE_CHARACTERISTIC_UUID);
        setCharacteristic(char);

        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', handleIncomingMessage);
        
        addSystemMessage('Connected to chat service!');
      }

      selectedDevice.addEventListener('gattserverdisconnected', handleDisconnection);
      setIsConnected(true);
      setIsConnecting(false);
      
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setError('No devices found with this secret key. Make sure the other device is using the same key and is nearby.');
      } else {
        setError(`Connection failed: ${err.message}`);
      }
      setIsConnecting(false);
    }
  };

  // Regular device scanning
  const connectToDevice = async () => {
    try {
      setIsConnecting(true);
      setError('');

      const selectedDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information', CHAT_SERVICE_UUID]
      });

      setDevice(selectedDevice);
      const server = await selectedDevice.gatt.connect();
      
      try {
        const service = await server.getPrimaryService(CHAT_SERVICE_UUID);
        const char = await service.getCharacteristic(MESSAGE_CHARACTERISTIC_UUID);
        setCharacteristic(char);

        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', handleIncomingMessage);
        
        addSystemMessage('Connected to existing chat service!');
      } catch (serviceError) {
        // Create mock connection for demo
        const mockChar = {
          writeValue: async (data) => {
            setTimeout(() => {
              const decoder = new TextDecoder();
              const encryptedMsg = decoder.decode(data);
              const decryptedMsg = decryptMessage(encryptedMsg);
              if (decryptedMsg !== '[Decryption failed]') {
                addMessage(`Echo: ${decryptedMsg}`, 'received');
              }
            }, 1000);
          }
        };
        setCharacteristic(mockChar);
        addSystemMessage('Connected! (Demo mode - messages will echo back)');
      }

      selectedDevice.addEventListener('gattserverdisconnected', handleDisconnection);
      setIsConnected(true);
      setIsConnecting(false);
      
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setError('No devices found. Make sure Bluetooth is enabled and other devices are nearby and discoverable.');
      } else if (err.name === 'SecurityError') {
        setError('Bluetooth access denied. Please allow Bluetooth permissions and try again.');
      } else {
        setError(`Connection failed: ${err.message}`);
      }
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

  // Generate random secret key
  const generateRandomKey = () => {
    const adjectives = ['Blue', 'Red', 'Green', 'Fast', 'Cool', 'Smart', 'Bright', 'Swift'];
    const nouns = ['Cat', 'Dog', 'Bird', 'Fish', 'Lion', 'Bear', 'Wolf', 'Fox'];
    const numbers = Math.floor(Math.random() * 999) + 100;
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}${numbers}`;
  };

  // Generate simple numeric key
  const generateNumericKey = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Generate word-based key
  const generateWordKey = () => {
    const words = ['apple', 'beach', 'cloud', 'dance', 'eagle', 'flame', 'grape', 'house'];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 99) + 10;
    return `${word1}-${word2}-${num}`;
  };

  // Copy key to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addSystemMessage(`Key copied: ${text}`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      addSystemMessage(`Key copied: ${text}`);
    }
  };

  // Share key via Web Share API (mobile)
  const shareKey = async (key) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bluetooth Chat Secret Key',
          text: `Join my secure chat with this key: ${key}`,
        });
      } catch (err) {
        copyToClipboard(key);
      }
    } else {
      copyToClipboard(key);
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
          <div className="connection-modes">
            <button 
              className={`mode-btn ${connectionMode === 'secret' ? 'active' : ''}`}
              onClick={() => setConnectionMode('secret')}
            >
              🔑 Secret Key
            </button>
            <button 
              className={`mode-btn ${connectionMode === 'scan' ? 'active' : ''}`}
              onClick={() => setConnectionMode('scan')}
            >
              📡 Scan Devices
            </button>
          </div>

          {connectionMode === 'secret' ? (
            <div className="secret-key-panel">
              <h2>Instant Pairing</h2>
              <p>Enter the same secret key on both devices for instant secure connection.</p>
              
              <div className="secret-input-container">
                <input
                  type="text"
                  className="secret-input"
                  placeholder="Enter or generate secret key..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && connectWithSecretKey()}
                />
                <button 
                  className="generate-btn"
                  onClick={() => setShowKeyOptions(!showKeyOptions)}
                  type="button"
                >
                  🎲
                </button>
              </div>

              {showKeyOptions && (
                <div className="key-generator">
                  <h3>Generate Secret Key</h3>
                  <div className="generator-options">
                    <button 
                      className="generator-btn"
                      onClick={() => {
                        const key = generateRandomKey();
                        setSecretKey(key);
                        setShowKeyOptions(false);
                      }}
                    >
                      🎯 Random Key<br/>
                      <small>e.g., BlueCat123</small>
                    </button>
                    <button 
                      className="generator-btn"
                      onClick={() => {
                        const key = generateNumericKey();
                        setSecretKey(key);
                        setShowKeyOptions(false);
                      }}
                    >
                      🔢 Number Key<br/>
                      <small>e.g., 456789</small>
                    </button>
                    <button 
                      className="generator-btn"
                      onClick={() => {
                        const key = generateWordKey();
                        setSecretKey(key);
                        setShowKeyOptions(false);
                      }}
                    >
                      📝 Word Key<br/>
                      <small>e.g., apple-cloud-42</small>
                    </button>
                  </div>
                </div>
              )}

              {secretKey && (
                <div className="key-actions">
                  <button 
                    className="action-btn"
                    onClick={() => copyToClipboard(secretKey)}
                  >
                    📋 Copy Key
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => shareKey(secretKey)}
                  >
                    📤 Share Key
                  </button>
                </div>
              )}

              <div className="key-info">
                <div className="info-item">
                  <span className="info-icon">🔒</span>
                  <span>Messages encrypted with your key</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">⚡</span>
                  <span>Instant connection when keys match</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">🚫</span>
                  <span>No internet required</span>
                </div>
              </div>

              <button 
                className="btn connect-btn" 
                onClick={connectWithSecretKey}
                disabled={!secretKey.trim() || isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect with Key'}
              </button>
            </div>
          ) : (
            <div className="scan-panel">
              <h2>Scan for Devices</h2>
              <p>Scan for any nearby Bluetooth devices and connect manually.</p>
              
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', margin: '15px 0', fontSize: '0.9rem' }}>
                <strong>Before scanning:</strong>
                <ul style={{ textAlign: 'left', marginTop: '8px', paddingLeft: '20px' }}>
                  <li>Enable Bluetooth on both devices</li>
                  <li>Make sure devices are discoverable</li>
                  <li>Stay within 30 feet of each other</li>
                </ul>
              </div>

              <button 
                className="btn" 
                onClick={connectToDevice}
                disabled={isConnecting}
              >
                {isConnecting ? 'Scanning...' : 'Scan for Devices'}
              </button>
            </div>
          )}
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