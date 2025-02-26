const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios'); // Import axios
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// Define User Schema
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  moodleToken: { type: String, required: true },
  fullName: { type: String, required: true },
}));

// Define Q&A Schema
const QA = mongoose.model('QA', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  question: String,
  answers: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      answer: String,
      date: String,
    },
  ],
  date: String,
}));

// Define Deadline Schema (Added)
const Deadline = mongoose.model('Deadline', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  courseId: Number,
  courseName: String,
  assignment: String,
  dueDate: Date,
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => res.redirect('/login'));

// Register Route
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
  try {
    const { username, password, moodleToken } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash, moodleToken, fullName: username });
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering user.");
  }
});

// Login Route
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      req.session.user = user;
      res.redirect('/home');
    } else {
      res.send("Invalid username or password. <a href='/login'>Try again</a>");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Login error.");
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Home Route
app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  res.render('home', { user: req.session.user });
});

// Q&A Route - Display All Q&A
app.get('/qa', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const qaList = await QA.find();
  res.render('qa', { qaList, user: req.session.user });
});

// Q&A Route - Add New Question
app.post('/qa/add-question', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  const { question } = req.body;
  const newQuestion = new QA({
    userId: req.session.user._id,
    question,
    answers: [],
    date: new Date().toISOString().split('T')[0]
  });

  await newQuestion.save();
  res.redirect('/qa');
});

// Q&A Route
app.post('/qa/add-answer/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { id } = req.params;
  const { answer } = req.body;

  await QA.findByIdAndUpdate(id, {
    $push: {
      answers: {
        userId: req.session.user._id,
        answer,
        date: new Date().toISOString().split('T')[0],
      }
    }
  });

  res.redirect('/qa');
});

// Moodle Deadlines Sync Route
app.get('/deadlines', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    if (!req.session.user.moodleToken) {
      return res.status(401).send("Unauthorized: Moodle token missing.");
    }

    const moodleResponse = await axios.get(
      'https://moodle.astanait.edu.kz/webservice/rest/server.php',
      {
        params: {
          wstoken: req.session.user.moodleToken,
          wsfunction: 'mod_assign_get_assignments',
          moodlewsrestformat: 'json'
        }
      }
    );
    console.log(moodleResponse)

    const courses = moodleResponse.data.courses || [];
    const userId = req.session.user._id;

    for (const course of courses) {
      for (const assignment of course.assignments || []) {
        const existingDeadline = await Deadline.findOne({ userId, courseId: course.id, assignment: assignment.name });

        if (!existingDeadline) {
          await Deadline.create({
            userId,
            courseId: course.id,
            courseName: course.fullname,
            assignment: assignment.name,
            dueDate: new Date(assignment.duedate * 1000),
          });
          console.log("Here")
        }
      }
    }

    res.redirect('/deadlines/view');
  } catch (error) {
    console.error("Moodle API Error:", error.response?.data || error.message);
    res.status(500).send("Error syncing deadlines.");
  }
});

// To render the frontend page
app.get('/deadlines/view', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    const now = new Date(); 
    const deadlines = await Deadline.find({ 
      userId: req.session.user._id, 
      dueDate: { $gte: now } 
    }).sort({ dueDate: 1 });

    res.render('deadlines', { deadlines });
  } catch (error) {
    console.error("Error fetching deadlines:", error.message);
    res.status(500).send("Error loading deadlines.");
  }
});

// To get active courses
app.get('/active-courses', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    if (!req.session.user.moodleToken) {
      return res.status(401).send("Unauthorized: Moodle token missing.");
    }
    const ii = await axios.get(
      'https://moodle.astanait.edu.kz/webservice/rest/server.php',
      {
        params: {
          wstoken: req.session.user.moodleToken,
          wsfunction: 'core_webservice_get_site_info',
          moodlewsrestformat: 'json'
        }
      }
    );

    const uid = ii.data.userid;
    const moodleResponse = await axios.get(
      'https://moodle.astanait.edu.kz/webservice/rest/server.php',
      {
        params: {
          wstoken: req.session.user.moodleToken,
          wsfunction: 'core_enrol_get_users_courses',
          moodlewsrestformat: 'json',
          userid: uid
        }
      }
    );

    const now = Math.floor(Date.now() / 1000); 
    const activeCourses = moodleResponse.data
      .filter(course => course.enddate >= now) 
      .map(course => ({
        id: course.id,
        fullname: course.fullname
      }));

    res.render('courses', { courses: activeCourses });
  } catch (error) {
    console.error("Error fetching courses:", error.response?.data || error.message);
    res.status(500).send("Error fetching active courses.");
  }
});

// To see course specific grades
app.get('/grades/:courseId', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
      if (!req.session.user.moodleToken) {
          return res.status(401).send("Unauthorized: Moodle token missing.");
      }

      const courseId = req.params.courseId;

      const ii = await axios.get(
        'https://moodle.astanait.edu.kz/webservice/rest/server.php',
        {
          params: {
            wstoken: req.session.user.moodleToken,
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json'
          }
        }
      );
  
      const uid = ii.data.userid;

      const moodleResponse = await axios.get(
          'https://moodle.astanait.edu.kz/webservice/rest/server.php',
          {
              params: {
                  wstoken: req.session.user.moodleToken,
                  wsfunction: 'gradereport_user_get_grade_items',
                  moodlewsrestformat: 'json',
                  courseid: courseId,
                  userid: uid
              }
          }
      );

      console.log("Moodle API Response:", moodleResponse.data); // Debug response

      const grades = moodleResponse.data?.usergrades?.[0]?.gradeitems || [];

      console.log("Filtered Grades:", grades); // Debug filtered grades

      res.render('grades', { grades });
  } catch (error) {
      console.error("Error fetching grades:", error.response?.data || error.message);
      res.status(500).send("Error fetching grades.");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
