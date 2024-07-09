document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  let state = {
    user: null,
    quizzes: [],
    currentQuiz: null,
    currentQuestionIndex: 0,
    score: 0,
    token: null,
    answers: []
  };

  renderLogin();

  async function apiCall(url, method = "GET", data) {
    const options = {
      method,
      headers: {
        'content-Type': "application/json",
        'authorization': state.token ? `Bearer ${state.token}` : undefined,
      },
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(`http://localhost:3000${url}`, options);

    return response.json();
  }

  /*------------------------Login-------------------------*/

  function renderLogin() {
    app.innerHTML = `<h2>Login</h2>
        <form id="login-form">
            <input type="text" id="username" placeholder="username" required/>
            <input type="text" id="password" placeholder="password" required/>
            <button type="submit">Login</button>
            <button type="button" id="register-button">Register</button>
        </form>`;

    document
      .getElementById("login-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;

        const password = document.getElementById("password").value;

        const result = await apiCall("/login", "POST", { username, password });

        if (result.token) {
          state.user = { username };
          state.token = result.token;
          renderQuizCreation();
        } else {
          alert(result.message);
        }
      });

    document
      .getElementById("register-button")
      .addEventListener("click", renderRegister);
  }

  /*-------------------Register-------------------------*/
  function renderRegister() {
    app.innerHTML = `
       <h2>Register Yourself</h2>
       <form id="register-form">
        <input type="text" id="username" placeholder="username" required>
        <input type="text" id="password" placeholder="password" required>

        <button type="submit">Register</button>
        <button type="button" id="login-button">Login</button>
       </form>
       `;

    document
      .getElementById("register-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;

        const password = document.getElementById("password").value;

        const result = await apiCall("/register", "POST", {
          username,
          password,
        });

        if (result.token) {
          state.user = { username };
          state.token = result.token;
          renderQuizCreation();
        } else {
          alert(result.message);
        }
      });

    document
      .getElementById(login - button)
      .addEventListener("click", renderLogin);
  }

/*-------------------Quiz Creation-----------------------*/

  function renderQuizCreation() {
    app.innerHTML = `
    <h2>Create a Quiz</h2>
       <form id="quiz-form">
        <input type="text" id="quiz-title" placeholder="Quiz Title" required/>
        <button type="submit">Create Quiz</button>
       </form>
       <button type="button" id="view-quizzes">View Quizzes</button>
    `;

    document
      .getElementById("quiz-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("quiz-title").value;
        const quiz = await apiCall("/quizzes", "POST", { title });
        state.currentQuiz = quiz;

        renderQuestionCreation();
      });

    document
      .getElementById("view-quizzes")
      .addEventListener("click", renderQuizList);
  }

/*-------------------Question Creation-------------------------*/

  function renderQuestionCreation() {
    app.innerHTML = `
      <h2>Add Questions to ${state.currentQuiz.title}</h2>
       <form id="question-form">
        <input type="text" id="question-text" placeholder="Question" required>
        <input type="text" id="correct-answer" placeholder="correct-answer" required>
        <button type="submit">Add Questions</button>
       </form>
       <button id="finish-quiz">Finish Quiz</button>
    `;

    document
      .getElementById("question-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const questionText = document.getElementById("question-text").value;
        const correctAnswer = document.getElementById("correct-answer").value;
        const question = await apiCall(
          `/quizzes/${state.currentQuiz._id}/questions`,
          'POST',
          { questionText, correctAnswer }
        );
        state.currentQuiz.questions.push(question);
        document.getElementById("question-form").reset();
      });

      document.getElementById('finish-quiz').addEventListener('click', renderQuizList);
  }

/*-------------------Quiz List-------------------------*/

  async function renderQuizList(){
    state.quizzes = await apiCall('/quizzes');
    app.innerHTML = `
     <h2>Quizzes</h2>
       <ul id="quiz-list">
           ${state.quizzes.map((quiz, index)=>`
            <li>
            <button onclick="startQuiz(${index})">${quiz.title}</button>
             ${quiz.createdBy === state.user._id ? `<button onclick="deleteQuiz('${quiz._id}')">Delete</button>` : ''}
            </li>`).join('')}
       </ul>
       <button id="create-new-quiz">Create New Quiz</button>
    `;
    document.getElementById('create-new-quiz').addEventListener('click', renderQuizCreation);
  }

/*-------------------start Creation-------------------------*/

  window.startQuiz = async function(index) {
    state.currentQuiz = state.quizzes[index];
    state.currentQuestionIndex = 0;
    state.score = 0;
    renderQuestion();
}

/*-------------------Delete Creation-------------------------*/

window.deleteQuiz = async function (quizId) {
  const response = await fetch(`http://localhost:3000/quizzes/${quizId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`,
    },
  });

  if (response.ok) {
    alert('Quiz deleted successfully');
    renderQuizList();
  } else {
    const error = await response.json();
    alert(`Error: ${error.message}`);
  }
}

/*-------------------Render Question-------------------------*/

function renderQuestion() {
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    app.innerHTML = `
        <h2>${state.currentQuiz.title}</h2>
        <p>${question.questionText}</p>
        <form id="answer-form">
            <input type="text" id="answer" placeholder="Your Answer" required>
            <button type="submit">Submit Answer</button>
        </form>
    `;

    document.getElementById('answer-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const answer = document.getElementById('answer').value.trim().toLowerCase();

        const correctAnswer = question.correctAnswer.trim().toLowerCase();

        if (answer === correctAnswer) {
            state.score++;
        }

        console.log(`Current score: ${state.score}`);
        state.answers[state.currentQuestionIndex] = answer;
        state.currentQuestionIndex++;

        if (state.currentQuestionIndex < state.currentQuiz.questions.length) {
            renderQuestion();
        } else {
            const result = await apiCall(`/quizzes/${state.currentQuiz._id}/attempt`, 'POST', {  answers: state.answers
              /*state.currentQuiz.questions.map((q, i) => {
              const inputElement = document.getElementById(`answer-${i}`);
              return inputElement ? inputElement.value.trim().toLowerCase() : '';
            })*/
          });
          console.log(`Quiz result: ${JSON.stringify(result)}`);
            renderQuizResult(result);
        }
    });
}

/*-------------------Quiz Result-------------------------*/

function renderQuizResult(result){
    app.innerHTML=`
       <h2>${state.currentQuiz.title} - Results</h2>
       <p>Your score: ${result.score}/${result.total}</p>
       <button id="back-to-quizzes">Back to Quizzes</button>
    `;

    document.getElementById('back-to-quizzes').addEventListener('click', renderQuizList);
}
});
