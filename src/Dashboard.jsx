import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getRank, RANKS, eloToWpm } from "./App";
import "./Dashboard.css";

const PLACEMENT_COUNT = 5;

function Dashboard({ user, username, onClose, visible, profileElo, placementResults, refreshKey, readOnly }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gmRank, setGmRank] = useState(null);

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

  const placementDone = placementResults.length >= PLACEMENT_COUNT;
  const currentRank = placementDone ? getRank(profileElo) : null;

  useEffect(() => {
    if (!placementDone || currentRank?.name !== "Grandmaster") return;
    const fetchGmRank = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("elo", profileElo);
      setGmRank((count ?? 0) + 1);
    };
    fetchGmRank();
  }, [profileElo, placementDone, currentRank]);

  const best = results.length ? Math.max(...results.map((r) => r.wpm)) : null;
  const avg = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length)
    : null;

  const nextRank = placementDone ? RANKS.find((r) => r.min > profileElo) ?? null : null;
  const eloToNext = nextRank ? nextRank.min - profileElo : null;

  const progressPct = currentRank && currentRank.max !== Infinity
    ? Math.min(100, Math.max(0, ((profileElo - currentRank.min) / (currentRank.max - currentRank.min)) * 100))
    : currentRank
    ? 99
    : 0;

  const isGrandmaster = currentRank?.name === "Grandmaster";

  return (
    <div className="dash-page">
      <button className="dash-back" onClick={onClose}>← back</button>
      <div className="dash-content">
        <p className="dash-email">{username}</p>

        {placementDone ? (
          <div className="dash-rank-section">
            <p className="dash-rank-name" style={{ color: currentRank.color }}>
              {currentRank.name}
            </p>
            <p className="dash-elo-value">{profileElo} <span className="dash-elo-unit">elo</span></p>
            {!isGrandmaster && nextRank && !readOnly && (
              <p className="dash-elo-next">
                {eloToNext} elo to <span style={{ color: nextRank.color }}>{nextRank.name}</span>
                <span className="dash-elo-next-wpm"> (~{Math.ceil(eloToWpm(nextRank.min))} wpm)</span>
              </p>
            )}
            {isGrandmaster ? (
              gmRank && (
                <p className="dash-rank-number" style={{ color: currentRank.color }}>
                  Rank #{gmRank}
                </p>
              )
            ) : (
              <div className="dash-progress-wrap">
                <div className="dash-progress-labels">
                  <span>{currentRank.min}</span>
                  <span>{currentRank.max === Infinity ? "∞" : currentRank.max}</span>
                </div>
                <div className="dash-progress-track">
                  <div
                    className="dash-progress-fill"
                    style={{ width: `${progressPct}%`, background: currentRank.color }}
                  />
                  <div
                    className="dash-progress-thumb"
                    style={{ left: `calc(${progressPct}% - 6px)`, borderColor: currentRank.color }}
                  />
                </div>
              </div>
            )}
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
          <div className="dash-divider" />
          <div className="dash-stat">
            <p className="dash-stat-label">tests completed</p>
            <p className="dash-stat-value">{results.length}</p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;