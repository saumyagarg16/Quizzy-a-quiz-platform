const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app=express();
const port=3000;

app.use(bodyParser.json());
app.use(cors());

//connect to database 
mongoose.connect('mongodb://localhost:27017/quizzy', {useNewUrlParser: true, useUnifiedTopology: true});

//schemas and models
const userSchema = new mongoose.Schema({
username: {type: String, unique: true},
password: String, 
});

const quizSchema = new mongoose.Schema({
title: String,
createdBy:  mongoose.Schema.Types.ObjectId,  //changes
questions: [
    {
        questionText: String,
        correctAnswer: String,
    }
]
});

const User = mongoose.model('user', userSchema);

const Quiz = mongoose.model('Quiz', quizSchema);

//authenticate jwt
const authenticatejwt=(req, res, next)=>{
    const token = req.header('Authorization').replace('Bearer ', '');
    if(!token) return res.status(401).send('Access denied. No token provided');

    try{
        const decoded = jwt.verify(token, 'jwtPrivateKey');
        req.user = decoded;
        next();
    } catch(ex) {
        res.status(400).send('Invalid token.');
    }
};

app.post('/register', async (req, res)=>{
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    if (user) return res.status(400).send('User already exists.');

    user = new User({ username, password: await bcrypt.hash(password, 10) });
    await user.save();

    const token = jwt.sign({_id: user._id, username: user.username}, 'jwtprivatekey');
    res.send({token});
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).send('Invalid username or password.');

    const validPassword = bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send('Invalid username or password.');

    const token = jwt.sign({ _id: user._id, username: user.username }, 'jwtPrivateKey');
    res.send({ token });
});

app.post('/quizzes', authenticatejwt, async (req, res) => {
    const { title } = req.body;
    const quiz = new Quiz({ title, createdBy: req.user._id, questions: [] }); //changes
    await quiz.save();
    res.send(quiz);
});

app.post('/quizzes/:quizId/questions', authenticatejwt, async (req, res) => {
    const { quizId } = req.params;
    const { questionText, correctAnswer } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).send('Quiz not found.');

    quiz.questions.push({ questionText, correctAnswer });
    await quiz.save();
    res.send(quiz);
});

app.get('/quizzes', async (req, res) => {
    const quizzes = await Quiz.find();
    res.send(quizzes);
});

app.get('/quizzes/:quizId', async (req, res) => {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).send('Quiz not found.');
    res.send(quiz);
});

app.post('/quizzes/:quizId/attempt', authenticatejwt, async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body;

    console.log(`Received answers: ${JSON.stringify(answers)}`);

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).send('Quiz not found.');

    let score = 0;
    quiz.questions.forEach((question, index) => {
        console.log(`Correct answer: ${question.correctAnswer.trim().toLowerCase()}`);
        console.log(`User answer: ${answers[index].trim().toLowerCase()}`);
        if (question.correctAnswer.trim().toLowerCase() === answers[index].trim().toLowerCase()) {
            score++;
        }
    });
    res.send({ score, total: quiz.questions.length });
});


app.delete('/quizzes/:quizId', authenticatejwt, async (req, res) => {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).send('Quiz not found.');

    if (quiz.createdBy !== req.user._id) {
        return res.status(401).send('User not authorized.');
    }

    await quiz.remove();
    res.send({ message: 'Quiz deleted successfully' });
});

app.listen(port, ()=>{
    console.log(`Server running on port ${port}`);
});
