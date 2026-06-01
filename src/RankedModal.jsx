import { RANKS, eloToWpm } from "./App";
import "./RankedModal.css";

function RankedModal({ onClose }) {
  return (
    <div className="rmodal-overlay">
      <div className="rmodal">
        <p className="rmodal-title">ranked</p>

        <div className="rmodal-rules">
          <div className="rmodal-rule">
            <span className="rmodal-num">1</span>
            <span>you have 15 seconds to type as fast and accurately as you can</span>
          </div>
          <div className="rmodal-rule">
            <span className="rmodal-num">2</span>
            <span>text is random words, not quotes</span>
          </div>
          <div className="rmodal-rule">
            <span className="rmodal-num">3</span>
            <span>there is no reset once you start typing</span>
          </div>
          <div className="rmodal-rule">
            <span className="rmodal-num">4</span>
            <span>complete 5 placement tests to receive your starting rank</span>
          </div>
          <div className="rmodal-rule">
            <span className="rmodal-num">5</span>
            <span>abandoning a test (including refreshing) costs 50 elo</span>
          </div>
        </div>

        <div className="rmodal-divider" />

        <p className="rmodal-legend-title">rank legend</p>
        <div className="rmodal-legend">
          {RANKS.map((r) => (
            <div key={r.name} className="rmodal-legend-row">
              <div className="rmodal-legend-pip" style={{ background: r.color }} />
              <span className="rmodal-legend-name" style={{ color: r.color }}>{r.name}</span>
              <span className="rmodal-legend-range">
                {r.max === Infinity
                  ? `${eloToWpm(r.min)}+ wpm`
                  : `${eloToWpm(r.min)}–${eloToWpm(r.max)} wpm`}
              </span>
              <span className="rmodal-legend-elo">
                {r.max === Infinity
                  ? `${r.min}+ elo`
                  : `${r.min}–${r.max} elo`}
              </span>
            </div>
          ))}
        </div>

        <button className="rmodal-btn" onClick={onClose}>ok →</button>
      </div>
    </div>
  );
}

export default RankedModal;