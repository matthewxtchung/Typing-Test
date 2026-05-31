import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getRank } from "./App";
import "./Dashboard.css";

const PLACEMENT_COUNT = 5;

function Leaderboard({ onClose, username, onViewUser, refreshKey }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = async () => {
      const { data: results } = await supabase
        .from("results")
        .select("wpm, user_id")
        .order("wpm", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, elo, placement_results");

      if (results && profiles) {
        const profileMap = Object.fromEntries(
          profiles.map((p) => [p.id, {
            username: p.username,
            elo: p.elo ?? 0,
            placement_results: p.placement_results ?? [],
            placementDone: (p.placement_results ?? []).length >= PLACEMENT_COUNT,
          }])
        );
        const seen = new Set();
        const top = [];
        for (const row of results) {
          if (!seen.has(row.user_id)) {
            seen.add(row.user_id);
            const profile = profileMap[row.user_id] ?? { username: "unknown", elo: 0, placement_results: [], placementDone: false };
            top.push({
              username: profile.username,
              wpm: row.wpm,
              elo: profile.elo,
              rank: profile.placementDone ? getRank(profile.elo) : null,
              profileData: {
                id: row.user_id,
                username: profile.username,
                elo: profile.elo,
                placement_results: profile.placement_results,
              },
            });
          }
          if (top.length >= 50) break;
        }
        setLeaderboard(top);
      }
      setLoading(false);
    };
    fetch();
  }, [refreshKey]);

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
                <span className="dash-lb-name">
                  <button
                    className="dash-lb-username-btn"
                    onClick={() => onViewUser(entry.profileData)}
                  >
                    {entry.username}
                  </button>
                  {entry.rank && (
                    <span
                      className="dash-lb-rank-badge"
                      style={{
                        background: entry.rank.color + "22",
                        color: entry.rank.color,
                        border: `1px solid ${entry.rank.color}55`,
                      }}
                    >
                      {entry.rank.name} ({entry.elo} elo)
                    </span>
                  )}
                </span>
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