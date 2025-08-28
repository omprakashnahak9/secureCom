# Bluetooth Chat - Offline P2P Messaging with Secret Key Pairing

A cross-platform React web application that enables secure, offline chat between two users via Bluetooth, featuring instant pairing with secret keys and traditional device scanning.

## Features

- 🔑 **Secret Key Instant Pairing**: Connect instantly by entering the same pre-shared secret key on both devices
- 🔵 **Bluetooth Discovery & Pairing**: Traditional device scanning and manual connection
- 💬 **Real-time Chat Interface**: Simple, intuitive messaging with conversation history
- 🔒 **AES Encryption**: All messages encrypted using secret key or generated encryption
- 📱 **Mobile-Friendly**: Responsive design optimized for mobile devices
- 🔄 **Connection Management**: Visual connection status and graceful disconnect handling
- 🚫 **No Internet Required**: Works completely offline using Web Bluetooth API
- 🎨 **Minimalist Design**: Clean, modern UI with smooth animations and dual connection modes

## Browser Compatibility

This app requires browsers with Web Bluetooth API support:

### ✅ Supported Browsers
- **Chrome** (Desktop & Mobile) - Recommended
- **Microsoft Edge** (Desktop & Mobile)
- **Opera** (Desktop & Mobile)
- **Samsung Internet** (Mobile)

### ❌ Not Supported
- Safari (iOS/macOS) - No Web Bluetooth support
- Firefox - Limited/experimental support

## Prerequisites

1. **Bluetooth-enabled devices** (laptops, phones, tablets)
2. **Bluetooth must be enabled** on both devices
3. **HTTPS connection** (required for Web Bluetooth API)
4. **Devices within Bluetooth range** (typically 10-30 feet)

## Installation & Setup

### Option 1: Development Server

1. **Clone or download** this project
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start development server**:
   ```bash
   npm start
   ```
4. **Access via HTTPS**: The app will open at `https://localhost:3000`

### Option 2: Production Build

1. **Build the app**:
   ```bash
   npm run build
   ```
2. **Serve over HTTPS** using any static server:
   ```bash
   # Using Python
   cd build
   python -m http.server 8000
   
   # Using Node.js serve
   npx serve -s build -l 8000
   
   # Using nginx, Apache, etc.
   ```

### Option 3: Deploy to Hosting

Deploy the `build` folder to any static hosting service:
- **Netlify**: Drag & drop the build folder
- **Vercel**: Connect your repository
- **GitHub Pages**: Enable Pages in repository settings
- **Firebase Hosting**: Use Firebase CLI

## Testing Instructions

### Method 1: Secret Key Instant Pairing (Recommended)

**Two Device Testing:**

1. **Device A Setup**:
   - Open the app in Chrome/Edge
   - Ensure Bluetooth is enabled
   - Select "🔑 Secret Key" tab (default)
   - Enter a secret key (e.g., "myroom123")
   - Click "Connect with Key"

2. **Device B Setup**:
   - Open the same app URL on second device
   - Ensure Bluetooth is enabled
   - Select "🔑 Secret Key" tab
   - Enter the **exact same secret key** ("myroom123")
   - Click "Connect with Key"

3. **Instant Connection**:
   - Both devices should connect automatically
   - Status shows "Connected" with 🔒 Encrypted indicator
   - Messages are encrypted using the shared secret key
   - Start chatting immediately!

**Single Device Testing:**
1. Open **two browser tabs** with the app
2. Use the same secret key in both tabs
3. Connect and test messaging between tabs

### Method 2: Traditional Device Scanning

1. **Device A Setup**:
   - Select "📡 Scan Devices" tab
   - Click "Scan for Devices"
   - Make device discoverable when prompted

2. **Device B Setup**:
   - Select "📡 Scan Devices" tab
   - Click "Scan for Devices"
   - Select Device A from the list

3. **Manual Connection**:
   - Follow pairing prompts
   - Start chatting once connected

### Troubleshooting

**Connection Issues:**
- Ensure both devices have Bluetooth enabled
- Check that devices are within range (10-30 feet)
- Try refreshing the page and reconnecting
- Make sure you're using HTTPS (not HTTP)

**Browser Issues:**
- Use Chrome or Edge for best compatibility
- Enable Bluetooth permissions when prompted
- Check browser console for error messages

**Performance Issues:**
- Close other Bluetooth applications
- Restart Bluetooth on both devices
- Clear browser cache and reload

## Technical Details

### Architecture
- **Frontend**: React 18 with functional components and hooks
- **Encryption**: AES encryption using CryptoJS library
- **Communication**: Web Bluetooth API with GATT services
- **Styling**: Pure CSS with responsive design

### Security Features
- **AES-256 Encryption**: All messages encrypted before transmission
- **Ephemeral Keys**: Encryption keys generated per session
- **No Persistent Storage**: Messages not stored permanently
- **Local Processing**: All encryption/decryption happens locally

### Bluetooth Implementation
- **Service UUID**: `12345678-1234-1234-1234-123456789abc`
- **Characteristic UUID**: `87654321-4321-4321-4321-cba987654321`
- **Connection Type**: GATT (Generic Attribute Profile)
- **Range**: Standard Bluetooth range (10-30 feet)

## File Structure

```
bluetooth-chat/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js             # Main React component
│   ├── BluetoothService.js # Bluetooth functionality
│   ├── index.js           # React entry point
│   └── index.css          # Styles
├── package.json           # Dependencies
└── README.md             # This file
```

## Development

### Available Scripts
- `npm start` - Development server with hot reload
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Adding Features

The codebase is structured for easy extension:

1. **Voice Messages**: Extend BluetoothService.js to handle audio data
2. **File Sharing**: Add file transfer capabilities
3. **Group Chat**: Implement mesh networking
4. **Message History**: Add local storage (optional)

## Limitations

- **Browser Support**: Limited to Chromium-based browsers
- **Range**: Standard Bluetooth range limitations
- **Pairing**: May require manual Bluetooth pairing on some devices
- **iOS Safari**: Not supported due to lack of Web Bluetooth API

## License

MIT License - Feel free to use and modify for your projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple devices
5. Submit a pull request

---

**Note**: This app demonstrates the capabilities of Web Bluetooth API for peer-to-peer communication. For production use, consider additional security measures and error handling based on your specific requirements.