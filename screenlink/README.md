# ScreenLink 🖥️

A lightweight, browser-based screen sharing tool for tech support and remote collaboration. Alternative to TeamViewer/LogMeIn - no downloads, no accounts, just share and go.

![ScreenLink Screenshot](https://via.placeholder.com/800x400/6366f1/ffffff?text=ScreenLink)

## ✨ Features

- 🔗 **Peer-to-peer WebRTC** - Direct connection between browsers, no server handling video
- 🔢 **6-digit room codes** - Simple codes to join sessions instantly
- 🖱️ **One-click screen share** - Share your entire screen or a specific window
- 🌐 **No download required** - Works entirely in the browser
- 💬 **Built-in chat** - Communicate while sharing screens
- 🔥 **NAT traversal** - Works across firewalls using public STUN servers

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Modern browser (Chrome, Firefox, Edge, Safari)

### Installation

1. **Install dependencies:**
```bash
cd prototypes/screenlink
pip install -r requirements.txt
```

2. **Run the server:**
```bash
python main.py
```

3. **Open in browser:**
Navigate to `http://localhost:8000`

## 📖 How to Use

### Hosting a Session
1. Click **"Create Room"** on the home page
2. Share the 6-digit code with your guest
3. Click **"Share Screen"** in the room
4. Select what you want to share (entire screen, window, or tab)

### Joining a Session
1. Enter the 6-digit room code
2. Click **"Join Room"**
3. Wait for the host to start sharing
4. Use the chat to communicate

## 🏗️ Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Host      │◄──────────────────►│  Signaling  │
│  Browser    │    (Socket.IO)     │   Server    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │      ┌──────────────────┐       │
       └─────►│   WebRTC P2P     │◄──────┘
              │   Direct Conn    │
              └──────────────────┘
                     ▲
                     │
              ┌──────┴──────┐
              │ Guest       │
              │ Browser     │
              └─────────────┘
```

- **Signaling Server**: Handles room management and WebRTC handshake (Socket.IO)
- **WebRTC**: Peer-to-peer video stream (no server in the media path)
- **STUN Servers**: Public Google STUN servers for NAT traversal

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python) |
| Real-time | Socket.IO |
| Frontend | Vanilla JS + HTMX |
| WebRTC | Native Browser API |
| Styling | CSS Custom Properties |

## 📁 Project Structure

```
screenlink/
├── main.py              # FastAPI server with Socket.IO
├── requirements.txt     # Python dependencies
├── templates/
│   ├── index.html      # Home page (create/join)
│   └── room.html       # Screen sharing room
└── static/
    ├── css/
    │   └── style.css   # All styles
    └── js/
        └── webrtc.js   # WebRTC client logic
```

## 🔒 Security Notes

- No TURN servers configured (relayed connections won't work)
- For production, add TURN servers for symmetric NAT scenarios
- Room codes are random 6-digit numbers
- No encryption of signaling data (use HTTPS in production)
- Screen content is encrypted via WebRTC DTLS-SRTP

## 🚧 Future Enhancements

- [ ] File transfer between peers
- [ ] Multi-peer support (1 host, many viewers)
- [ ] Audio sharing
- [ ] Recording capability
- [ ] Password-protected rooms
- [ ] TURN server integration
- [ ] Mobile app support

## 📝 License

MIT License - Built for prototyping and educational purposes.

---

Built with ❤️ as a prototype for modern screen sharing.
