import { useState, useRef, useEffect } from "react";
import "./App.css";
import quotesData from "./quotes.json";
import knightLogo from "./assets/icon.png";

function App() {
  const [targetText, setTargetText] = useState(
    quotesData[Math.floor(Math.random() * quotesData.length)].text
  );
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(null);
  const [finished, setFinished] = useState(false);

  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const charsRef = useRef([]);

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
  }, [input, targetText]);

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

  if (finished) {
    return (
      <div>
        <header className="header">
          <div className="header-content">
            <img src={knightLogo} alt="Knight Logo" className="logo" />
            <h1>Sir Type-A-Lot</h1>
          </div>
        </header>
        <div className="result-screen">
          <h1>Test Complete!</h1>
          <p className="result-label">wpm</p>
          <p className="result-value">{wpm}</p>
          <button onClick={handleReset} className="reset-button">↺</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <img src={knightLogo} alt="Knight Logo" className="logo" />
          <h1>Sir Type-A-Lot</h1>
        </div>
      </header>
      <div className="test" onClick={() => inputRef.current?.focus()}>
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
        />
      </div>
    </div>
  );
}

export default App;