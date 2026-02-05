<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Vite-6.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

<h1 align="center">📚 StudySync</h1>

<p align="center">
  <strong>A real-time collaborative whiteboard with integrated video conferencing for virtual study sessions</strong>
</p>

<p align="center">
  <a href="https://studysync.onrender.com">View Demo</a> •
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## 🎯 Overview

**StudySync** is a modern, full-featured collaborative whiteboard application designed for remote learning and team collaboration. It combines a powerful drawing canvas with real-time video conferencing, allowing teams and study groups to brainstorm, teach, and learn together seamlessly.

## ✨ Features

### 🎨 Drawing Tools
- **Pens & Pencils** — Multiple pen types (ballpoint, felt-tip, gel, fountain) and pencil grades (HB, 2B, 4B)
- **Brushes** — Watercolor and marker brushes with customizable opacity
- **Shapes** — Rectangle, circle, triangle, diamond, star, heart, hexagon, arrows, and lines
- **Eraser** — Precision and wide eraser modes
- **Text Tool** — Add text annotations anywhere on the canvas

### 🤝 Real-time Collaboration
- **Live Sync** — See teammates' drawings instantly via WebSocket
- **User Cursors** — Track where others are working on the canvas
- **Room System** — Create or join private study rooms with unique codes
- **Participant Awareness** — See who's online in your session

### 📹 Video Conferencing
- **Integrated Video Calls** — Built-in video chat powered by Jitsi Meet
- **Resizable Panels** — Drag to adjust whiteboard and video panel sizes
- **Collapsible Header** — Maximize canvas space when needed
- **Audio/Video Controls** — Mute, camera toggle, and call controls

### 🎛️ Canvas Controls
- **Zoom & Pan** — Navigate large canvases with smooth zoom (25% - 400%)
- **Grid & Snap** — Optional grid overlay with snap-to-grid functionality
- **Background Options** — Plain, grid, or lined paper backgrounds
- **Undo/Redo** — Full history support for all actions
- **Export** — Save your work as PNG, SVG, or JSON

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Ishu154/studysync.git
cd studysync

# Install dependencies
npm install

# Start the development server
npm run dev

# In a new terminal, start the Socket.io server
npm run server
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 Usage

1. **Create or Join a Room** — Enter a room code to start or join a session
2. **Invite Others** — Share the room code with teammates
3. **Start Drawing** — Select tools from the left toolbar
4. **Enable Video** — Click the video icon in the top bar to start a video call
5. **Collaborate** — Draw, annotate, and discuss in real-time!

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS |
| **State Management** | Redux Toolkit |
| **Real-time** | Socket.io |
| **Video** | Jitsi Meet External API |
| **Backend** | Express.js, Node.js |
| **Deployment** | Render |

## 📁 Project Structure

```
studysync/
├── src/
│   ├── components/       # React components
│   │   ├── Canvas.tsx    # Main drawing canvas
│   │   ├── Toolbar.tsx   # Drawing tools sidebar
│   │   ├── TopBar.tsx    # Top navigation bar
│   │   ├── VideoPanel.tsx # Video conferencing panel
│   │   └── StudyRoomLayout.tsx # Main layout
│   ├── hooks/            # Custom hooks
│   │   └── useSocket.ts  # WebSocket connection
│   ├── store/            # Redux store
│   │   └── whiteboardSlice.ts
│   └── types/            # TypeScript definitions
├── server/
│   └── index.js          # Socket.io + Express server
├── render.yaml           # Render deployment config
└── package.json
```

## 🌐 Deployment

### Deploy on Render

1. Push your code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repository
4. Render auto-detects `render.yaml` configuration
5. Click **Deploy**

Your app will be live at `https://your-app.onrender.com`

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |

## � Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run server   # Start Socket.io server
npm start        # Start production server
npm run preview  # Preview production build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## �📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for learners everywhere
</p>
