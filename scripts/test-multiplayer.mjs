import { createClient } from '@supabase/supabase-js';

const url = 'https://dmwecxrhlbaptkkyngpu.supabase.co';
const key = 'sb_publishable_Ad3UneR1mG1ZkNgV1Zlpbw_KoNifwbK';
const lobby = `${url}/functions/v1/public-rooms`;
const code = `T${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const host = makeClient(), guest = makeClient();

async function identity(client) {
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}
async function call(session, body) {
  const response = await fetch(lobby, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.error || 'erro no lobby'}`);
  return data;
}
function subscribed(channel) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout no Realtime')), 12000);
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(new Error(`Realtime ${status}`)); }
    });
  });
}

let hostSession, guestSession, hostChannel, guestChannel;
try {
  [hostSession, guestSession] = await Promise.all([identity(host), identity(guest)]);
  await call(hostSession, { action: 'register', code, hostName: 'TESTE HOST', isPublic: true });
  await call(guestSession, { action: 'join', code, nickname: 'TESTE GUEST' });
  await Promise.all([call(hostSession, { action: 'heartbeat', code }), call(guestSession, { action: 'heartbeat', code })]);
  await call(hostSession, { action: 'unpublish', code });
  await Promise.all([host.realtime.setAuth(hostSession.access_token), guest.realtime.setAuth(guestSession.access_token)]);
  const config = { config: { private: true, broadcast: { self: false, ack: true } } };
  hostChannel = host.channel(`wind-racer-${code}`, config);
  let received;
  const receivedFinish = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('finishResult não chegou')), 12000);
    guestChannel = guest.channel(`wind-racer-${code}`, config).on('broadcast', { event: 'game' }, ({ payload }) => { received = payload; clearTimeout(timeout); resolve(); });
  });
  await Promise.all([subscribed(hostChannel), subscribed(guestChannel)]);
  await hostChannel.send({ type: 'broadcast', event: 'game', payload: { type: 'finishResult', id: hostSession.user.id, playerId: guestSession.user.id, finishOrder: 1, score: 34 } });
  await receivedFinish;
  if (received?.type !== 'finishResult' || received.finishOrder !== 1) throw new Error('payload final inválido');
  await Promise.all([call(hostSession, { action: 'heartbeat', code }), call(guestSession, { action: 'heartbeat', code })]);
  console.log(`OK sala ${code}: 2 usuários, heartbeat, unpublish e finishResult privado.`);
} finally {
  if (hostChannel) await host.removeChannel(hostChannel);
  if (guestChannel) await guest.removeChannel(guestChannel);
  if (guestSession) await call(guestSession, { action: 'leave', code }).catch(() => {});
  if (hostSession) await call(hostSession, { action: 'leave', code }).catch(() => {});
  host.realtime.disconnect();
  guest.realtime.disconnect();
}
