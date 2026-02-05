# 📚 StudySync

A real-time collaborative whiteboard with integrated video conferencing for study sessions.

## ✨ Features

- **Real-time Collaboration** - Draw, write, and annotate together in sync
- **Video Conferencing** - Built-in video calls powered by Jitsi Meet
- **Rich Drawing Tools** - Pens, pencils, brushes, shapes, and more
- **Resizable Panels** - Customize your workspace layout
- **Room System** - Create or join rooms for different study sessions

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start the development server (frontend)
npm run dev

# In a separate terminal, start the Socket.io server
npm run server
```

### Production

```bash
# Build for production
npm run build

# Start the production server
npm start
```

## 🌐 Deployment (Render)

1. Push this repository to GitHub
2. Go to [render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration
5. Deploy!

Your app will be available at `https://studysync.onrender.com`

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **State**: Redux Toolkit
- **Backend**: Express + Socket.io
- **Video**: Jitsi Meet External API

## 📁 Project Structure

```
studysync/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks (useSocket, etc.)
│   ├── store/          # Redux store & slices
│   └── types/          # TypeScript types
├── server/
│   └── index.js        # Socket.io server
├── render.yaml         # Render deployment config
└── package.json
```

## 📄 License

MIT
