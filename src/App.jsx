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
const PLACEMENT_COUNT = 10;
const ABANDON_PENALTY = -150;

// ELO <-> WPM conversion
export const wpmToElo = (wpm) => wpm * 10;
export const eloToWpm = (elo) => elo / 10;

export const RANKS = [
  { name: "Iron",        min: 0,    max: 400,  color: "#6c7086" },
  { name: "Bronze",      min: 400,  max: 600,  color: "#e8a87c" },
  { name: "Silver",      min: 600,  max: 800,  color: "#a6adc8" },
  { name: "Gold",        min: 800,  max: 1000, color: "#f9e2af" },
  { name: "Platinum",    min: 1000, max: 1100, color: "#94e2d5" },
  { name: "Diamond",     min: 1100, max: 1200, color: "#89dceb" },
  { name: "Master",      min: 1200, max: 1400, color: "#cba6f7" },
  { name: "Grandmaster", min: 1400, max: Infinity, color: "#f38ba8" },
];

export const getRank = (elo) => RANKS.find((r) => elo >= r.min && elo < r.max) ?? RANKS[0];

export const calcEloChange = (currentElo, actualWpm) => {
  const expectedWpm = eloToWpm(currentElo);
  const delta = actualWpm - expectedWpm;
  const change = Math.round(delta * 5);
  return Math.max(-150, Math.min(150, change));
};

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
  const [isShifting, setIsShifting] = useState(false);

  // Ranked / ELO state
  const [profileElo, setProfileElo] = useState(0);
  const [placementResults, setPlacementResults] = useState([]);
  const [eloChange, setEloChange] = useState(null);
  const [isPlacement, setIsPlacement] = useState(false);

  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const charsRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const testRef = useRef(null);
  const prevVisibleLineStartRef = useRef(0);
  // Track whether ranked test was started for abandon detection
  const rankedStartedRef = useRef(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setMounted(true);
      setTimeout(() => setPageLoaded(true), 50);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setUsername(null);
        setProfileElo(0);
        setPlacementResults([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Abandon penalty on page unload if ranked test in progress
  useEffect(() => {
    const handleUnload = () => {
      if (rankedStartedRef.current && user) {
        // Use sendBeacon for reliable unload-time request
        const payload = JSON.stringify({
          test_in_progress: false,
          elo: Math.max(0, profileElo + ABANDON_PENALTY),
        });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
          new Blob([payload], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user, profileElo]);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, elo, placement_results, test_in_progress")
      .eq("id", userId)
      .single();
    if (data) {
      setUsername(data.username);
      const placements = data.placement_results ?? [];
      setPlacementResults(placements);
      // Check for abandoned test from last session
      if (data.test_in_progress) {
        const penalisedElo = Math.max(0, (data.elo ?? 0) + ABANDON_PENALTY);
        setProfileElo(penalisedElo);
        await supabase
          .from("profiles")
          .update({ test_in_progress: false, elo: penalisedElo })
          .eq("id", userId);
      } else {
        setProfileElo(data.elo ?? 0);
      }
    }
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
    if (visibleLineStart > prevVisibleLineStartRef.current) {
      setIsShifting(true);
      const t = setTimeout(() => setIsShifting(false), 180);
      prevVisibleLineStartRef.current = visibleLineStart;
      return () => clearTimeout(t);
    }
    prevVisibleLineStartRef.current = visibleLineStart;
  }, [visibleLineStart]);

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
      supabase.from("results").insert({ user_id: user.id, wpm: wpmCalc });
    }
  };

  const finishRanked = async () => {
    clearInterval(timerRef.current);
    rankedStartedRef.current = false;
    const currentInput = inputRef.current?.value ?? "";
    const { wpmCalc, accCalc, errCount } = computeStats(currentInput, targetText);
    setWpm(wpmCalc);
    setAccuracy(accCalc);
    setErrors(errCount);
    setFinished(true);

    if (!user) return;

    const newPlacements = [...placementResults];
    let newElo = profileElo;
    let change = null;

    if (newPlacements.length < PLACEMENT_COUNT) {
      // Still in placement
      newPlacements.push(wpmCalc);
      setPlacementResults(newPlacements);
      setIsPlacement(true);

      if (newPlacements.length === PLACEMENT_COUNT) {
        // Final placement test — compute starting ELO
        const avgWpm = Math.round(newPlacements.reduce((a, b) => a + b, 0) / PLACEMENT_COUNT);
        newElo = wpmToElo(avgWpm);
        setProfileElo(newElo);
        change = null; // No change shown on final placement, just reveal ELO
      }

      await supabase.from("profiles").update({
        placement_results: newPlacements,
        elo: newElo,
        test_in_progress: false,
      }).eq("id", user.id);
    } else {
      // Ranked game — calc ELO delta
      setIsPlacement(false);
      change = calcEloChange(profileElo, wpmCalc);
      newElo = Math.max(0, profileElo + change);
      setEloChange(change);
      setProfileElo(newElo);

      await supabase.from("profiles").update({
        elo: newElo,
        test_in_progress: false,
      }).eq("id", user.id);

      await supabase.from("results").insert({ user_id: user.id, wpm: wpmCalc, elo_change: change });
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (!started && value.length === 1) {
      setStarted(true);
      startTimeRef.current = Date.now();
      if (mode === "ranked") {
        rankedStartedRef.current = true;
        // Mark test in progress in Supabase
        if (user) {
          supabase.from("profiles").update({ test_in_progress: true }).eq("id", user.id);
        }
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

  const applyAbandonPenalty = async () => {
    if (!user || !rankedStartedRef.current) return;
    rankedStartedRef.current = false;
    const penalisedElo = Math.max(0, profileElo + ABANDON_PENALTY);
    setProfileElo(penalisedElo);
    await supabase.from("profiles").update({
      elo: penalisedElo,
      test_in_progress: false,
    }).eq("id", user.id);
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
    setEloChange(null);
    setIsPlacement(false);
    setTimeLeft(RANKED_TIME);
    setLineStart(0);
    setIsShifting(false);
    prevVisibleLineStartRef.current = 0;
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

  const handleModeSwitch = async (newMode) => {
    if (newMode === mode) return;
    // Apply abandon penalty if switching away from a started ranked test
    if (mode === "ranked" && rankedStartedRef.current) {
      await applyAbandonPenalty();
    }
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
  const placementDone = placementResults.length >= PLACEMENT_COUNT;
  const currentRank = placementDone ? getRank(profileElo) : null;
  const placementProgress = Math.min(placementResults.length, PLACEMENT_COUNT);

  return (
    <div>
      {/* Header */}
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

      {/* Stats bar */}
      <div className={`stats-bar fade ${!pageLoaded || anyOverlay || finished ? "fade-hidden" : ""}`}>
        <div className="stat-item">
          <span className="stat-value">{started && wpm != null ? wpm : "—"}</span>
          <span className="stat-label">wpm</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">{started && accuracy != null ? accuracy + "%" : "—"}</span>
          <span className="stat-label">acc</span>
        </div>
        {/* Ranked: show ELO or placement progress */}
        {mode === "ranked" && user && !started && (
          <>
            <div className="stat-divider" />
            <div className="stat-item">
              {placementDone ? (
                <>
                  <span className="stat-value" style={{ color: currentRank.color }}>{profileElo}</span>
                  <span className="stat-label" style={{ color: currentRank.color }}>{currentRank.name}</span>
                </>
              ) : (
                <>
                  <span className="stat-value">{placementProgress}<span style={{ fontSize: "16px", color: "#45475a" }}>/10</span></span>
                  <span className="stat-label">placement</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Center column */}
      <div className={`center-column fade ${!pageLoaded || anyOverlay ? "fade-hidden" : ""} ${mode === "ranked" ? "center-column-ranked" : ""}`}>

        {/* Ranked timer */}
        <div className="ranked-timer-row">
          {mode === "ranked" && started && !finished && (
            <p className="ranked-timer">{timeLeft}</p>
          )}
        </div>

        {/* Typing area */}
        <div
          className={`test fade ${finished ? "fade-hidden" : ""} ${isShifting ? "line-shifting" : ""}`}
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

        {/* Reset row — normal mode only */}
        <div className="reset-row">
          {mode === "normal" && !finished && (
            <button className="user-button" onClick={handleNext}>reset</button>
          )}
        </div>

      </div>

      {/* Result screen */}
      <div className={`result-screen fade ${!finished ? "fade-hidden" : ""}`}>
        {/* Ranked result extras */}
        {mode === "ranked" && user && (
          <div className="result-ranked-header">
            {!placementDone || isPlacement ? (
              <p className="result-placement-label">
                placement {Math.min(placementResults.length, PLACEMENT_COUNT)}/{PLACEMENT_COUNT}
                {placementResults.length >= PLACEMENT_COUNT && (
                  <span style={{ color: currentRank?.color ?? "#cba6f7", marginLeft: 12 }}>
                    → {currentRank?.name} ({profileElo} ELO)
                  </span>
                )}
              </p>
            ) : (
              <div className="result-elo-row">
                <span className="result-rank-badge" style={{ color: currentRank.color }}>{currentRank.name}</span>
                <span className="result-elo-value">{profileElo}</span>
                {eloChange !== null && (
                  <span className={`result-elo-change ${eloChange >= 0 ? "elo-gain" : "elo-loss"}`}>
                    {eloChange >= 0 ? "+" : ""}{eloChange}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <p className="result-wpm-label">words per minute</p>
        <p className="result-wpm">{wpm}</p>
        <p className="result-wpm-unit"></p>
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
        <button onClick={handleNext} className="user-button">
          {mode === "ranked" ? "next →" : "next quote →"}
        </button>
      </div>

      <div className={`fade ${!showDashboard ? "fade-hidden" : ""}`}>
        {user && (
          <Dashboard
            user={user}
            username={username}
            onClose={handleCloseDashboard}
            visible={showDashboard}
            profileElo={profileElo}
            placementResults={placementResults}
          />
        )}
      </div>

      <div className={`fade ${!showLeaderboard ? "fade-hidden" : ""}`}>
        <Leaderboard onClose={handleCloseLeaderboard} username={username} />
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setTimeout(() => inputRef.current?.focus(), 0); }}
          onAuth={(u) => { setUser(u); fetchProfile(u.id); }}
        />
      )}
    </div>
  );
}

export default App;