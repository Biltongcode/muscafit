'use client';

import { useState, useEffect, useCallback } from 'react';
import NavBar from './NavBar';

interface Connection {
  id: number;
  name: string;
  email: string;
  connectedAt: string;
}

interface SentInvite {
  id: number;
  email: string;
  createdAt: string;
}

interface ReceivedInvite {
  id: number;
  token: string;
  inviterName: string;
  createdAt: string;
}

interface ConnectionsManagerProps {
  currentUserName: string;
}

export default function ConnectionsManager({ currentUserName }: ConnectionsManagerProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<ReceivedInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      setConnections(data.connections);
      setSentInvites(data.sentInvites);
      setReceivedInvites(data.receivedInvites);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    setMessage('');

    try {
      const res = await fetch('/api/connections/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to send invite');
      } else {
        setMessage('Invite sent!');
        setInviteEmail('');
        await fetchData();
      }
    } catch {
      setMessage('Failed to send invite');
    }
    setSending(false);
    setTimeout(() => setMessage(''), 4000);
  };

  const acceptInvite = async (inviteId: number) => {
    try {
      await fetch('/api/connections/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'accept' }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  const declineInvite = async (inviteId: number) => {
    try {
      await fetch('/api/connections/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'decline' }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to decline invite:', err);
    }
  };

  const cancelInvite = async (inviteId: number) => {
    try {
      await fetch(`/api/connections/invite?id=${inviteId}`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    }
  };

  const removeConnection = async (userId: number) => {
    try {
      await fetch(`/api/connections?userId=${userId}`, { method: 'DELETE' });
      setConfirmRemoveId(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to remove connection:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <NavBar currentUserName={currentUserName} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Connections</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</div>
        ) : (
          <>
            {/* Received invites */}
            {receivedInvites.length > 0 && (
              <div className="glass rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-green-50 dark:bg-green-500/10 border-b border-green-200 dark:border-green-500/30">
                  <h3 className="font-semibold text-sm text-green-900 dark:text-green-300">Pending Invites</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {receivedInvites.map(invite => (
                    <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{invite.inviterName}</span>
                        <span className="text-sm text-gray-500 dark:text-slate-400"> wants to connect</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptInvite(invite.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineInvite(invite.id)}
                          className="px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current connections */}
            <div className="glass rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-500/30">
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300">
                  My Connections ({connections.length})
                </h3>
              </div>
              {connections.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">
                  No connections yet. Invite someone below!
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {connections.map(conn => (
                    <div key={conn.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{conn.name}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{conn.email}</div>
                      </div>
                      {confirmRemoveId === conn.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => removeConnection(conn.id)}
                            className="px-2 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-2 py-1.5 text-xs text-gray-500 dark:text-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(conn.id)}
                          className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                          aria-label="Remove connection"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent invites */}
            {sentInvites.length > 0 && (
              <div className="glass rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-slate-300">Pending Sent Invites</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {sentInvites.map(invite => (
                    <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-slate-400">{invite.email}</div>
                      <button
                        onClick={() => cancelInvite(invite.id)}
                        className="px-3 py-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite form */}
            <div className="glass rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-500/10 border-b border-purple-200 dark:border-purple-500/30">
                <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-300">Invite Someone</h3>
              </div>
              <div className="px-4 py-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Enter their email address"
                    className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:placeholder-slate-500"
                    onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  />
                  <button
                    onClick={sendInvite}
                    disabled={sending || !inviteEmail.trim()}
                    className="px-4 py-2.5 text-sm font-medium gradient-btn rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sending ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
                {message && (
                  <p className={`mt-2 text-sm ${message.includes('sent') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {message}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                  They&apos;ll receive an email with a link to register and connect with you.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
