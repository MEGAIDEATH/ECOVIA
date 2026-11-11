'use client';

import { useRouter } from 'next/navigation';

import { Modal } from '@/components/ui/Modal';
import { AdminLoginForm } from '@/features/admin/AdminLoginForm';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
}

/** Admin login dialog opened from the public footer / waiting room. */
export function AdminLoginModal({ open, onClose }: AdminLoginModalProps) {
  const router = useRouter();

  return (
    <Modal open={open} onClose={onClose} title="دخول الإدارة" icon="admin_panel_settings" panelClassName="max-w-sm">
      <AdminLoginForm
        onSuccess={() => {
          onClose();
          router.push('/admin');
        }}
      />
    </Modal>
  );
}
