"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/layout/AuthShell";
import { Field } from "@/components/ui/Field";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useToast } from "@/components/ui/Toast";

type Channel = "phone" | "email";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [channel, setChannel] = useState<Channel>("phone");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "reset" | "done">("request");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resend cooldown ticks down once per second; cleared on unmount.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestOtp() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/password/forgot/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "تعذر إرسال الرمز.", true);
        return;
      }
      const demo = data?.mode === "demo";
      setDemoMode(demo);
      showToast(demo ? "وضع العرض التجريبي: لم يتم إرسال أي رسالة." : "تم إرسال رمز التحقق.");
      setStep("verify");
      setCooldown(30);
    } finally {
      setSubmitting(false);
    }
  }

  function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      showToast("أدخل رمز التحقق المكون من 6 أرقام", true);
      return;
    }
    setStep("reset");
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      showToast("كلمة المرور يجب أن تكون 8 أحرف على الأقل.", true);
      return;
    }
    if (newPassword !== confirm) {
      showToast("تأكيد كلمة المرور غير متطابق.", true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/password/forgot/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          identifier: identifier.trim(),
          otp,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "تعذر إعادة تعيين كلمة المرور.", true);
        setStep("verify");
        return;
      }
      showToast("تم تغيير كلمة المرور بنجاح.");
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  const subtitles = {
    request: "اختر وسيلة التحقق وسنرسل لك رمزًا لإعادة التعيين.",
    verify: demoMode
      ? "وضع العرض التجريبي: لم يتم إرسال رسالة نصية أو بريد إلكتروني. أدخل رمز العرض التجريبي المكون من 6 أرقام."
      : `أدخل الرمز المكون من 6 أرقام المرسل إلى ${channel === "phone" ? "جوالك" : "بريدك"}.`,
    reset: "اختر كلمة مرور جديدة لحسابك.",
    done: "تم تغيير كلمة المرور بنجاح.",
  } as const;

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      subtitle={subtitles[step]}
      icon={step === "done" ? "task_alt" : "lock_reset"}
      footer={
        <Link href="/login" className="font-bold text-secondary hover:text-primary">
          العودة لتسجيل الدخول
        </Link>
      }
    >
      <div className="space-y-5">
        {step === "request" && (
          <>
            <div role="radiogroup" aria-label="وسيلة التحقق" className="grid grid-cols-2 gap-1 rounded-btn border border-line bg-wash p-1">
              {(["phone", "email"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={channel === value}
                  onClick={() => setChannel(value)}
                  className={`rounded-control py-2.5 text-sm font-bold transition-colors ${
                    channel === value ? "bg-forest text-white shadow-card" : "text-on-surface-variant hover:bg-white"
                  }`}
                >
                  {value === "phone" ? "رقم الجوال" : "البريد الإلكتروني"}
                </button>
              ))}
            </div>
            <Field id="reset-identifier" label={channel === "phone" ? "رقم الجوال المسجل" : "البريد الإلكتروني المسجل"} required>
              <input
                id="reset-identifier"
                type={channel === "phone" ? "tel" : "email"}
                dir="ltr"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="field-input text-left"
                autoComplete={channel === "phone" ? "tel" : "email"}
                required
              />
            </Field>
            <LoadingButton loading={submitting} loadingLabel="جاري الإرسال..." showSpinner onClick={() => void requestOtp()} className="btn btn-primary btn-block btn-lg">
              إرسال الرمز
            </LoadingButton>
          </>
        )}

        {step === "verify" && (
          <>
            <Field id="reset-otp" label="رمز التحقق">
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="field-input text-center text-xl tracking-[.5em]"
                maxLength={6}
              />
            </Field>
            <button type="button" onClick={() => verifyOtp()} className="btn btn-primary btn-block btn-lg">
              متابعة
            </button>
            <button type="button" disabled={cooldown > 0 || submitting} onClick={() => void requestOtp()} className="btn btn-secondary btn-block">
              {cooldown > 0 ? `إعادة الإرسال (${cooldown})` : "إعادة إرسال الرمز"}
            </button>
          </>
        )}

        {step === "reset" && (
          <>
            <Field id="new-password" label="كلمة المرور الجديدة" hint="8 أحرف على الأقل.">
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="field-input" minLength={8} autoComplete="new-password" aria-describedby="new-password-hint" />
            </Field>
            <Field id="confirm-password" label="تأكيد كلمة المرور">
              <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input" minLength={8} autoComplete="new-password" />
            </Field>
            <LoadingButton loading={submitting} loadingLabel="جاري الحفظ..." showSpinner onClick={() => void resetPassword()} className="btn btn-primary btn-block btn-lg">
              إعادة تعيين كلمة المرور
            </LoadingButton>
          </>
        )}

        {step === "done" && (
          <button type="button" onClick={() => router.push("/login")} className="btn btn-primary btn-block btn-lg">
            العودة لتسجيل الدخول
          </button>
        )}
      </div>
    </AuthShell>
  );
}
