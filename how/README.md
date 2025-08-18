# Love Project ❤️

A beautiful full-stack application built with modern web technologies.

## 🚀 Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/UI** - Beautiful component library
- **Lucide React** - Icon library

### Backend
- **Express.js** - Node.js web framework
- **MongoDB Atlas** - Cloud NoSQL database
- **Mongoose** - MongoDB object modeling
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
love/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/    # Shadcn/UI components
│   │   ├── lib/       # Utility functions
│   │   └── App.tsx    # Main application
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Express.js server
│   ├── server.js      # Main server file
│   ├── package.json
│   └── env.example    # Environment variables example
├── package.json       # Root package.json
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (already configured)

### Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example file in backend
   cp backend/env.example backend/.env
   ```

3. **Database is already configured:**
   - MongoDB Atlas connection is set up
   - Database name: `sodeclick`
   - Connection string is configured in `backend/server.js`

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
This will start both frontend (port 5173) and backend (port 5001) simultaneously.

### Individual Services

**Frontend only:**
```bash
npm run dev:frontend
```

**Backend only:**
```bash
npm run dev:backend
```

### Production Mode
```bash
npm run start
```

## 🌐 Access Points

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5001
- **Health Check:** http://localhost:5001/api/health

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run start` | Start both frontend and backend in production mode |
| `npm run install-all` | Install dependencies for all packages |
| `npm run build` | Build the frontend for production |

## 🎨 Features

- **Beautiful UI:** Modern design with TailwindCSS and Shadcn/UI
- **Responsive:** Works on all device sizes
- **Fast Development:** Hot reload with Vite
- **API Ready:** Express.js backend with MongoDB Atlas
- **Type Safety:** TypeScript support
- **Modern Icons:** Lucide React icons
- **Cloud Database:** MongoDB Atlas with database `sodeclick`

## 🔧 Configuration

### Frontend Configuration
- Port: 5173 (configured in `frontend/vite.config.ts`)
- Auto-open browser on start
- Hot module replacement enabled
- TailwindCSS with PostCSS configured

### Backend Configuration
- Port: 5001 (configurable via environment variable)
- CORS enabled for frontend communication
- MongoDB Atlas connection with database `sodeclick`
- Environment variables support

## 🗄️ Database

- **Provider:** MongoDB Atlas
- **Database:** sodeclick
- **Connection:** Already configured in `backend/server.js`
- **Status:** Ready to use

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**
   - Change ports in `vite.config.ts` (frontend) or `.env` (backend)

2. **MongoDB connection failed:**
   - Connection string is already configured
   - Database `sodeclick` is ready to use

3. **Dependencies not installed:**
   - Run `npm run install-all` from root directory

4. **TailwindCSS PostCSS error:**
   - Fixed with `@tailwindcss/postcss` package

## 📄 License

ISC License

---

Built with ❤️ using modern web technologies
"# SodeClickTest" 
