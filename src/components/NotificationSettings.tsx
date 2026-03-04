'use client';

import { useState, useEffect } from 'react';
import NavBar from './NavBar';

interface NotificationSettingsProps {
  currentUserId: number;
  currentUserName: string;
}

interface Settings {
  notifications_enabled: number;
  evening_reminder_enabled: number;
  evening_reminder_hour: number;
  morning_summary_enabled: number;
  morning_summary_hour: number;
  notification_email: string | null;
}

export default function NotificationSettings({ currentUserName }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingSending, setTestSending] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/notifications');
        const data = await res.json();
        setSettings(data.settings);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    }
    setSaving(false);
  };

  const sendTestEmail = async (type: 'evening' | 'morning') => {
    setTestSending(type);
    setMessage(null);

    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Test ${type} email sent to ${data.to}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test email' });
    }
    setTestSending(null);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
        <NavBar currentUserName={currentUserName} />
        <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
      </div>
    );
  }

  const allDisabled = !settings.notifications_enabled;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} />

      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Notifications</h2>

        <div className="glass rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-slate-700/50 animate-fade-in">
          {/* Master toggle */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-slate-100">Email Notifications</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Enable or disable all email notifications</div>
            </div>
            <Toggle
              checked={!!settings.notifications_enabled}
              onChange={(v) => setSettings({ ...settings, notifications_enabled: v ? 1 : 0 })}
            />
          </div>

          {/* Notification email */}
          <div className={`px-4 py-4 ${allDisabled ? 'opacity-40' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Send notifications to
            </label>
            <input
              type="email"
              value={settings.notification_email || ''}
              onChange={(e) => setSettings({ ...settings, notification_email: e.target.value || null })}
              disabled={allDisabled}
              placeholder="Leave blank to use login email"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 dark:placeholder-slate-500"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Where to receive notification emails (defaults to your account email)
            </p>
          </div>

          {/* Evening reminder */}
          <div className={`px-4 py-4 ${allDisabled ? 'opacity-40' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900 dark:text-slate-100">Evening Reminder</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">Nudge if you haven&apos;t logged exercises</div>
              </div>
              <Toggle
                checked={!!settings.evening_reminder_enabled}
                onChange={(v) => setSettings({ ...settings, evening_reminder_enabled: v ? 1 : 0 })}
                disabled={allDisabled}
              />
            </div>
            {settings.evening_reminder_enabled && !allDisabled && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm text-gray-600 dark:text-slate-400">Send at</label>
                <select
                  value={settings.evening_reminder_hour}
                  onChange={(e) => setSettings({ ...settings, evening_reminder_hour: Number(e.target.value) })}
                  className="px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Morning summary */}
          <div className={`px-4 py-4 ${allDisabled ? 'opacity-40' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900 dark:text-slate-100">Morning Summary</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">What your training partner did yesterday</div>
              </div>
              <Toggle
                checked={!!settings.morning_summary_enabled}
                onChange={(v) => setSettings({ ...settings, morning_summary_enabled: v ? 1 : 0 })}
                disabled={allDisabled}
              />
            </div>
            {settings.morning_summary_enabled && !allDisabled && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm text-gray-600 dark:text-slate-400">Send at</label>
                <select
                  value={settings.morning_summary_hour}
                  onChange={(e) => setSettings({ ...settings, morning_summary_hour: Number(e.target.value) })}
                  className="px-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {message && (
            <span
              className={`text-sm ${
                message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {message.text}
            </span>
          )}
        </div>

        {/* Test emails */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Test Emails</h3>
          <div className="flex gap-3">
            <button
              onClick={() => sendTestEmail('evening')}
              disabled={!!testingSending}
              className="px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {testingSending === 'evening' ? 'Sending...' : 'Send Test Reminder'}
            </button>
            <button
              onClick={() => sendTestEmail('morning')}
              disabled={!!testingSending}
              className="px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {testingSending === 'morning' ? 'Sending...' : 'Send Test Summary'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
            Test emails are sent to your notification email (or login email). Make sure to save settings first.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Toggle Component ---

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? 'bg-gradient-to-r from-blue-600 to-violet-600' : 'bg-gray-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
