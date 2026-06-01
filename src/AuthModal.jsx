import { useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import "./AuthModal.css";

function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const mouseDownOnOverlay = useRef(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else { onAuth(data.user); onClose(); }
    } else {
      // Check username availability BEFORE creating the auth account
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing) {
        setError("That username is already taken.");
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({ id: data.user.id, username });

        if (profileError) {
          if (profileError.code === "23505") {
            setError("That username is already taken.");
          } else {
            setError("Something went wrong. Please try again.");
          }
        } else {
          onAuth(data.user);
          onClose();
          if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError("Username can only contain letters, numbers, and underscores.");
            setLoading(false);
            return;
          }
          if (username.length < 3 || username.length > 20) {
            setError("Username must be between 3 and 20 characters.");
            setLoading(false);
            return;
          }

          const { data: existing } = await supabase
        }
      }
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      className="auth-overlay"
      onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnOverlay.current && e.target === e.currentTarget) onClose(); }}
    >
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(null); }}
          >
            login
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(null); }}
          >
            register
          </button>
        </div>

        {mode === "signup" && (
          <input
            className="auth-input"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKey}
          autoFocus={mode === "login"}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKey}
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? "..." : mode === "login" ? "login" : "register"}
        </button>
      </div>
    </div>
  );
}

export default AuthModal;