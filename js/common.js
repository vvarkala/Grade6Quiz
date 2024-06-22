const timerElement = document.getElementById("time");
let statusElement = document.getElementById("loadingdiv");
// statusElement.style.display = 'block';

const webAppUrl =
  "https://script.google.com/macros/s/AKfycbzPRA5GdEflrbeNT4UaaSwt5ozhk9Ea8hIYPXtym_kOm2PMG5HoIaipmH1MxOgIC7iUPw/exec";

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
});

function checkSession() {
  const username = getCookie("username");
  if (!username) {
    window.location.href = "https://vvarkala.github.io/Grade6Quiz/";
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
  const timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitQuiz();
    } else {
      timeLeft--;
      let minutes = Math.floor(timeLeft / 60);
      let seconds = timeLeft % 60;
      document.getElementById("time").textContent = `${minutes}:${
        seconds < 10 ? "0" : ""
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

  // Validate multiple-choice questions

  const multipleChoiceAnswers = Object.entries(correctAnswers)
    .filter(([key, value]) => value.type === "multiplechoice")
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  // console.log(multipleChoiceAnswers);
  for (const key in multipleChoiceAnswers) {
    if (multipleChoiceAnswers.hasOwnProperty(key)) {
      if (!document.querySelector(`input[name="${key}"]:checked`)) {
        document.getElementById(`${key}-error`).textContent =
          "This question is required.";
        isValid = false;
      }
      // console.log(`Question ID: ${key}, Answer: ${multipleChoiceAnswers[key].answer}`);
    }
  }

  const textAnswers = Object.entries(correctAnswers)
    .filter(([key, value]) => value.type === "text")
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  // Validate write-up questions with word count

  for (const key in textAnswers) {
    if (textAnswers.hasOwnProperty(key)) {
    //   console.log("key", key);
      const text = document.getElementById(key).value.trim();
      const wordCount = text
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      if (wordCount < textAnswers[key].minWords) {
        document.getElementById(
          `${key}-error`
        ).textContent = `This question requires a minimum of ${textAnswers[key].minWords} words.`;
        isValid = false;
      }
      // console.log(`Question ID: ${key}, Answer: ${multipleChoiceAnswers[key].answer}`);
    }
  }
  return isValid;
}

async function analyzeResponse(sentences, qElem) {
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

  document.getElementById(qElem).innerHTML = recommendations;
  return score.toFixed(2) * 0.01;
//   document.getElementById("loadingdiv").style.display = "none";

  // responseCell.textContent = response;
  // similarityCell.textContent = similarity[0].toFixed(4);
  // scoreCell.textContent = score.toFixed(2);
  // recommendationsCell.textContent = recommendations.trim();

  // Hide processing message
  // statusElement.textContent = '';
}


// function analyzeResponse(sentences, qElem) {
//     console.log("analyzeResponse", sentences, qElem);
//     document.getElementById("loadingdiv").style.display = "block";

//     // Load the Universal Sentence Encoder model
//     return use.load().then(model => {
//       return model.embed(sentences).then(embeddings => {
//         // Calculate cosine similarity
//         const passageEmbedding = embeddings.slice([0, 0], [1]);
//         const responseEmbedding = embeddings.slice([1, 0], [1]);
//         const similarity = tf.losses
//           .cosineDistance(passageEmbedding, responseEmbedding, 1)
//           .dataSync();
//         const score = (1 - similarity[0]) * 100;

//         // Generate dynamic recommendations based on the score and content analysis
//         let recommendations = "Score:" + score.toFixed(2) + "<br />";

//         if (score >= 80) {
//           recommendations += "Great job! Your response is very similar to the passage. ";
//           document.getElementById(qElem).classList.add("correct");
//         } else if (score >= 60) {
//           recommendations += "Good effort! Try to include more key points from the passage. ";
//           document.getElementById(qElem).classList.add("improve");
//         } else {
//           recommendations += "Needs improvement. Focus on capturing the main ideas and details from the passage. ";
//         }

//         document.getElementById(qElem).innerHTML = recommendations;
//         // document.getElementById("loadingdiv").style.display = "none";

//         return score*0.01;
//       });
//     });
//   }

async function postScore(score) {
    let studentName = getCookie("username");

    let data = {
        username: studentName,
        quizname: quizname,
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
        }
    } catch (error) {
        console.error('Error:', error);
    }

    document.getElementById("loadingdiv").style.display = "none";
}


async function submitQuiz() {
  if (!validateForm()) {
    return;
  }


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

  const multipleChoiceAnswers = Object.entries(correctAnswers)
    .filter(([key, value]) => value.type === "multiplechoice")
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  // console.log(multipleChoiceAnswers);
  for (const key in multipleChoiceAnswers) {
    if (multipleChoiceAnswers.hasOwnProperty(key)) {
      const selectedAnswer = form[key].value;
      if (selectedAnswer === multipleChoiceAnswers[key].answer) {
        score++;
        document.getElementById(`${key}-feedback`).textContent = `Correct!`;
        document.getElementById(`${key}-feedback`).classList.add("correct");
      } else {
        document.getElementById(
          `${key}-feedback`
        ).textContent = `Incorrect. The correct answer is ${multipleChoiceAnswers[key].answer}.`;
        document.getElementById(`${key}-feedback`).classList.remove("correct");
      }
    }
  }

  // Analyze write-up answers
  const textAnswers = Object.entries(correctAnswers)
    .filter(([key, value]) => value.type === "text")
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  // Validate write-up questions with word count
  for (const key in textAnswers) {
    if (textAnswers.hasOwnProperty(key)) {
      const text = document.getElementById(key).value.trim();
      textScore = (await analyzeResponse([textAnswers[key].answer, text], key + "-feedback"));
      console.log("textScore", key, textScore)
      score = score + textScore;
      // document.getElementById(key +'-feedback').textContent = scoreRecommendations;
      // console.log(`Question ID: ${key}, Answer: ${multipleChoiceAnswers[key].answer}`);
    }
  }

  postScore(score + "/"  + Object.keys(correctAnswers).length);
  // document.getElementById("loadingdiv").style.display = "none";
}

// const writeUpAnswers = [form.q6.value.toLowerCase(), form.q7.value.toLowerCase()];
// const writeUpFeedback = analyzeWriteUpAnswers(writeUpAnswers);

// const keyPhrases = [
//     ["inspired", "writing", "Elias", "journal", "stories", "publisher", "author"],
//     ["persistence", "passion", "creativity", "writing", "inspiration"]
// ];

// let writeUpScores = [0, 0];
// writeUpAnswers.forEach((answer, index) => {
//     let matchCount = 0;
//     keyPhrases[index].forEach(phrase => {
//         if (answer.includes(phrase)) matchCount++;
//     });
//     writeUpScores[index] = matchCount;

//     if (index === 0 && matchCount < 3) {
//         document.getElementById('q6-feedback').textContent = `Your summary needs more details. Include more key points like ${keyPhrases[0].join(", ")}.`;
//     }
//     if (index === 1 && matchCount < 2) {
//         document.getElementById('q7-feedback').textContent = `Your lesson explanation needs more details. Include points like ${keyPhrases[1].join(", ")}.`;
//     }
// });

// score += writeUpScores[0] >= 3 ? 1 : 0; // Check if at least 3 key phrases are included in the summary
// score += writeUpScores[1] >= 2 ? 1 : 0; // Check if at least 2 key phrases are included in the lesson

// // Display score and feedback
// const scoreElement = document.createElement('div');
// scoreElement.innerHTML = `<h3>Your Score: ${score}/7</h3>`;
// form.appendChild(scoreElement);

// const detailedFeedbackElement = document.createElement('div');
// detailedFeedbackElement.innerHTML = `
//     <h4>Detailed Analysis:</h4>
//     <p><strong>Summary Analysis:</strong> ${writeUpFeedback[0]}</p>
//     <p><strong>Lesson Analysis:</strong> ${writeUpFeedback[1]}</p>
// `;
// form.appendChild(detailedFeedbackElement);

// window.scrollTo(0, document.body.scrollHeight);
