"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";

type Channel = "phone" | "email";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [channel, setChannel] = useState<Channel>("phone");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "reset" | "done">("request");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
      showToast("تم إرسال رمز التحقق.");
      setStep("verify");
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown((v) => {
          if (v <= 1) {
            clearInterval(timer);
            return 0;
          }
          return v - 1;
        });
      }, 1000);
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

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-on-surface">استعادة كلمة المرور</h1>

        {step === "request" && (
          <>
            <div className="flex gap-2">
              <button type="button" onClick={() => setChannel("phone")} className={`flex-1 rounded-xl border py-2 font-bold ${channel === "phone" ? "bg-primary text-white" : ""}`}>رقم الجوال</button>
              <button type="button" onClick={() => setChannel("email")} className={`flex-1 rounded-xl border py-2 font-bold ${channel === "email" ? "bg-primary text-white" : ""}`}>البريد الإلكتروني</button>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold">{channel === "phone" ? "رقم الجوال المسجل" : "البريد الإلكتروني المسجل"}</label>
              <input type={channel === "phone" ? "tel" : "email"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full rounded-xl border px-4 py-3" required />
            </div>
            <button type="button" disabled={submitting} onClick={() => void requestOtp()} className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60">{submitting ? "جاري الإرسال..." : "إرسال الرمز"}</button>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="text-sm text-secondary">أدخل الرمز المكون من 6 أرقام.</p>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full rounded-xl border px-4 py-3" maxLength={6} />
            <button type="button" onClick={() => verifyOtp()} className="w-full rounded-xl bg-primary py-3 font-bold text-white">متابعة</button>
            <button type="button" disabled={cooldown > 0 || submitting} onClick={() => void requestOtp()} className="w-full rounded-xl border py-2 font-bold disabled:opacity-60">{cooldown > 0 ? `إعادة الإرسال (${cooldown})` : "إعادة إرسال الرمز"}</button>
          </>
        )}

        {step === "reset" && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-bold">كلمة المرور الجديدة</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border px-4 py-3" minLength={8} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold">تأكيد كلمة المرور</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-xl border px-4 py-3" minLength={8} />
            </div>
            <button type="button" disabled={submitting} onClick={() => void resetPassword()} className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60">{submitting ? "جاري الحفظ..." : "إعادة تعيين كلمة المرور"}</button>
          </>
        )}

        {step === "done" && (
          <>
            <p className="text-sm text-secondary">تم تغيير كلمة المرور بنجاح.</p>
            <button type="button" onClick={() => router.push("/login")} className="w-full rounded-xl bg-primary py-3 font-bold text-white">العودة لتسجيل الدخول</button>
          </>
        )}
      </div>
    </main>
  );
}
