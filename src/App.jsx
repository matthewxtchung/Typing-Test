import { useState, useRef, useEffect } from "react";
import "./App.css";
import quotesData from "./quotes.json";
import { generateWords } from "./words";
import knightLogo from "./assets/icon.png";
import AuthModal from "./AuthModal";
import Dashboard from "./Dashboard";
import Leaderboard from "./Leaderboard";
import { supabase } from "./supabaseClient";

const RANKED_TIME = 15;

function App() {
  const [mode, setMode] = useState("normal");
  const [targetText, setTargetText] = useState(
    quotesData[Math.floor(Math.random() * quotesData.length)].text
  );
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [wpm, setWpm] = useState(null);
  const [finished, setFinished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [timeLeft, setTimeLeft] = useState(RANKED_TIME);
  const [lineOffset, setLineOffset] = useState(0);

  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const charsRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const wordRefs = useRef([]);
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

  // caret positioning
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
  }, [input, targetText, mounted, lineOffset]);

  // line shifting: watch which line the current word is on
  useEffect(() => {
    if (!testRef.current) return;
    const words = targetText.split(" ");
    let charIndex = 0;
    for (let i = 0; i < words.length; i++) {
      const wordStart = charIndex;
      const wordEnd = charIndex + words[i].length;
      if (input.length >= wordStart && input.length <= wordEnd + 1) {
        // current word is word i
        const wordEl = wordRefs.current[i];
        if (!wordEl || !testRef.current) break;
        const testRect = testRef.current.getBoundingClientRect();
        const wordRect = wordEl.getBoundingClientRect();
        const relativeTop = wordRect.top - testRect.top + lineOffset;
        const lineHeight = wordRect.height;
        // if current word has moved past the first line, shift down
        if (relativeTop > lineHeight * 0.5) {
          setLineOffset((prev) => prev - lineHeight);
        }
        break;
      }
      charIndex += words[i].length + 1;
    }
  }, [input]);

  const finishTest = (typedValue) => {
    clearInterval(timerRef.current);
    const endTime = Date.now();
    const startTime = startTimeRef.current;
    if (!startTime) return;
    const timeTakenMinutes = (endTime - startTime) / 1000 / 60;
    const targetWords = targetText.split(" ");
    const typedWords = typedValue.split(" ");
    let correctChars = 0;
    for (let i = 0; i < targetWords.length; i++) {
      if (typedWords[i] === targetWords[i]) {
        correctChars += targetWords[i].length;
        if (i < targetWords.length - 1) correctChars += 1;
      }
    }
    const wordsTyped = correctChars / 5;
    const wpmCalc = timeTakenMinutes > 0 ? Math.round(wordsTyped / timeTakenMinutes) : 0;
    setWpm(wpmCalc);
    setFinished(true);
    if (user) {
      supabase.from("results").insert({ user_id: user.id, wpm: wpmCalc }).then(({ error }) => {
        console.log("insert result:", error ?? "success");
      });
    }
  };

  const finishRanked = () => {
    clearInterval(timerRef.current);
    const endTime = Date.now();
    const startTime = startTimeRef.current;
    if (!startTime) return;
    const timeTakenMinutes = (endTime - startTime) / 1000 / 60;
    const currentInput = inputRef.current?.value ?? "";
    const targetWords = targetText.split(" ");
    const typedWords = currentInput.split(" ");
    let correctChars = 0;
    for (let i = 0; i < typedWords.length; i++) {
      if (typedWords[i] === targetWords[i]) {
        correctChars += targetWords[i].length;
        if (i < typedWords.length - 1) correctChars += 1;
      }
    }
    const wordsTyped = correctChars / 5;
    const wpmCalc = timeTakenMinutes > 0 ? Math.round(wordsTyped / timeTakenMinutes) : 0;
    setWpm(wpmCalc);
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

    if (mode === "normal" && value.length === targetText.length) {
      finishTest(value);
    }
  };

  const handleReset = () => {
    clearInterval(timerRef.current);
    setInput("");
    startTimeRef.current = null;
    setStarted(false);
    setWpm(null);
    setFinished(false);
    setTimeLeft(RANKED_TIME);
    setLineOffset(0);
    charsRef.current = [];
    wordRefs.current = [];
    if (mode === "normal") {
      setTargetText(quotesData[Math.floor(Math.random() * quotesData.length)].text);
    } else {
      setTargetText(generateWords(120));
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    clearInterval(timerRef.current);
    setMode(newMode);
    setInput("");
    startTimeRef.current = null;
    setStarted(false);
    setWpm(null);
    setFinished(false);
    setTimeLeft(RANKED_TIME);
    setLineOffset(0);
    charsRef.current = [];
    wordRefs.current = [];
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

  // build rendered chars with word refs for line tracking
  const words = targetText.split(" ");
  let charIndex = 0;
  const renderedWords = words.map((word, wi) => {
    const chars = word.split("").map((char, ci) => {
      const globalIndex = charIndex + ci;
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

    // space after word
    const spaceIndex = charIndex + word.length;
    let spaceClass = "";
    if (spaceIndex < input.length) {
      spaceClass = input[spaceIndex] === " " ? "correct" : "incorrect";
    }
    const spaceEl = wi < words.length - 1 ? (
      <span
        key={spaceIndex}
        className={spaceClass}
        ref={(el) => (charsRef.current[spaceIndex] = el)}
      >
        {" "}
      </span>
    ) : null;

    const wordEl = (
      <span key={wi} ref={(el) => (wordRefs.current[wi] = el)} style={{ display: "inline" }}>
        {chars}{spaceEl}
      </span>
    );

    charIndex += word.length + 1;
    return wordEl;
  });

  const anyOverlay = showDashboard || showLeaderboard;
  const LINE_HEIGHT_EM = 1.5;
  const VISIBLE_LINES = 3;
  const FONT_SIZE_PX = 32;
  const containerHeight = LINE_HEIGHT_EM * VISIBLE_LINES * FONT_SIZE_PX;

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

      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
        {mode === "ranked" && started && !finished && (
          <p className="ranked-timer">{timeLeft}</p>
        )}
        <div
          className={`test fade ${!pageLoaded || finished || anyOverlay ? "fade-hidden" : ""}`}
          style={{
            position: "relative",
            transform: "none",
            top: "auto",
            left: "auto",
            height: `${containerHeight}px`,
            overflow: "hidden",
          }}
          ref={testRef}
          onClick={() => inputRef.current?.focus()}
        >
          <div
            style={{
              position: "relative",
              top: `${lineOffset}px`,
              transition: "top 0.15s ease",
              lineHeight: `${LINE_HEIGHT_EM}em`,
            }}
          >
            <p style={{ position: "relative", margin: 0 }}>
              {renderedWords}
            </p>
          </div>
          <span ref={caretRef} className={`caret ${started ? "caret-active" : ""}`} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            className="typing-input"
            autoFocus
            onBlur={(e) => {
              if (!showAuth && !anyOverlay && e.relatedTarget?.className !== "user-button") inputRef.current?.focus();
            }}
          />
        </div>
        {mode === "normal" && (
          <div className={`fade ${!pageLoaded || finished || anyOverlay ? "fade-hidden" : ""}`}>
            <button className="user-button" onClick={handleReset}>reset</button>
          </div>
        )}
      </div>

      <div className={`result-screen fade ${!finished || anyOverlay ? "fade-hidden" : ""}`}>
        <h1>Test Complete!</h1>
        <p className="result-label">wpm</p>
        <p className="result-value">{wpm}</p>
        <button onClick={handleReset} className="user-button">reset</button>
      </div>

      <div className={`fade ${!showDashboard ? "fade-hidden" : ""}`}>
        {user && (
          <Dashboard
            user={user}
            username={username}
            onClose={handleCloseDashboard}
            visible={showDashboard}
          />
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