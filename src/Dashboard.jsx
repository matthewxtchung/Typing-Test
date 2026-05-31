import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getRank, RANKS, eloToWpm } from "./App";
import "./Dashboard.css";

const PLACEMENT_COUNT = 5;

function Dashboard({ user, username, onClose, visible, profileElo, placementResults, refreshKey }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const fetchResults = async () => {
      // Select only wpm and created_at — avoids any RLS/column issues with elo_change
      const { data, error } = await supabase
        .from("results")
        .select("wpm, created_at, elo_change")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Dashboard fetch error:", error);
        // Fallback: try without elo_change in case column doesn't exist or is restricted
        const { data: fallback, error: fallbackError } = await supabase
          .from("results")
          .select("wpm, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("Dashboard fallback fetch error:", fallbackError);
          setResults([]);
        } else {
          setResults(fallback || []);
        }
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
        <p className="dash-email">{username ?? user.email}</p>

        {/* ELO / Rank section */}
        {placementDone ? (
          <div className="dash-rank-section">
            <p className="dash-rank-name" style={{ color: currentRank.color }}>{currentRank.name}</p>
            <p className="dash-elo-value">{profileElo} <span className="dash-elo-unit">elo</span></p>
            {nextRank && (
              <p className="dash-elo-next">
                {eloToNext} elo to <span style={{ color: nextRank.color }}>{nextRank.name}</span>
                <span className="dash-elo-next-wpm"> (~{Math.ceil(eloToWpm(nextRank.min))} wpm)</span>
              </p>
            )}
            {/* Rank progress bar */}
            <div className="dash-rank-bar-wrap">
              {RANKS.map((r) => {
                const active = profileElo >= r.min;
                return (
                  <div
                    key={r.name}
                    className="dash-rank-pip"
                    title={r.name}
                    style={{ background: active ? r.color : "#313244" }}
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
            <p className="dash-placement-sub">complete all 10 ranked tests to receive your rank</p>
          </div>
        )}

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

      </div>
    </div>
  );
}

export default Dashboard;