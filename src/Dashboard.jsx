import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./Dashboard.css";

function Dashboard({ user, username, onClose, visible }) {
  const [tab, setTab] = useState("profile");
  const [results, setResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("results")
        .select("wpm, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setResults(data || []);
      setLoading(false);
    };
    fetch();
  }, [user, visible]);

  useEffect(() => {
    if (!visible || tab !== "leaderboard") return;
    setLbLoading(true);
    const fetch = async () => {
      const { data } = await supabase
        .from("results")
        .select("wpm, user_id, profiles(username)")
        .order("wpm", { ascending: false });

      if (data) {
        const seen = new Set();
        const top = [];
        for (const row of data) {
          if (!seen.has(row.user_id)) {
            seen.add(row.user_id);
            top.push({
              username: row.profiles?.username ?? "unknown",
              wpm: row.wpm,
            });
          }
          if (top.length >= 50) break;
        }
        setLeaderboard(top);
      }
      setLbLoading(false);
    };
    fetch();
  }, [visible, tab]);

  const best = results.length ? Math.max(...results.map((r) => r.wpm)) : null;
  const avg = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length)
    : null;

  return (
    <div className="dash-page">
      <button className="dash-back" onClick={onClose}>← back</button>
      <div className="dash-content">
        <div className="dash-tabs">
          <button
            className={`dash-tab ${tab === "profile" ? "dash-tab-active" : ""}`}
            onClick={() => setTab("profile")}
          >
            profile
          </button>
          <button
            className={`dash-tab ${tab === "leaderboard" ? "dash-tab-active" : ""}`}
            onClick={() => setTab("leaderboard")}
          >
            leaderboard
          </button>
        </div>

        {tab === "profile" && (
          <>
            <p className="dash-email">{username ?? user.email}</p>
            {loading ? (
              <p className="dash-empty">loading...</p>
            ) : results.length === 0 ? (
              <p className="dash-empty">no tests yet. get typing.</p>
            ) : (
              <div className="dash-stats">
                <div className="dash-stat">
                  <p className="dash-stat-label">average</p>
                  <p className="dash-stat-value">{avg}</p>
                </div>
                <div className="dash-divider" />
                <div className="dash-stat">
                  <p className="dash-stat-label">best</p>
                  <p className="dash-stat-value">{best}</p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "leaderboard" && (
          <>
            {lbLoading ? (
              <p className="dash-empty">loading...</p>
            ) : leaderboard.length === 0 ? (
              <p className="dash-empty">no results yet.</p>
            ) : (
              <div className="dash-leaderboard">
                {leaderboard.map((entry, i) => (
                  <div
                    key={i}
                    className={`dash-lb-row ${entry.username === username ? "dash-lb-you" : ""}`}
                  >
                    <span className="dash-lb-rank">#{i + 1}</span>
                    <span className="dash-lb-name">{entry.username}</span>
                    <span className="dash-lb-wpm">{entry.wpm} wpm</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;