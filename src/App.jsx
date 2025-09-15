import { useState, useRef } from "react";
import "./App.css";

function App() {
  const targetText = "This is where the words will be.";
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(null);
  const [finished, setFinished] = useState(false);

  const inputRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;

    if (!startTime && value.length === 1) {
      setStartTime(Date.now());
    }

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
      const wpmCalc =
        timeTakenMinutes > 0 ? Math.round(wordsTyped / timeTakenMinutes) : 0;

      setWpm(wpmCalc);
      setFinished(true);
    }
  };

  const handleReset = () => {
    setInput("");
    setStartTime(null);
    setWpm(null);
    setFinished(false);

    // focus the input box straight away
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const renderedText = targetText.split("").map((char, i) => {
    let color = "";
    if (i < input.length) {
      color = input[i] === char ? "correct" : "incorrect";
    }
    return (
      <span key={i} className={color}>
        {char}
      </span>
    );
  });

  if (finished) {
    return (
      <div className="result-screen">
        <h1>Test Complete!</h1>
        <p>Your WPM: <strong>{wpm}</strong></p>
        <button onClick={handleReset} className="reset-button">
          Reset Test
        </button>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1>typing test</h1>
      </div>
      <div className="test">
        <p>{renderedText}</p>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="Start typing here..."
          className="typing-input"
          autoFocus
        />
      </div>
    </div>
  );
}

export default App;
