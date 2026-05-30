import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./Dashboard.css";

function Dashboard({ user, username, onClose, visible }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const best = results.length ? Math.max(...results.map((r) => r.wpm)) : null;
  const avg = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length)
    : null;

  return (
    <div className="dash-page">
      <button className="dash-back" onClick={onClose}>← back</button>
      <div className="dash-content">
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
      </div>
    </div>
  );
}

export default Dashboard;