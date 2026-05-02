# 🍎 Halona Fruits - Full-Stack E-Commerce Platform

Complete fruit shop e-commerce solution with AI features.

## 📱 Features

- 🔧 **Backend API** - NestJS REST API
- 🤖 **AI Services** - Fruit Recognition + Chatbot
- 📱 **Mobile App** - React Native (iOS & Android)
- 💼 **Admin Dashboard** - React Web
- 🛒 **User Website** - React Web

## 🏗️ Tech Stack

**Backend:** NestJS, TypeScript, MySQL  
**AI:** Python, TensorFlow, Google Gemini  
**Mobile:** React Native, Expo  
**Web:** React, Vite, TypeScript

## 📦 Installation

See individual README files in each folder.

## 📥 Important Notes

- AI model files (*.keras, *.h5) not included due to size
- node_modules folders excluded - run `npm install` in each project
- Python venv excluded - create with `python -m venv venv`

## 📄 Project Structure
├── fruit-shop-backend/    # NestJS API (Port 3000)
├── fruit-ai/             # Python AI Services
│   ├── image-recognition/ # Port 8000
│   └── chatbot/          # Port 8001
├── fruit-shop-app/       # Mobile App (Expo)
├── fruit-shop-admin/     # Admin Dashboard
└── fruit-shop-user/      # Customer Website
