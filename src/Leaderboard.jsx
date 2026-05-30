import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./Dashboard.css";

function Leaderboard({ onClose, username }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: results } = await supabase
        .from("results")
        .select("wpm, user_id")
        .order("wpm", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username");

      if (results && profiles) {
        const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.username]));
        const seen = new Set();
        const top = [];
        for (const row of results) {
          if (!seen.has(row.user_id)) {
            seen.add(row.user_id);
            top.push({
              username: profileMap[row.user_id] ?? "unknown",
              wpm: row.wpm,
            });
          }
          if (top.length >= 50) break;
        }
        setLeaderboard(top);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="dash-page">
      <button className="dash-back" onClick={onClose}>← back</button>
      <div className="dash-content">
        <p className="dash-email">leaderboard</p>
        {loading ? (
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
      </div>
    </div>
  );
}

export default Leaderboard;