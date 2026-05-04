import { FormEvent, useState } from "react";

interface AuthScreensProps {
  onRegister: (payload: { email: string; username: string; password: string }) => Promise<void>;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
}

export function AuthScreens({ onRegister, onLogin }: AuthScreensProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await onRegister({ email, username, password });
      } else {
        await onLogin({ email, password });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">CareerPal account</p>
        <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        {mode === "signup" ? (
          <label>
            Username
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="text"
              value={username}
            />
          </label>
        ) : null}
        <label>
          Password
          <input
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-accent" disabled={isSubmitting} type="submit">
          {mode === "signup" ? "Create account" : "Log in"}
        </button>
        <button
          className="btn btn-text"
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === "signup" ? "login" : "signup");
          }}
        >
          {mode === "signup" ? "I already have an account" : "Create a new account"}
        </button>
      </form>
    </main>
  );
}
