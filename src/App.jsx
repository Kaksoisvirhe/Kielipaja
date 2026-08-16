import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, ROOM } from "./supabaseClient";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const EMPTY_POLL = { question: "", options: [], votes: {} };

export default function App() {
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [poll, setPoll] = useState(EMPTY_POLL);
  const [newOptionText, setNewOptionText] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const rowExists = useRef(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("workshop_rooms")
      .select("poll, comments")
      .eq("room", ROOM)
      .maybeSingle();

    if (err) {
      setError(
        "Tietojen lataus epäonnistui. Tarkista Supabase-asetukset ja taulun oikeudet."
      );
      setLoading(false);
      return;
    }

    if (data) {
      rowExists.current = true;
      setPoll(data.poll || EMPTY_POLL);
      setComments(data.comments || []);
      setError(null);
    } else {
      rowExists.current = false;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`room-${ROOM}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workshop_rooms",
          filter: `room=eq.${ROOM}`,
        },
        (payload) => {
          const row = payload.new;
          if (row) {
            setPoll(row.poll || EMPTY_POLL);
            setComments(row.comments || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const persist = async (nextPoll, nextComments) => {
    const payload = {
      room: ROOM,
      poll: nextPoll,
      comments: nextComments,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = await supabase
      .from("workshop_rooms")
      .upsert(payload, { onConflict: "room" });

    if (err) {
      setError("Tallennus epäonnistui, yritä uudelleen.");
    } else {
      rowExists.current = true;
      setError(null);
    }
  };

  const savePoll = async (next) => {
    setPoll(next);
    await persist(next, comments);
  };

  const saveComments = async (next) => {
    setComments(next);
    await persist(poll, next);
  };

  const handleSetName = (e) => {
    e.preventDefault();
    if (name.trim()) setNameSaved(true);
  };

  const addOption = async () => {
    if (!newOptionText.trim()) return;
    const next = {
      ...poll,
      options: [...poll.options, { id: uid(), text: newOptionText.trim() }],
    };
    setNewOptionText("");
    await savePoll(next);
  };

  const removeOption = async (id) => {
    const next = {
      ...poll,
      options: poll.options.filter((o) => o.id !== id),
      votes: Object.fromEntries(
        Object.entries(poll.votes).filter(([k]) => k !== id)
      ),
    };
    await savePoll(next);
  };

  const setQuestion = async () => {
    const next = { ...poll, question: newQuestionText.trim() };
    setEditingQuestion(false);
    await savePoll(next);
  };

  const MAX_VOTES = 5;
  const [limitWarning, setLimitWarning] = useState(false);

  const myVoteCount = Object.values(poll.votes || {}).filter((voters) =>
    (voters || []).includes(name.trim())
  ).length;

  const toggleVote = async (optionId) => {
    if (!nameSaved) return;
    const votes = { ...poll.votes };
    const already = (poll.votes[optionId] || []).includes(name.trim());

    if (already) {
      votes[optionId] = (votes[optionId] || []).filter(
        (v) => v !== name.trim()
      );
      setLimitWarning(false);
    } else {
      if (myVoteCount >= MAX_VOTES) {
        setLimitWarning(true);
        setTimeout(() => setLimitWarning(false), 2500);
        return;
      }
      votes[optionId] = [...(votes[optionId] || []), name.trim()];
    }
    await savePoll({ ...poll, votes });
  };

  const totalVotes = Object.values(poll.votes || {}).reduce(
    (sum, v) => sum + (v ? v.length : 0),
    0
  );

  const addComment = async () => {
    if (!commentText.trim() || !nameSaved) return;
    const next = [
      ...comments,
      {
        id: uid(),
        author: name.trim(),
        text: commentText.trim(),
        time: new Date().toISOString(),
      },
    ];
    setCommentText("");
    await saveComments(next);
  };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("fi-FI", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={{ color: "#7a7266", fontFamily: "Georgia, serif" }}>
            Ladataan työpajaa…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        input, textarea, button { font-family: inherit; }
        input:focus, textarea:focus, button:focus-visible {
          outline: 2px solid #3d5a4c;
          outline-offset: 2px;
        }
        button { cursor: pointer; }
        ::selection { background: #c9d9c9; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <header style={styles.header}>
        <div style={styles.eyebrow}>YHTEINEN TILA</div>
        <h1 style={styles.h1}>17.8.2026 Kielipajan jatkotyöstöä</h1>
        <p style={styles.sub}>
          Äänestä vaihtoehdoista ja keskustele tuloksista — kaikki näkevät
          saman, reaaliajassa.
        </p>
      </header>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {!nameSaved ? (
        <form onSubmit={handleSetName} style={styles.nameCard}>
          <label style={styles.nameLabel} htmlFor="nimi">
            Nimesi (näkyy äänissä ja kommenteissa)
          </label>
          <div style={styles.nameRow}>
            <input
              id="nimi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="esim. Marja"
              style={styles.nameInput}
              autoFocus
            />
            <button type="submit" style={styles.primaryBtn}>
              Jatka
            </button>
          </div>
        </form>
      ) : (
        <div style={styles.whoami}>
          Kirjautuneena: <strong>{name.trim()}</strong>{" "}
          <button onClick={() => setNameSaved(false)} style={styles.linkBtn}>
            vaihda
          </button>
        </div>
      )}

      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <span style={styles.sectionNum}>Äänestys</span>
          {totalVotes > 0 && (
            <span style={styles.voteCount}>{totalVotes} ääntä</span>
          )}
        </div>

        {editingQuestion ? (
          <div style={styles.questionEdit}>
            <input
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Kirjoita äänestyksen kysymys…"
              style={styles.questionInput}
              autoFocus
            />
            <button onClick={setQuestion} style={styles.smallPrimaryBtn}>
              Tallenna
            </button>
          </div>
        ) : (
          <h2
            style={styles.question}
            onClick={() => {
              setNewQuestionText(poll.question);
              setEditingQuestion(true);
            }}
            title="Klikkaa muokataksesi kysymystä"
          >
            {poll.question || "Klikkaa asettaaksesi äänestyksen kysymys…"}
          </h2>
        )}

        <div style={styles.options}>
          {poll.options.length === 0 && (
            <p style={styles.emptyText}>
              Ei vielä vaihtoehtoja. Lisää ensimmäinen alta.
            </p>
          )}
          {poll.options.map((opt) => {
            const voters = poll.votes[opt.id] || [];
            const pct = totalVotes
              ? Math.round((voters.length / totalVotes) * 100)
              : 0;
            const mine = voters.includes(name.trim());
            return (
              <div key={opt.id} style={styles.optionRow}>
                <button
                  onClick={() => toggleVote(opt.id)}
                  disabled={!nameSaved}
                  style={{
                    ...styles.optionBtn,
                    borderColor: mine ? "#3d5a4c" : "#ddd6c9",
                    background: mine ? "#eef3ee" : "#fff",
                    cursor: nameSaved ? "pointer" : "not-allowed",
                  }}
                >
                  <div style={styles.optionTop}>
                    <span style={styles.optionText}>
                      {mine && "✓ "}
                      {opt.text}
                    </span>
                    <span style={styles.optionPct}>
                      {pct}% · {voters.length}
                    </span>
                  </div>
                  <div style={styles.barTrack}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${pct}%`,
                        background: mine ? "#3d5a4c" : "#b7c9bb",
                      }}
                    />
                  </div>
                  {voters.length > 0 && (
                    <div style={styles.voters}>{voters.join(", ")}</div>
                  )}
                </button>
                <button
                  onClick={() => removeOption(opt.id)}
                  style={styles.removeBtn}
                  title="Poista vaihtoehto"
                  aria-label="Poista vaihtoehto"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div style={styles.addOptionRow}>
          <input
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addOption()}
            placeholder="Lisää vaihtoehto…"
            style={styles.addOptionInput}
          />
          <button onClick={addOption} style={styles.secondaryBtn}>
            Lisää
          </button>
        </div>
       {!nameSaved && <p style={styles.hint}>Anna nimesi yllä äänestääksesi.</p>}
        {nameSaved && (
          <p style={styles.hint}>
            Valitse enintään {MAX_VOTES} vaihtoehtoa
            {myVoteCount > 0 && ` — valittuna ${myVoteCount}/${MAX_VOTES}`}.
          </p>
        )}
        {limitWarning && (
          <p
            style={{
              ...styles.hint,
              color: "#c0392b",
              fontWeight: 600,
            }}
          >
            Olet jo valinnut {MAX_VOTES} vaihtoehtoa. Poista ensin yksi
            valinta lisätäksesi toisen.
          </p>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <span style={styles.sectionNum}>Keskustelu</span>
          {comments.length > 0 && (
            <span style={styles.voteCount}>{comments.length} viestiä</span>
          )}
        </div>

        <div style={styles.comments}>
          {comments.length === 0 && (
            <p style={styles.emptyText}>
              Ei vielä kommentteja. Aloita keskustelu alta.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} style={styles.comment}>
              <div style={styles.commentHead}>
                <span style={styles.commentAuthor}>{c.author}</span>
                <span style={styles.commentTime}>{fmtTime(c.time)}</span>
              </div>
              <div style={styles.commentText}>{c.text}</div>
            </div>
          ))}
        </div>

        <div style={styles.addCommentRow}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              nameSaved ? "Kirjoita kommentti…" : "Anna nimesi yllä osallistuaksesi"
            }
            disabled={!nameSaved}
            style={styles.commentInput}
            rows={2}
          />
          <button
            onClick={addComment}
            disabled={!nameSaved || !commentText.trim()}
            style={{
              ...styles.primaryBtn,
              opacity: !nameSaved || !commentText.trim() ? 0.5 : 1,
              cursor: !nameSaved || !commentText.trim() ? "not-allowed" : "pointer",
            }}
          >
            Lähetä
          </button>
        </div>
      </section>

      <footer style={styles.footer}>
        Tiedot päivittyvät automaattisesti kaikille osallistujille.
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7f5f0",
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
    color: "#2b2a26",
    padding: "32px 16px 64px",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 12,
  },
  spinner: {
    width: 24,
    height: 24,
    border: "3px solid #ddd6c9",
    borderTopColor: "#3d5a4c",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  header: { maxWidth: 620, margin: "0 auto 28px" },
  eyebrow: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 11,
    letterSpacing: "0.14em",
    color: "#7a8f7f",
    fontWeight: 600,
    marginBottom: 8,
  },
  h1: {
    fontSize: "clamp(28px, 5vw, 38px)",
    margin: "0 0 8px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  sub: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 14.5,
    color: "#6b6558",
    margin: 0,
    lineHeight: 1.5,
  },
  errorBanner: {
    maxWidth: 620,
    margin: "0 auto 16px",
    padding: "10px 14px",
    background: "#fbe9e5",
    border: "1px solid #e3b6ab",
    borderRadius: 8,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 13,
    color: "#8a3d2c",
  },
  nameCard: {
    maxWidth: 620,
    margin: "0 auto 28px",
    background: "#fff",
    border: "1px solid #e6e0d2",
    borderRadius: 12,
    padding: 20,
  },
  nameLabel: {
    display: "block",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 12.5,
    color: "#6b6558",
    marginBottom: 8,
  },
  nameRow: { display: "flex", gap: 8 },
  nameInput: {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid #ddd6c9",
    borderRadius: 8,
    fontSize: 15,
    background: "#fbfaf6",
  },
  whoami: {
    maxWidth: 620,
    margin: "0 auto 24px",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 13,
    color: "#6b6558",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#3d5a4c",
    textDecoration: "underline",
    fontSize: 13,
    padding: 0,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  section: {
    maxWidth: 620,
    margin: "0 auto 28px",
    background: "#fff",
    border: "1px solid #e6e0d2",
    borderRadius: 14,
    padding: "22px 22px 20px",
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  sectionNum: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "#8a9c8d",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  voteCount: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 12,
    color: "#9a9382",
  },
  question: {
    fontSize: 20,
    margin: "0 0 16px",
    cursor: "pointer",
    lineHeight: 1.35,
    padding: "6px 8px",
    marginLeft: -8,
    borderRadius: 6,
  },
  questionEdit: { display: "flex", gap: 8, marginBottom: 16 },
  questionInput: {
    flex: 1,
    padding: "9px 12px",
    border: "1px solid #ddd6c9",
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "inherit",
  },
  options: { display: "flex", flexDirection: "column", gap: 10 },
  emptyText: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 13.5,
    color: "#9a9382",
    fontStyle: "italic",
    margin: "4px 0 8px",
  },
  optionRow: { display: "flex", alignItems: "center", gap: 6 },
  optionBtn: {
    flex: 1,
    textAlign: "left",
    border: "1.5px solid #ddd6c9",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#fff",
    transition: "background 0.15s, border-color 0.15s",
  },
  optionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  optionText: { fontSize: 14.5, fontWeight: 500 },
  optionPct: { fontSize: 12.5, color: "#8a8574", flexShrink: 0 },
  barTrack: {
    marginTop: 8,
    height: 5,
    borderRadius: 3,
    background: "#f0ece0",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3, transition: "width 0.3s ease" },
  voters: {
    marginTop: 6,
    fontSize: 11.5,
    color: "#9a9382",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#c2b8a0",
    fontSize: 20,
    lineHeight: 1,
    padding: "4px 6px",
  },
  addOptionRow: { display: "flex", gap: 8, marginTop: 14 },
  addOptionInput: {
    flex: 1,
    padding: "9px 12px",
    border: "1px solid #ddd6c9",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  hint: {
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 12,
    color: "#9a9382",
    marginTop: 8,
  },
  comments: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 },
  comment: { borderLeft: "2px solid #dbe4dc", paddingLeft: 12 },
  commentHead: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
    marginBottom: 3,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  commentAuthor: { fontWeight: 700, fontSize: 13 },
  commentTime: { fontSize: 11.5, color: "#a49c8a" },
  commentText: { fontSize: 14.5, lineHeight: 1.5 },
  addCommentRow: { display: "flex", flexDirection: "column", gap: 8 },
  commentInput: {
    padding: "10px 12px",
    border: "1px solid #ddd6c9",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    resize: "vertical",
  },
  footer: {
    maxWidth: 620,
    margin: "0 auto",
    textAlign: "center",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    fontSize: 11.5,
    color: "#a49c8a",
  },
  primaryBtn: {
    padding: "10px 18px",
    background: "#3d5a4c",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  smallPrimaryBtn: {
    padding: "8px 14px",
    background: "#3d5a4c",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  secondaryBtn: {
    padding: "9px 16px",
    background: "#eef3ee",
    color: "#3d5a4c",
    border: "1px solid #cddccf",
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
};
