'use client';

import { useRouter } from 'next/navigation';

/**
 * Organization home tab — the two legacy shortcut cards
 * ("البحث عن كفاءات" / "إدارة العقود") that jump to their tabs.
 */
export function OrganizationHome() {
  const router = useRouter();

  return (
    <div className="fade-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => router.push('/organization/specialists')}
          className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-8 flex flex-col justify-center items-center text-center h-full hover:border-primary transition-colors cursor-pointer group"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">search</span>
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">البحث عن كفاءات</h3>
          <p className="text-sm text-secondary">
            تصفح دليل الأخصائيين المعتمدين واكتشف المواهب البيئية لمشاريعك.
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push('/organization/messages')}
          className="bg-white rounded-3xl shadow-sm border border-outline-variant/30 p-8 flex flex-col justify-center items-center text-center h-full hover:border-primary transition-colors cursor-pointer group"
        >
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">handshake</span>
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">إدارة العقود</h3>
          <p className="text-sm text-secondary">
            تابع رسائلك، أنشئ عقوداً جديدة، ووقع الاتفاقيات إلكترونياً.
          </p>
        </button>
      </div>
    </div>
  );
}