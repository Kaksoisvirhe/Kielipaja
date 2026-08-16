import { useState, useEffect } from "react";

const CORRECT_CODE = import.meta.env.VITE_ACCESS_CODE;
const STORAGE_KEY = "tyopaja-access-granted";

export default function Gate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setUnlocked(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === CORRECT_CODE) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return children;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f5f0",
        fontFamily: "'Iowan Old Style', Georgia, serif",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #e6e0d2",
          borderRadius: 14,
          padding: 28,
          maxWidth: 360,
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>12.8.2026 Kielipajan jatkotyöstöä</h1>
        <p
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 14,
            color: "#6b6558",
            margin: "0 0 18px",
          }}
        >
          Sivu on suojattu. Syötä pääsykoodi, jonka sait sähköpostissa.
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          placeholder="Koodi"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${error ? "#c0392b" : "#ddd6c9"}`,
            borderRadius: 8,
            fontSize: 15,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p
            style={{
              color: "#c0392b",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 13,
              margin: "0 0 10px",
            }}
          >
            Väärä koodi, yritä uudelleen.
          </p>
        )}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px 18px",
            background: "#3d5a4c",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          Jatka
        </button>
      </form>
    </div>
  );
}
