const timerElement = document.getElementById("time");
let timerInterval = null;
let statusElement = document.getElementById("loadingdiv");
// statusElement.style.display = 'block';

const webAppUrl =
    "https://script.google.com/macros/s/AKfycbzPRA5GdEflrbeNT4UaaSwt5ozhk9Ea8hIYPXtym_kOm2PMG5HoIaipmH1MxOgIC7iUPw/exec";

document.addEventListener("DOMContentLoaded", () => {
    checkSession();
    loadQuiz();
    renderPage();
    startTimer();
});

function loadQuiz() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const quizUrl = params.get('quiz');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', quizUrl, false);
    xhr.send(null);

    if (xhr.status === 200) {
        const jsonData = JSON.parse(xhr.responseText);
        console.log(jsonData);
        window.quizData = jsonData;

        window.choiceQuestions = window.quizData.questions.filter(question => question.type === "choice");
        window.writeupQuestions = window.quizData.questions.filter(question => question.type === "writeup");

    } else {
        console.error('Error fetching the JSON file:', xhr.statusText);
    }
}

function renderPage() {
    document.getElementById('passage-title').innerText = quizData.title;

    quizData.passage.paragraphs.forEach((paragraph, index) => {
        document.getElementById(`passage-p${index + 1}`).innerText = paragraph;
    });

    const questionsContainer = document.getElementById('questions-container');
    quizData.questions.forEach((question) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question');
        questionDiv.id = `${question.id}-container`;
        questionDiv.innerHTML = `
            <h3>${question.text}  ${question.type === 'writeup' ? `(min ${question.minWords} words)`: ''}</h3>
            ${question.options ? question.options.map(option => `
                <div class="multiple-choice">
                    <input type="radio" name="${question.id}" value="${option.value}" required> ${option.value}) ${option.text}<br>
                </div>`).join('') : ''}
            ${question.type === 'writeup' ? `
                <div class="write-up">
                    <textarea name="${question.id}" id="${question.id}" rows="6" required oninput="countWords('${question.id}', ${question.minWords})" style="width:100%;"></textarea>
                    <div class="word-counter" id="${question.id}-word-counter">Word count: 0</div>
                </div>` : ''}
            <div class="feedback" id="${question.id}-feedback"></div>
            <div class="error" id="${question.id}-error"></div>
        `;
        questionsContainer.appendChild(questionDiv);
    });
}

function checkSession() {
    const username = getCookie("username");
    if (!username) {
        // window.location.href = "https://vvarkala.github.io/Grade6Quiz/";
    } else {
        document.getElementById("txtusername").textContent = username;
    }
}

function setCookie(name, value, hours) {
    const d = new Date();
    d.setTime(d.getTime() + hours * 60 * 60 * 1000);
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function startTimer() {
    let timeLeft = quizData.quiz_time;
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // submitQuiz();
        } else {
            timeLeft--;
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            document.getElementById("time").textContent = `${minutes}:${seconds < 10 ? "0" : ""
                }${seconds}`;
        }
    }, 1000);
}

function countWords(questionId, numWords) {
    const text = document.getElementById(questionId).value.trim();
    const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
    document.getElementById(
        `${questionId}-word-counter`
    ).textContent = `Word count: ${wordCount}`;
}

function validateForm() {
    let isValid = true;
    document.querySelectorAll(".error").forEach((error) => {
        error.textContent = "";
    });

    choiceQuestions.forEach((question) => {
        // console.log("question", question);
        if (!document.querySelector(`input[name="${question.id}"]:checked`)) {
            document.getElementById(`${question.id}-error`).textContent = "This question is required.";
            isValid = false;
        }
    });

    writeupQuestions.forEach((question) => {
        const text = document.getElementById(question.id).value.trim();
        const wordCount = text
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
        if (wordCount < question.minWords) {
            document.getElementById(
                `${question.id}-error`
            ).textContent = `This question requires a minimum of ${question.minWords} words.`;
            isValid = false;
        }
    });

    return isValid;
}

async function analyzeResponseusingNLP(sentences, qElem) {
    // Show processing message
    console.log("analyzeResponse", sentences, qElem);

    // statusElement.textContent = 'Processing...';

    // Load the Universal Sentence Encoder model once
    const model = await use.load();
    // The original passage and the student response
    // const passage = 'The original passage.';
    // const sentences = [passage, response];

    // Compute sentence embeddings
    const embeddings = await model.embed(sentences);
    // Calculate cosine similarity
    const passageEmbedding = embeddings.slice([0, 0], [1]);
    const responseEmbedding = embeddings.slice([1, 0], [1]);
    const similarity = tf.losses
        .cosineDistance(passageEmbedding, responseEmbedding, 1)
        .dataSync();
    const score = (1 - similarity[0]) * 100;

    // Generate dynamic recommendations based on the score and content analysis
    let recommendations = "Score:" + score.toFixed(2) + "<br />";

    // Check for length and detail
    // if (response.split(' ').length < 20) {
    //   recommendations += 'Your response is a bit short. Try to provide more details. ';
    // }

    // Check for specific feedback based on score ranges
    if (score >= 80) {
        recommendations +=
            "Great job! Your response is very similar to the passage. ";
        document.getElementById(qElem).classList.add("correct");
    } else if (score >= 60) {
        recommendations +=
            "Good effort! Try to include more key points from the passage. ";
        document.getElementById(qElem).classList.add("improve");
    } else {
        recommendations +=
            "Needs improvement. Focus on capturing the main ideas and details from the passage. ";
    }
    recommendations += "<br/><br/>Below is suggested write-up";
    recommendations += "<br/><strong>" + sentences[0] + "</strong>";

    document.getElementById(qElem).innerHTML = recommendations;
    return score.toFixed(2) * 0.01;
}

function analyzeResponse(userInput, keywords, sampleAnswer, qElem) {
    let words = userInput.toLowerCase().split(' ');
    let normalizedKeywords = keywords.map(keyword => keyword.toLowerCase());
    let score = 0;
    words.forEach(word => {
        if (normalizedKeywords.includes(word)) {
            score++;
        }
    });
    let maxScore = normalizedKeywords.length;
    let normalizedScore = (score / maxScore) * 100;
    score =Math.round(normalizedScore);

    let recommendations = "Score:" + score.toFixed(2) + "<br />";

    // Check for length and detail
    // if (response.split(' ').length < 20) {
    //   recommendations += 'Your response is a bit short. Try to provide more details. ';
    // }

    if (score >= 80) {
        recommendations +=
            "Great job! Your response is very similar to the passage. ";
        document.getElementById(qElem).classList.add("correct");
    } else if (score >= 60) {
        recommendations +=
            "Good effort! Try to include more key points from the passage. ";
        document.getElementById(qElem).classList.add("improve");
    } else {
        recommendations +=
            "Needs improvement. Focus on capturing the main ideas and details from the passage. ";
    }
    recommendations += "<br/><br/>Below is suggested write-up";
    recommendations += "<br/><strong>" + sampleAnswer + "</strong>";

    document.getElementById(qElem).innerHTML = recommendations;
    return score * 0.01;
}

async function postScore(score) {
    let studentName = getCookie("username");

    let data = {
        username: studentName,
        quizname: window.quizData.id,
        score: score,
        date: new Date().toISOString().split('T')[0]
    };

    try {
        let response = await fetch(webAppUrl, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'submitQuiz',
                username: data.username,
                quizname: data.quizname,
                score: data.score,
                date: data.date
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        let result = await response.json();
        if (result.status === 'success') {
            // document.getElementById('result').textContent = `Your score is: ${score}/10`;
            // document.getElementById('result').classList.remove('hidden');
            document.getElementById("loadingdiv").style.display = "none";
            clearInterval(timerInterval);
            document.getElementById("timer").innerHTML = "<h3>Congratulations! Your score is: " + score + ".</h3>"
            // document.getElementById("timer").classList.add("correct");
        }
    } catch (error) {
        document.getElementById("timer").innerHTML = "<h3>ERROR!  " + JSON.stringify(error) + ".</h3>"
        // document.getElementById("timer").classList.add("correct");
        console.error('Error:', error);
    }
}

async function submitQuiz() {
    if (!validateForm()) {
        return;
    }

    document.getElementById("btnsubmitQuiz").style.display = "none";
    document.getElementById("loadingdiv").style.display = "block";
    const form = document.getElementById("quiz-form");
    let score = 0;

    // Clear previous feedback
    document.querySelectorAll(".feedback").forEach((feedback) => {
        feedback.textContent = "";
    });
    document.querySelectorAll(".error").forEach((error) => {
        error.textContent = "";
    });

    writeupQuestions.forEach((question) => {
        const text = document.getElementById(question.id).value.trim();
        textScore = analyzeResponse(text, question.keywords, question.sampleAnswer, question.id + "-feedback");
        //(analyzeResponse([question.answer, text], question.id + "-feedback"));
        // console.log("textScore", key, textScore)
        score = score + textScore;
    });

    choiceQuestions.forEach((question) => {
        const selectedAnswer = form[question.id].value;
        if (selectedAnswer === question.answer) {
            score++;
            document.getElementById(`${question.id}-feedback`).textContent = `Correct!`;
            document.getElementById(`${question.id}-feedback`).classList.add("correct");
        } else {
            document.getElementById(
                `${question.id}-feedback`
            ).textContent = `Incorrect. The correct answer is ${question.answer}.`;
            document.getElementById(`${question.id}-feedback`).classList.remove("correct");
        }
    });

    postScore(score.toFixed(2) + "/" + window.quizData.questions.length);
    // document.getElementById("loadingdiv").style.display = "none";
}
