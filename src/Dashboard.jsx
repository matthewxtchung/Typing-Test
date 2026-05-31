import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getRank, RANKS, eloToWpm } from "./App";
import "./Dashboard.css";

const PLACEMENT_COUNT = 5;

function Dashboard({ user, username, onClose, visible, profileElo, placementResults, refreshKey, readOnly }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    const fetchResults = async () => {
      const { data, error } = await supabase
        .from("results")
        .select("wpm, created_at, elo_change")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        const { data: fallback } = await supabase
          .from("results")
          .select("wpm, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setResults(fallback || []);
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };
    fetchResults();
  }, [user, visible, refreshKey]);

  const best = results.length ? Math.max(...results.map((r) => r.wpm)) : null;
  const avg = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length)
    : null;

  const placementDone = placementResults.length >= PLACEMENT_COUNT;
  const currentRank = placementDone ? getRank(profileElo) : null;
  const nextRank = placementDone ? RANKS.find((r) => r.min > profileElo) ?? null : null;
  const eloToNext = nextRank ? nextRank.min - profileElo : null;

  return (
    <div className="dash-page">
      <button className="dash-back" onClick={onClose}>← back</button>
      <div className="dash-content">
        <p className="dash-email">{username}</p>

        {placementDone ? (
          <div className="dash-rank-section">
            <p className="dash-rank-name" style={{ color: currentRank.color }}>{currentRank.name}</p>
            <p className="dash-elo-value">{profileElo} <span className="dash-elo-unit">elo</span></p>
            {nextRank && !readOnly && (
              <p className="dash-elo-next">
                {eloToNext} elo to <span style={{ color: nextRank.color }}>{nextRank.name}</span>
                <span className="dash-elo-next-wpm"> (~{Math.ceil(eloToWpm(nextRank.min))} wpm)</span>
              </p>
            )}
            <div className="dash-rank-bar-wrap">
              {RANKS.map((r) => {
                const isCurrent = currentRank && r.name === currentRank.name;
                return (
                  <div
                    key={r.name}
                    className={`dash-rank-pip ${isCurrent ? "dash-rank-pip-current" : ""}`}
                    title={r.name}
                    style={{
                      background: r.color,
                      opacity: profileElo >= r.min ? 1 : 0.35,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="dash-rank-section">
            <p className="dash-placement-info">
              placement: {placementResults.length}/{PLACEMENT_COUNT}
            </p>
            {!readOnly && <p className="dash-placement-sub">complete all 5 ranked tests to receive your rank</p>}
          </div>
        )}

        {loading ? (
          <p className="dash-empty">loading...</p>
        ) : results.length === 0 ? (
          <p className="dash-empty">no tests yet.</p>
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
      </div>
    </div>
  );
}

export default Dashboard;