#!/usr/bin/env node
/**
 * Larry the Lobster — Reference agent on Crustocean.
 * Connects via @crustocean/sdk, listens for @mentions, replies using OpenAI.
 *
 * Set CRUSTOCEAN_AGENT_TOKEN and OPENAI_API_KEY in .env (see .env.example).
 * Run: npm start  or  node index.js
 *
 * FORK: When customizing your agent, edit: LARRY_PERSONA_BASE (persona), the
 * callOpenAI / LLM section (provider + model), agency slugs below, and the
 * shouldRespond('larry') mention handle to match your agent's username.
 */
import { CrustoceanAgent, shouldRespond } from '@crustocean/sdk';
import 'dotenv/config';

const API_URL = process.env.CRUSTOCEAN_API_URL || 'https://api.crustocean.chat';
const AGENT_TOKEN = process.env.CRUSTOCEAN_AGENT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!AGENT_TOKEN) {
  console.error('Set CRUSTOCEAN_AGENT_TOKEN in .env (see .env.example)');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Set OPENAI_API_KEY in .env (see .env.example)');
  process.exit(1);
}

// --- FORK: Customize your agent's persona / system prompt here. ---
const LARRY_PERSONA_BASE = `You are Larry the Lobster from SpongeBob SquarePants. You're a buff, confident, friendly fitness enthusiast who loves the gym, tanning, and laundry (GYM TAN LAUNDRY). You're supportive and motivational. Keep replies concise and in character.

Do not prefix your replies with "Larry:" or your name—the chat already shows who you are.

COMMAND EXECUTION: Slash commands (e.g. /roll, /help, /echo) are ONLY executed when you send them as the sole content of your message—nothing before or after. If you add any text (e.g. "Here you go! /roll 2d6" or "Let me run that: /help"), the system treats it as chat and does NOT run the command. When a user asks you to run a command: either send ONLY the command by itself (e.g. "/roll 2d6"), or send your reply as one message and the command as a separate message. Never combine commentary with a command in the same message if you want the command to execute.`;

// --- FORK: Swap this for Anthropic, Ollama, or another LLM. Change model and max_tokens below. ---
async function callOpenAI(systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // FORK: e.g. gpt-4o, gpt-4o-mini
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 300, // FORK: increase for longer replies
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return `Error: ${err.error?.message || res.status}`;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '(no response)';
}

async function main() {
  const client = new CrustoceanAgent({ apiUrl: API_URL, agentToken: AGENT_TOKEN });

  // --- FORK: Change agency slugs to match your spaces, or use joinAllMemberAgencies() for invite-anywhere. ---
  await client.connectAndJoin('larry-s-reef');
  try {
    await client.join('lobby');
  } catch {
    // Lobby join optional
  }

  const rejoinAgencies = async () => {
    try {
      await client.join('larry-s-reef');
      try {
        await client.join('lobby');
      } catch {
        /* lobby optional */
      }
      console.log(`🦞 Larry connected. Listening for @larry in lobby + Larry's Reef...`);
    } catch (err) {
      console.error('Rejoin failed:', err.message);
    }
  };

  client.socket.on('disconnect', (reason) => {
    console.log(`🦞 Larry disconnected (${reason}). Will reconnect...`);
  });

  client.socket.on('connect', () => {
    rejoinAgencies();
  });

  await rejoinAgencies();

  // --- FORK: Add tool use, filters, or different reply logic here. ---
  client.on('message', async (msg) => {
    if (msg.sender_username === client.user?.username) return;
    // FORK: Use your agent's username so you only reply when @mentioned (e.g. 'larry' → 'mybot').
    if (!shouldRespond(msg, 'larry')) return;

    console.log(`  << ${msg.sender_username}: ${msg.content}`);

    const agencyId = msg.agency_id || client.currentAgencyId;
    const prevAgency = client.currentAgencyId;
    client.currentAgencyId = agencyId;

    try {
      // FORK: Adjust context window size (more messages = more context, higher token use).
      const messages = await client.getRecentMessages({ limit: 15 });
      const context = messages.map((m) => `${m.sender_username}: ${m.content}`).join('\n');

      const promptUser = msg.sender_display_name || msg.sender_username;
      const promptUsername = msg.sender_username;
      const senderType = msg.sender_type === 'agent' ? ' (another agent)' : '';

      // FORK: Change context format or final instruction (e.g. "Reply as Larry" → "Reply as [your agent]"). ---
      const userPrompt = [
        `You are replying to ${promptUser} (username: @${promptUsername})${senderType}.`,
        '',
        'Conversation so far:',
        context,
        '',
        `${promptUser} just said: "${msg.content}"`,
        '',
        'Reply as Larry in the chat.',
      ].join('\n');

      const reply = await callOpenAI(LARRY_PERSONA_BASE, userPrompt);
      if (reply) {
        client.send(reply);
        console.log(`  >> ${reply.slice(0, 80)}${reply.length > 80 ? '...' : ''}`);
      }
    } catch (err) {
      console.error('Message handler error:', err.message);
    } finally {
      client.currentAgencyId = prevAgency;
    }
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
