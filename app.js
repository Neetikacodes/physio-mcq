(function () {
  "use strict";

  var bank = window.QUESTION_BANK || [];
  document.getElementById("bank-total").textContent = bank.length;

  var subjects = uniq(bank.map(function (q) { return q.subject; }));
  var difficulties = ["Easy", "Medium", "Hard"];

  var state = {
    subject: "All",
    difficulty: "All",
    count: 20,
    queue: [],
    index: 0,
    score: 0,
    answered: [],   // {q, chosenKey, correct}
    lastSession: null
  };

  // ---------- SETUP SCREEN ----------
  var subjectChipsEl = document.getElementById("subject-chips");
  var diffChipsEl = document.getElementById("difficulty-chips");
  var countSlider = document.getElementById("count-slider");
  var countReadout = document.getElementById("count-readout");
  var availableHint = document.getElementById("available-hint");
  var startBtn = document.getElementById("start-btn");
  var progressRecap = document.getElementById("progress-recap");

  function subjectCount(subj) {
    return bank.filter(function (q) { return subj === "All" || q.subject === subj; }).length;
  }

  function buildSubjectChips() {
    var options = ["All"].concat(subjects);
    subjectChipsEl.innerHTML = "";
    options.forEach(function (s) {
      var btn = document.createElement("button");
      btn.className = "chip" + (s === state.subject ? " active" : "");
      btn.type = "button";
      btn.innerHTML = (s === "All" ? "All subjects" : s) +
        '<span class="chip-count">' + subjectCount(s) + ' questions</span>';
      btn.addEventListener("click", function () {
        state.subject = s;
        buildSubjectChips();
        updateAvailableHint();
      });
      subjectChipsEl.appendChild(btn);
    });
  }

  function buildDiffChips() {
    var options = ["All"].concat(difficulties);
    diffChipsEl.innerHTML = "";
    options.forEach(function (d) {
      var btn = document.createElement("button");
      btn.className = "chip" + (d === state.difficulty ? " active" : "");
      btn.type = "button";
      btn.textContent = d;
      btn.addEventListener("click", function () {
        state.difficulty = d;
        buildDiffChips();
        updateAvailableHint();
      });
      diffChipsEl.appendChild(btn);
    });
  }

  function filteredPool() {
    return bank.filter(function (q) {
      var subjOk = state.subject === "All" || q.subject === state.subject;
      var diffOk = state.difficulty === "All" || q.difficulty === state.difficulty;
      return subjOk && diffOk;
    });
  }

  function updateAvailableHint() {
    var n = filteredPool().length;
    availableHint.textContent = "Available: " + n + " question" + (n === 1 ? "" : "s") +
      " matching this filter";
    startBtn.disabled = n === 0;
  }

  countSlider.addEventListener("input", function () {
    state.count = parseInt(countSlider.value, 10);
    countReadout.textContent = state.count;
  });

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function renderProgressRecap() {
    var raw = localStorage.getItem("physioMcqProgress");
    if (!raw) { progressRecap.textContent = ""; return; }
    try {
      var data = JSON.parse(raw);
      progressRecap.innerHTML = "Last session: <strong>" + data.subject + "</strong> · " +
        data.correct + "/" + data.total + " correct (" + data.pct + "%)";
    } catch (e) { progressRecap.textContent = ""; }
  }

  startBtn.addEventListener("click", function () {
    var pool = shuffle(filteredPool());
    var n = Math.min(state.count, pool.length);
    state.queue = pool.slice(0, n);
    state.index = 0;
    state.score = 0;
    state.answered = [];
    showScreen("quiz");
    renderQuestion();
  });

  // ---------- QUIZ SCREEN ----------
  var quizSubjectTag = document.getElementById("quiz-subject-tag");
  var quizDiffTag = document.getElementById("quiz-diff-tag");
  var liveScore = document.getElementById("live-score");
  var liveAnswered = document.getElementById("live-answered");
  var progressFill = document.getElementById("progress-fill");
  var qIndexEl = document.getElementById("q-index");
  var qTotalEl = document.getElementById("q-total");
  var qIdEl = document.getElementById("q-id");
  var qTextEl = document.getElementById("q-text");
  var optionsList = document.getElementById("options-list");
  var explainPanel = document.getElementById("explain-panel");
  var explainVerdict = document.getElementById("explain-verdict");
  var explainText = document.getElementById("explain-text");
  var nextBtn = document.getElementById("next-btn");
  var nextBtnLabel = document.getElementById("next-btn-label");
  var exitBtn = document.getElementById("exit-btn");

  function renderQuestion() {
    var q = state.queue[state.index];
    quizSubjectTag.textContent = q.subject;
    quizDiffTag.textContent = q.difficulty;
    liveScore.textContent = state.score;
    liveAnswered.textContent = state.answered.length;
    qIndexEl.textContent = state.index + 1;
    qTotalEl.textContent = state.queue.length;
    progressFill.style.width = ((state.index) / state.queue.length * 100) + "%";
    qIdEl.textContent = "Q" + String(q.id).padStart(4, "0") + " · " + q.subject;
    qTextEl.textContent = q.question;

    optionsList.innerHTML = "";
    explainPanel.hidden = true;
    nextBtn.disabled = true;
    nextBtnLabel.textContent = state.index === state.queue.length - 1 ? "Select an answer" : "Select an answer";

    q.options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.innerHTML = '<span class="option-key">' + opt.key + '</span><span class="option-text"></span>';
      btn.querySelector(".option-text").textContent = opt.text;
      btn.addEventListener("click", function () { selectAnswer(q, opt.key, btn); });
      optionsList.appendChild(btn);
    });
  }

  function selectAnswer(q, chosenKey, chosenBtn) {
    var isCorrect = chosenKey === q.correct;
    var allBtns = optionsList.querySelectorAll(".option-btn");
    allBtns.forEach(function (b) { b.disabled = true; });

    allBtns.forEach(function (b) {
      var key = b.querySelector(".option-key").textContent;
      if (key === q.correct) {
        b.classList.add("correct");
      } else if (key === chosenKey) {
        b.classList.add("incorrect");
      } else {
        b.classList.add("dim");
      }
    });

    explainPanel.hidden = false;
    explainPanel.classList.toggle("is-wrong", !isCorrect);
    explainVerdict.textContent = isCorrect ? "Correct" : "Incorrect — correct answer is " + q.correct;
    explainText.textContent = q.explanation;

    if (isCorrect) state.score++;
    state.answered.push({ q: q, chosenKey: chosenKey, correct: isCorrect });
    liveScore.textContent = state.score;
    liveAnswered.textContent = state.answered.length;

    nextBtn.disabled = false;
    nextBtnLabel.textContent = state.index === state.queue.length - 1 ? "See results" : "Next question";
  }

  nextBtn.addEventListener("click", function () {
    if (state.index < state.queue.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      finishSession();
    }
  });

  exitBtn.addEventListener("click", function () {
    if (state.answered.length === 0 || confirm("End this practice session? Your progress on this set will be saved as-is.")) {
      finishSession();
    }
  });

  // ---------- RESULTS SCREEN ----------
  var resultsTitle = document.getElementById("results-title");
  var dialArc = document.getElementById("dial-arc");
  var dialPct = document.getElementById("dial-pct");
  var dialFraction = document.getElementById("dial-fraction");
  var resultsBreakdown = document.getElementById("results-breakdown");
  var reviewBtn = document.getElementById("review-btn");
  var reviewList = document.getElementById("review-list");
  var retryBtn = document.getElementById("retry-btn");

  var ARC_LEN = 267;

  function finishSession() {
    var total = state.answered.length;
    var correct = state.score;
    var pct = total ? Math.round((correct / total) * 100) : 0;

    resultsTitle.textContent = (state.subject === "All" ? "All subjects" : state.subject) +
      (state.difficulty === "All" ? "" : " · " + state.difficulty);

    var offset = ARC_LEN - (ARC_LEN * pct / 100);
    dialArc.style.strokeDashoffset = ARC_LEN;
    dialArc.style.stroke = pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--amber)" : "var(--coral)";
    requestAnimationFrame(function () {
      dialArc.style.strokeDashoffset = offset;
    });
    dialPct.textContent = pct + "%";
    dialFraction.textContent = correct + " / " + total + " correct";

    // breakdown by difficulty
    var byDiff = {};
    state.answered.forEach(function (a) {
      var d = a.q.difficulty;
      byDiff[d] = byDiff[d] || { total: 0, correct: 0 };
      byDiff[d].total++;
      if (a.correct) byDiff[d].correct++;
    });
    resultsBreakdown.innerHTML = "";
    Object.keys(byDiff).forEach(function (d) {
      var row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = '<span class="b-label">' + d + '</span><span class="b-value">' +
        byDiff[d].correct + " / " + byDiff[d].total + "</span>";
      resultsBreakdown.appendChild(row);
    });

    // review list (wrong answers)
    reviewList.innerHTML = "";
    reviewList.hidden = true;
    var wrong = state.answered.filter(function (a) { return !a.correct; });
    if (wrong.length === 0) {
      var msg = document.createElement("p");
      msg.style.fontFamily = "var(--sans)";
      msg.style.fontSize = "13.5px";
      msg.style.color = "var(--ink-soft)";
      msg.textContent = "No incorrect answers this session — nice work.";
      reviewList.appendChild(msg);
    } else {
      wrong.forEach(function (a) {
        var item = document.createElement("div");
        item.className = "review-item";
        var optText = {};
        a.q.options.forEach(function (o) { optText[o.key] = o.text; });
        item.innerHTML =
          '<p class="review-q">' + escapeHtml(a.q.question) + '</p>' +
          '<p class="review-line wrong">Your answer: ' + a.chosenKey + '. ' + escapeHtml(optText[a.chosenKey] || "") + '</p>' +
          '<p class="review-line right">Correct: ' + a.q.correct + '. ' + escapeHtml(optText[a.q.correct] || "") + '</p>' +
          '<p class="review-explain">' + escapeHtml(a.q.explanation) + '</p>';
        reviewList.appendChild(item);
      });
    }

    // persist last-session progress
    try {
      localStorage.setItem("physioMcqProgress", JSON.stringify({
        subject: state.subject === "All" ? "All subjects" : state.subject,
        correct: correct, total: total, pct: pct,
        date: new Date().toISOString()
      }));
    } catch (e) {}

    showScreen("results");
  }

  reviewBtn.addEventListener("click", function () {
    reviewList.hidden = !reviewList.hidden;
    reviewBtn.textContent = reviewList.hidden ? "Review answers" : "Hide review";
  });

  retryBtn.addEventListener("click", function () {
    showScreen("setup");
    renderProgressRecap();
    updateAvailableHint();
  });

  // ---------- SCREEN SWITCHING ----------
  var screens = {
    setup: document.getElementById("setup-screen"),
    quiz: document.getElementById("quiz-screen"),
    results: document.getElementById("results-screen")
  };
  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].hidden = k !== name;
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------- UTIL ----------
  function uniq(arr) {
    return arr.filter(function (v, i) { return arr.indexOf(v) === i; });
  }
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  // ---------- INIT ----------
  buildSubjectChips();
  buildDiffChips();
  updateAvailableHint();
  renderProgressRecap();
})();
