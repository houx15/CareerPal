"use client";

import { type FormEvent, useState } from "react";
import { LangToggle } from "../i18n/LangProvider";
import { Slime } from "./Slime";

interface LoginScreenProps {
  onBack: () => void;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onGoSignup: () => void;
  initialError?: string | null;
}

interface SignUpScreenProps {
  onBack: () => void;
  onComplete: (payload: { email: string; password: string }) => Promise<void>;
  onGoLogin: () => void;
}

export function LoginScreen({ onBack, onLogin, onGoSignup, initialError }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = email.includes("@") && password.length >= 1;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onLogin({ email, password });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="center-stage" data-screen-label="02 Login">
      <button className="center-stage-back" type="button" onClick={onBack}>
        ← CareerPal
      </button>
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <LangToggle compact />
      </div>
      <div className="login-card">
        <div className="login-slime">
          <Slime size={72} state="listening" />
        </div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Log in to continue.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">
              Email
            </label>
            <input id="login-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error || initialError ? <p className="form-error">{error ?? initialError}</p> : null}
          <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!canSubmit || isSubmitting}>
            Log in<span style={{ fontSize: 14 }}>→</span>
          </button>
        </form>
        <div className="login-foot">
          <span style={{ color: "var(--ink-3)" }}>No account yet? </span>
          <button className="btn-link" type="button" onClick={onGoSignup}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignUpScreen({ onBack, onComplete, onGoLogin }: SignUpScreenProps) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailValid = email.includes("@") && email.includes(".") && emailCode.length === 6;
  const passwordValid = password.length >= 8 && password === passwordConfirm;
  const phoneValid = phone.replace(/\D/g, "").length >= 7 && phoneCode.length === 6;

  async function finish() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onComplete({ email, password });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="center-stage" data-screen-label="02 Sign Up">
      <button className="center-stage-back" type="button" onClick={step > 0 && step < 3 ? () => setStep(step - 1) : onBack}>
        ← {step > 0 && step < 3 ? "Back" : "CareerPal"}
      </button>
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <LangToggle compact />
      </div>
      <div className="login-card">
        <div className="login-slime">
          <Slime size={72} state="listening" />
        </div>
        {step < 3 ? (
          <>
            <h1 className="login-title">Create your account</h1>
            <p className="login-sub">A few quick steps to get started.</p>
            <div className="signup-stepper">
              {["Email", "Password", "Phone"].map((label, index) => (
                <div key={label} className={`signup-step${index === step ? " active" : ""}${index < step ? " done" : ""}`}>
                  <div className="signup-step-dot">{index < step ? "✓" : index + 1}</div>
                  <div className="signup-step-label">{label}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {step === 0 ? (
          <form className="login-form" onSubmit={(event) => { event.preventDefault(); if (emailValid) setStep(1); }}>
            <div className="signup-substep-title">Verify your email</div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-email">
                Email
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="signup-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={!(email.includes("@") && email.includes(".")) || emailSent}
                  onClick={() => setEmailSent(true)}
                >
                  {emailSent ? "Code sent" : "Send code"}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-email-code">
                Verification code
              </label>
              <input
                id="signup-email-code"
                className="input"
                maxLength={6}
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!emailValid}>
              Next<span style={{ fontSize: 14 }}>→</span>
            </button>
          </form>
        ) : null}

        {step === 1 ? (
          <form className="login-form" onSubmit={(event) => { event.preventDefault(); if (passwordValid) setStep(2); }}>
            <div className="signup-substep-title">Set a password</div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-password-confirm">
                Password ✓
              </label>
              <input
                id="signup-password-confirm"
                className="input"
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!passwordValid}>
              Next<span style={{ fontSize: 14 }}>→</span>
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="login-form" onSubmit={(event) => { event.preventDefault(); if (phoneValid) setStep(3); }}>
            <div className="signup-substep-title">Bind your phone</div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-phone">
                Phone number
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="signup-phone" className="input" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={phone.replace(/\D/g, "").length < 7 || phoneSent}
                  onClick={() => setPhoneSent(true)}
                >
                  {phoneSent ? "Code sent" : "Send code"}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="signup-phone-code">
                Verification code
              </label>
              <input
                id="signup-phone-code"
                className="input"
                maxLength={6}
                value={phoneCode}
                onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <button type="submit" className="btn btn-accent btn-lg login-action" disabled={!phoneValid}>
              Verify<span style={{ fontSize: 14 }}>→</span>
            </button>
          </form>
        ) : null}

        {step === 3 ? (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <Slime size={96} state="answering" />
            </div>
            <h1 className="login-title">All set</h1>
            <p className="login-sub">Your account is verified. Let's get to know you.</p>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-accent btn-lg login-action" style={{ marginTop: 20 }} type="button" disabled={isSubmitting} onClick={finish}>
              Continue<span style={{ fontSize: 14 }}>→</span>
            </button>
          </div>
        ) : null}

        {step < 3 ? (
          <div className="login-foot">
            <span style={{ color: "var(--ink-3)" }}>Already have an account? </span>
            <button className="btn-link" type="button" onClick={onGoLogin}>
              Log in
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NameIntro({ onSubmit }: { onSubmit: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");

  return (
    <div className="center-stage" data-screen-label="03 Name">
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <LangToggle compact />
      </div>
      <div className="greet-card">
        <Slime size={120} state="speaking" />
        <h1 className="greet-headline">Before we start, what should I call you?</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) void onSubmit(name.trim());
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}
        >
          <input className="input" autoFocus placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="btn btn-accent btn-lg" disabled={!name.trim()} style={{ width: "100%", justifyContent: "center" }}>
            Nice to meet you<span style={{ fontSize: 15 }}>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
