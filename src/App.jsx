import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";
import quotesData from "./quotes.json";
import { generateWords } from "./words";
import knightLogo from "./assets/icon.png";
import AuthModal from "./AuthModal";
import Dashboard from "./Dashboard";
import Leaderboard from "./Leaderboard";
import { supabase } from "./supabaseClient";

const RANKED_TIME = 15;
const WORDS_PER_LINE = 10;

function App() {
  const [mode, setMode] = useState("normal");
  const [targetText, setTargetText] = useState(
    quotesData[Math.floor(Math.random() * quotesData.length)].text
  );
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [wpm, setWpm] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [errors, setErrors] = useState(null);
  const [finished, setFinished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [timeLeft, setTimeLeft] = useState(RANKED_TIME);
  const [lineStart, setLineStart] = useState(0);

  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const charsRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const testRef = useRef(null);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setMounted(true);
      setTimeout(() => setPageLoaded(true), 50);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUsername(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUsername(session.user.id);
      else setUsername(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUsername = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (data) setUsername(data.username);
  };

  const words = useMemo(() => targetText.split(" "), [targetText]);
  const lines = useMemo(() => {
    const result = [];
    for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
      result.push(words.slice(i, i + WORDS_PER_LINE));
    }
    return result;
  }, [words]);

  const currentWordIndex = useMemo(() => {
    let charIndex = 0;
    for (let i = 0; i < words.length; i++) {
      charIndex += words[i].length + 1;
      if (charIndex > input.length) return i;
    }
    return words.length - 1;
  }, [input, words]);

  const currentLine = Math.floor(currentWordIndex / WORDS_PER_LINE);
  const visibleLineStart = Math.max(0, currentLine - 1);

  useEffect(() => {
    const measure = () => {
      const currentChar = charsRef.current[input.length];
      if (!currentChar || !caretRef.current || !testRef.current) return;
      const charRect = currentChar.getBoundingClientRect();
      const testRect = testRef.current.getBoundingClientRect();
      caretRef.current.style.left = `${charRect.left - testRect.left}px`;
      caretRef.current.style.top = `${charRect.top - testRect.top}px`;
    };
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [input, targetText, mounted, visibleLineStart]);

  const computeStats = (typedValue, targetStr) => {
    const correct = typedValue.split("").filter((c, i) => c === targetStr[i]).length;
    const errCount = typedValue.length - correct;
    const accCalc = typedValue.length > 0 ? Math.round((correct / typedValue.length) * 100) : 0;
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 / 60 : 0;
    const wpmCalc = elapsed > 0 ? Math.round((correct / 5) / elapsed) : 0;
    return { wpmCalc, accCalc, errCount };
  };

  const finishTest = (typedValue) => {
    clearInterval(timerRef.current);
    const { wpmCalc, accCalc, errCount } = computeStats(typedValue, targetText);
    setWpm(wpmCalc);
    setAccuracy(accCalc);
    setErrors(errCount);
    setFinished(true);
    if (user) {
      supabase.from("results").insert({ user_id: user.id, wpm: wpmCalc }).then(({ error }) => {
        console.log("insert result:", error ?? "success");
      });
    }
  };

  const finishRanked = () => {
    clearInterval(timerRef.current);
    const currentInput = inputRef.current?.value ?? "";
    const { wpmCalc, accCalc, errCount } = computeStats(currentInput, targetText);
    setWpm(wpmCalc);
    setAccuracy(accCalc);
    setErrors(errCount);
    setFinished(true);
    if (user) {
      supabase.from("results").insert({ user_id: user.id, wpm: wpmCalc }).then(({ error }) => {
        console.log("insert result:", error ?? "success");
      });
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (!started && value.length === 1) {
      setStarted(true);
      startTimeRef.current = Date.now();
      if (mode === "ranked") {
        setTimeLeft(RANKED_TIME);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              finishRanked();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    setInput(value);

    // live stats
    if (startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
      const correct = value.split("").filter((c, i) => c === targetText[i]).length;
      if (elapsed > 0) setWpm(Math.round((correct / 5) / elapsed));
      if (value.length > 0) setAccuracy(Math.round((correct / value.length) * 100));
    }

    if (mode === "normal" && value.length === targetText.length) {
      finishTest(value);
    }
  };

  const resetState = () => {
    clearInterval(timerRef.current);
    setInput("");
    startTimeRef.current = null;
    setStarted(false);
    setWpm(null);
    setAccuracy(null);
    setErrors(null);
    setFinished(false);
    setTimeLeft(RANKED_TIME);
    setLineStart(0);
    charsRef.current = [];
  };

  const handleNext = () => {
    resetState();
    if (mode === "normal") {
      setTargetText(quotesData[Math.floor(Math.random() * quotesData.length)].text);
    } else {
      setTargetText(generateWords(120));
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    resetState();
    setMode(newMode);
    if (newMode === "normal") {
      setTargetText(quotesData[Math.floor(Math.random() * quotesData.length)].text);
    } else {
      setTargetText(generateWords(120));
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCloseDashboard = () => {
    setShowDashboard(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const visibleLines = lines.slice(visibleLineStart, visibleLineStart + 3);

  const charOffset = useMemo(() => {
    let offset = 0;
    for (let li = 0; li < visibleLineStart; li++) {
      for (let wi = 0; wi < lines[li].length; wi++) {
        offset += lines[li][wi].length + 1;
      }
    }
    return offset;
  }, [visibleLineStart, lines]);

  let localCharIndex = charOffset;
  const renderedLines = visibleLines.map((lineWords, li) => {
    const renderedWords = lineWords.map((word, wi) => {
      const chars = word.split("").map((char, ci) => {
        const globalIndex = localCharIndex + ci;
        let colorClass = "";
        if (globalIndex < input.length) {
          colorClass = input[globalIndex] === char ? "correct" : "incorrect";
        }
        return (
          <span
            key={globalIndex}
            className={colorClass}
            ref={(el) => (charsRef.current[globalIndex] = el)}
          >
            {char}
          </span>
        );
      });

      const spaceIndex = localCharIndex + word.length;
      const isLastWordInLastLine = li === visibleLines.length - 1 && wi === lineWords.length - 1;
      const spaceEl = !isLastWordInLastLine ? (
        <span
          key={spaceIndex}
          className={spaceIndex < input.length ? (input[spaceIndex] === " " ? "correct" : "incorrect") : ""}
          ref={(el) => (charsRef.current[spaceIndex] = el)}
        >
          {" "}
        </span>
      ) : null;

      localCharIndex += word.length + 1;

      return (
        <span key={wi} style={{ display: "inline" }}>
          {chars}{spaceEl}
        </span>
      );
    });

    return (
      <div key={li} style={{ whiteSpace: "nowrap" }}>
        {renderedWords}
      </div>
    );
  });

  const anyOverlay = showDashboard || showLeaderboard;
  const testVisible = pageLoaded && !finished && !anyOverlay;

  return (
    <div>
      <header className={`header fade ${pageLoaded ? "" : "fade-hidden"}`}>
        <div className="header-content">
          <img src={knightLogo} alt="Knight Logo" className="logo" />
          <h1>Sir Types-A-Lot</h1>
          <div className="header-center">
            <button
              className={`mode-button ${mode === "normal" ? "mode-button-active" : ""}`}
              onClick={() => handleModeSwitch("normal")}
            >
              normal
            </button>
            <span className="mode-divider">|</span>
            <button
              className={`mode-button ${mode === "ranked" ? "mode-button-active" : ""}`}
              onClick={() => handleModeSwitch("ranked")}
            >
              ranked
            </button>
          </div>
          <div className="header-right">
            <div className="user-info">
              <button className="user-button" onClick={() => setShowLeaderboard(true)}>leaderboard</button>
              {user ? (
                <>
                  <button className="user-button" onClick={() => setShowDashboard(true)}>
                    {username ?? user.email}
                  </button>
                  <button className="user-button" onClick={handleSignOut}>logout</button>
                </>
              ) : (
                <button className="user-button" onClick={() => setShowAuth(true)}>login</button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Fixed-height center column — stats, text, reset never shift */}
      <div className={`center-column fade ${!pageLoaded || anyOverlay ? "fade-hidden" : ""}`}>

        {/* Ranked timer row — always occupies space, only shows content when active */}
        <div className="ranked-timer-row">
          {mode === "ranked" && started && !finished && (
            <p className="ranked-timer">{timeLeft}</p>
          )}
        </div>

        {/* Stats bar — always occupies space */}
        <div className={`stats-bar fade ${finished ? "fade-hidden" : ""}`}>
          <div className="stat-item">
            <span className="stat-value">{started && wpm != null ? wpm : "—"}</span>
            <span className="stat-label">wpm</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{started && accuracy != null ? accuracy + "%" : "—"}</span>
            <span className="stat-label">acc</span>
          </div>
        </div>

        {/* Typing area */}
        <div
          className={`test fade ${finished ? "fade-hidden" : ""}`}
          ref={testRef}
          onClick={() => inputRef.current?.focus()}
        >
          {renderedLines}
          <span ref={caretRef} className={`caret ${started ? "caret-active" : ""}`} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            className="typing-input"
            autoFocus
            onPaste={(e) => e.preventDefault()}
            onBlur={(e) => {
              if (!showAuth && !anyOverlay && e.relatedTarget?.className !== "user-button") inputRef.current?.focus();
            }}
          />
        </div>

        {/* Reset row — always occupies space, only shows in normal mode before finish */}
        <div className="reset-row">
          {mode === "normal" && !finished && (
            <button className="user-button" onClick={handleNext}>reset</button>
          )}
        </div>

        {/* Result screen — sits in the same column flow, fades in over the same space */}
        <div className={`result-screen fade ${!finished ? "fade-hidden" : ""}`}>
          <p className="result-wpm-label">words per minute</p>
          <p className="result-wpm">{wpm}</p>
          <p className="result-wpm-unit">wpm</p>
          <div className="result-stats-row">
            <div className="result-stat-cell">
              <span className="result-stat-value">{accuracy != null ? accuracy + "%" : "—"}</span>
              <span className="result-stat-label">accuracy</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-value">{input.length}</span>
              <span className="result-stat-label">characters</span>
            </div>
            <div className="result-stat-cell">
              <span className="result-stat-value">{errors != null ? errors : "—"}</span>
              <span className="result-stat-label">errors</span>
            </div>
          </div>
          <button onClick={handleNext} className="btn-next">next quote →</button>
        </div>

      </div>

      <div className={`fade ${!showDashboard ? "fade-hidden" : ""}`}>
        {user && (
          <Dashboard user={user} username={username} onClose={handleCloseDashboard} visible={showDashboard} />
        )}
      </div>

      <div className={`fade ${!showLeaderboard ? "fade-hidden" : ""}`}>
        <Leaderboard onClose={handleCloseLeaderboard} username={username} />
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setTimeout(() => inputRef.current?.focus(), 0); }}
          onAuth={(u) => { setUser(u); fetchUsername(u.id); }}
        />
      )}
    </div>
  );
}

export default App;