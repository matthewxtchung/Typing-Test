import { useState, useRef, useEffect, useMemo } from "react";
import "./App.css";
import quotesData from "./quotes.json";
import { generateWords } from "./words";
import { buildLines } from "./measureText";
import knightLogo from "./assets/icon.png";
import AuthModal from "./AuthModal";
import Dashboard from "./Dashboard";
import Leaderboard from "./Leaderboard";
import { supabase } from "./supabaseClient";

const RANKED_TIME = 15;
const CONTAINER_WIDTH = 1400;
const FONT = '32px "Source Code Pro", monospace';

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
  const [lines, setLines] = useState([]);

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

  useEffect(() => {
    if (!mounted) return;
    setLines(buildLines(words, CONTAINER_WIDTH, FONT));
  }, [targetText, mounted]);

  const currentWordIndex = useMemo(() => {
    let charIndex = 0;
    for (let i = 0; i < words.length; i++) {
      charIndex += words[i].length + 1;
      if (charIndex > input.length) return i;
    }
    return words.length - 1;
  }, [input, words]);

  const currentLine = useMemo(() => {
    if (!lines.length) return 0;
    let wordCount = 0;
    for (let li = 0; li < lines.length; li++) {
      wordCount += lines[li].length;
      if (currentWordIndex < wordCount) return li;
    }
    return lines.length - 1;
  }, [currentWordIndex, lines]);

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

  const resetState = () => {
    clearInterval(timerRef.current);
    setInput("");
    startTimeRef.current = null;
    setStarted(false);
    setWpm(null);
    setFinished(false);
    setTimeLeft(RANKED_TIME);
    charsRef.current = [];
  };

  const handleReset = () => {
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
      for (const word of lines[li]) {
        offset += word.length + 1;
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
      const isLastWord = li === visibleLines.length - 1 && wi === lineWords.length - 1;
      const spaceEl = !isLastWord ? (
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
      <div key={`${visibleLineStart}-${li}`} style={{ whiteSpace: "nowrap" }}>
        {renderedWords}
      </div>
    );
  });

  const anyOverlay = showDashboard || showLeaderboard;

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
          style={{ position: "relative", transform: "none", top: "auto", left: "auto" }}
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