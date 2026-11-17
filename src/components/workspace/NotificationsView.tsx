import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { NotificationItem } from '../../types';
import { PriorityLabel } from '../PriorityBadge';
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassNotification,
} from '../glass/GlassPrimitives';

export const NotificationsView: React.FC<{
  onOpenCase: (caseId: string) => void;
  onRefreshParent: () => void;
  onToast: (msg: string) => void;
}> = ({ onOpenCase, onRefreshParent, onToast }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const load = async () => {
    try {
      const res = await api.getNotifications();
      setItems(res.notifications);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to load notifications.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      onRefreshParent();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to update notification.');
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onRefreshParent();
      onToast('All clinical alerts marked as read.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to mark notifications read.');
    }
  };

  const handleClear = async () => {
    try {
      await api.clearNotifications('all');
      setItems([]);
      onRefreshParent();
      onToast('Cleared all notifications.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to clear notifications.');
    }
  };

  const filtered =
    categoryFilter === 'all'
      ? items
      : items.filter((n) => (n.category || 'Priority Signal') === categoryFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F4F7FF]">Notifications</h1>
          <p className="mt-1 text-sm text-[#A5B0C7]">
            Floating priority clinical alerts generated from live image and dataset evaluations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl glass-surface p-1">
            {['all', 'Priority Signal', 'Data Quality', 'Workflow Review'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-[rgba(28,39,62,0.85)] text-[#32D9E8]'
                    : 'text-[#A5B0C7] hover:text-[#F4F7FF]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>

          <GlassButton type="button" variant="secondary" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="h-3.5 w-3.5 text-[#19D6A0]" />
            <span>Mark All Read</span>
          </GlassButton>

          <GlassButton type="button" variant="danger" size="sm" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Notifications</span>
          </GlassButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="p-12 text-center text-sm text-[#A5B0C7]">
          <Bell className="mx-auto h-7 w-7 text-[#77849E] mb-2" />
          No clinical priority alerts in this category.
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <GlassNotification
              key={n.id}
              title={n.title}
              message={n.message}
              timestamp={new Date(n.createdAt).toLocaleString()}
              unread={!n.read}
              badge={
                <div className="flex items-center gap-2">
                  <PriorityLabel priority={n.severity} compact />
                  <GlassBadge tone="cyan">{n.category || 'Priority Signal'}</GlassBadge>
                </div>
              }
              actions={
                <>
                  {n.relatedCaseId && (
                    <GlassButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenCase(n.relatedCaseId!)}
                    >
                      Open Case
                    </GlassButton>
                  )}
                  {!n.read && (
                    <GlassButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Mark Read
                    </GlassButton>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
