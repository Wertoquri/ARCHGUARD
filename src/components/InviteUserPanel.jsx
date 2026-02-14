import { useState } from 'react';
import { useAuthApi } from '../context/authApi';

// Minimal placeholder for sendInvite; replace with real implementation.
async function sendInvite({ userId, email }) {
  // implement actual invite call in real project
  return Promise.resolve({ ok: true, userId, email });
}

export default function InviteUserPanel() {
  const [email, setEmail] = useState('');
  const auth = useAuthApi();

  const handleInvite = async () => {
    if (!auth || !auth.isAuthenticated()) return;
    const user = auth.getUser();
    await sendInvite({ userId: user?.id, email });
    setEmail('');
  };

  return (
    <div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
      />
      <button onClick={handleInvite}>Invite</button>
    </div>
  );
}
