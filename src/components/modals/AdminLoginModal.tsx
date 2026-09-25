'use client';

import { useRouter } from 'next/navigation';
import { useState, type KeyboardEvent } from 'react';

import { Modal } from '@/components/ui/Modal';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { useToast } from '@/components/ui/Toast';
import { adminLogin } from '@/features/admin/adminRepository';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Admin login modal. Unlike the legacy version (which compared against a
 * hard-coded password in browser JS), this posts to /api/admin/login where
 * the ADMIN_PASSWORD environment variable is validated server-side.
 */
export function AdminLoginModal({ open, onClose }: AdminLoginModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const submit = async () => {
    setLoading(true);
    try {
      await adminLogin(password);
      setPassword('');
      onClose();
      router.push('/admin');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ في الاتصال';
      showToast(message, true);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="دخول الإدارة"
      icon="admin_panel_settings"
      panelClassName="bg-surface rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden p-6 relative"
      headerClassName="flex justify-between items-center mb-6"
    >
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="رمز الدخول"
        className="w-full px-4 py-3 bg-surface-container-low rounded-xl border focus:border-primary mb-6 text-center text-xl tracking-widest outline-none"
        placeholder="****"
        dir="ltr"
      />
      <LoadingButton
        loading={loading}
        loadingLabel="جاري..."
        onClick={() => void submit()}
        className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#006d44] transition-colors"
      >
        دخول
      </LoadingButton>
    </Modal>
  );
}