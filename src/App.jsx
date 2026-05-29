import { useState, useRef, useEffect } from "react";
import "./App.css";
import quotesData from "./quotes.json";
import knightLogo from "./assets/icon.png";
import AuthModal from "./AuthModal";
import Dashboard from "./Dashboard";
import { supabase } from "./supabaseClient";

function App() {
  const [targetText, setTargetText] = useState(
    quotesData[Math.floor(Math.random() * quotesData.length)].text
  );
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(null);
  const [finished, setFinished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);

  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const charsRef = useRef([]);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setMounted(true);
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

  useEffect(() => {
    const measure = () => {
      const currentChar = charsRef.current[input.length];
      if (!currentChar || !caretRef.current) return;

      const charRect = currentChar.getBoundingClientRect();
      const testEl = document.querySelector(".test");
      const testRect = testEl.getBoundingClientRect();

      caretRef.current.style.left = `${charRect.left - testRect.left}px`;
      caretRef.current.style.top = `${charRect.top - testRect.top}px`;
    };

    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [input, targetText, mounted]);

  const handleChange = (e) => {
    const value = e.target.value;
    if (!startTime && value.length === 1) setStartTime(Date.now());
    setInput(value);

    if (value.length === targetText.length) {
      const endTime = Date.now();
      const timeTakenMinutes = (endTime - startTime) / 1000 / 60;
      const targetWords = targetText.split(" ");
      const typedWords = value.split(" ");
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
    }
  };

  const handleReset = () => {
    setInput("");
    setStartTime(null);
    setWpm(null);
    setFinished(false);
    charsRef.current = [];
    setTargetText(quotesData[Math.floor(Math.random() * quotesData.length)].text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCloseDashboard = () => {
    setShowDashboard(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const renderedText = targetText.split("").map((char, i) => {
    let colorClass = "";
    if (i < input.length) {
      colorClass = input[i] === char ? "correct" : "incorrect";
    }
    return (
      <span key={i} className={colorClass} ref={(el) => (charsRef.current[i] = el)}>
        {char}
      </span>
    );
  });

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <img src={knightLogo} alt="Knight Logo" className="logo" />
          <h1>Sir Types-A-Lot</h1>
          <div className="header-right">
            {user ? (
              <div className="user-info">
                <button className="user-button" onClick={() => setShowDashboard(true)}>
                  {username ?? user.email}
                </button>
                <button className="user-button" onClick={handleSignOut}>logout</button>
              </div>
            ) : (
              <button className="user-button" onClick={() => setShowAuth(true)}>login</button>
            )}
          </div>
        </div>
      </header>

      <div className={`test fade ${finished || showDashboard ? "fade-hidden" : ""}`} onClick={() => inputRef.current?.focus()}>
        <p style={{ position: "relative" }}>
          {renderedText}
        </p>
        <span ref={caretRef} className={`caret ${startTime ? "caret-active" : ""}`} />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          className="typing-input"
          autoFocus
          onBlur={() => {
            if (!showAuth && !showDashboard) inputRef.current?.focus();
          }}
        />
      </div>
      <div className={`fade ${finished || showDashboard ? "fade-hidden" : ""}`} style={{ textAlign: "center", marginTop: "1rem" }}>
        <button className="user-button" onClick={handleReset}>reset</button>
      </div>

      <div className={`result-screen fade ${!finished || showDashboard ? "fade-hidden" : ""}`}>
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