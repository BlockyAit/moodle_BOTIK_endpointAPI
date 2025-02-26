# Node.js Web App with Authentication, Q&A, and Moodle Integration

## 📌 Overview
This is a Node.js web application that includes:
- User registration & login with **session-based authentication**.
- A **Q&A section** where users can post questions and answers.
- Integration with **Moodle API** to sync deadlines.
- A **home page** displaying user information and grades.
- Uses **MongoDB** as the database.

## 🚀 Features
- **User Authentication** (Register, Login, Logout)
- **Q&A Section** (Users can post questions & answers stored in MongoDB)
- **Moodle Deadlines Sync** (Fetches assignments from Moodle API)
- **Session Management** (Session-based login using Express sessions)

## 🛠️ Installation & Setup
### 1️⃣ Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/en/download/) (v14+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community)

### 2️⃣ Clone the Repository
```sh
git clone https://github.com/BlockyAit/moodle_BOTIK_endpointAPI.git
cd your-repo
```

### 3️⃣ Install Dependencies
```sh
npm install
```

### 4️⃣ Set Up Environment Variables
Create a `.env` file in the root directory and add:
```
PORT=3000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
```
Replace `your_mongodb_connection_string` with your **MongoDB URI**.

### 5️⃣ Run the Server
```sh
npm start(node server.js)
```
Your server will start at **http://localhost:3000**.

## 📄 API Routes & Usage

### 📝 Authentication
| Route        | Method | Description |
|-------------|--------|-------------|
| `/register`  | GET    | Show registration page |
| `/register`  | POST   | Register a new user |
| `/login`     | GET    | Show login page |
| `/login`     | POST   | Authenticate user |
| `/logout`    | GET    | Logout user |

### ❓ Q&A Section
| Route              | Method | Description |
|--------------------|--------|-------------|
| `/qa`              | GET    | View all Q&A |
| `/qa/add-question` | POST   | Add a new question |
| `/qa/add-answer/:id` | POST   | Add an answer to an existing question |

### 📅 Moodle Deadlines
| Route        | Method | Description |
|-------------|--------|-------------|
| `/deadlines` | GET    | Sync deadlines from Moodle API |

### 🏠 Home Page
| Route  | Method | Description |
|--------|--------|-------------|
| `/home` | GET    | Display user info, grades, and deadlines |

## 📌 Folder Structure
```
📂 project-root
├── 📁 views            # EJS templates (UI)
├── server.js          # Main server file
├── .env               # Environment variables
├── package.json       # Project dependencies
└── README.md          # Documentation
```

## 🚀 Future Enhancements
- Improve UI with better **CSS & frontend enhancements**
- Add **Admin Panel** to manage users & questions


