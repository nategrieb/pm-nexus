import { useState } from "react";
import type { ReactNode } from "react";

// simple dummy password for gating the UI before the game
const PASSWORD = "12345";

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authorized, setAuthorized] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      setAuthorized(true);
    } else {
      alert("Incorrect password");
      setInput("");
    }
  };

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <form onSubmit={handleSubmit}>
        <label>
          Password:{" "}
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </label>{" "}
        <button type="submit">Enter</button>
      </form>
    </div>
  );
}
