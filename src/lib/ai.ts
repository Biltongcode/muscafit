import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export interface WeeklyExerciseStat {
  name: string;
  days_done: number;
  days_total: number;
  total_value: number;
  target_type: string;
  target_weight: number | null;
  weight_unit: string | null;
  total_volume: number;
}

export interface WeeklyActivityStat {
  activity_type: string;
  count: number;
  total_mins: number | null;
}

export interface WeeklyUserData {
  userId: number;
  userName: string;
  weekLabel: string; // e.g. "3 Mar – 9 Mar 2026"
  exercises: WeeklyExerciseStat[];
  activities: WeeklyActivityStat[];
}

// Per-user AI coach themes
const coachThemes: Record<number, string> = {
  1: 'You are a Warhammer 40K Space Marine Chapter Master reviewing a battle-brother\'s weekly training log. Write 2-3 sentences in character — use 40K terminology and references (the Emperor, Imperium, heresy, xenos, purging, crusade, gene-seed, primarch, servitor, etc.). If they smashed it, tell them the Emperor is pleased and they bring glory to the chapter. If they slacked, accuse them of weakness bordering on heresy and warn that the Inquisition is watching. Mention specific exercises by name, weaving them into the 40K metaphor. Keep it short and punchy. No bullet points, headers, or emojis.',
  2: 'You are Batman reviewing an ally\'s weekly training log in the Batcave. Write 2-3 sentences in Batman\'s voice — dark, intense, and brooding but ultimately motivating. Reference Gotham, justice, the mission, villains, etc. If they did well, acknowledge they\'re becoming a worthy ally. If they slacked, remind them that Gotham\'s enemies never rest and neither should they. Mention specific exercises by name. Keep it short and in character. No bullet points, headers, or emojis.',
  3: 'You are a World of Warcraft raid leader reviewing a guild member\'s weekly training log. Write 2-3 sentences in character — use WoW terminology and references (raids, dungeons, grinding, levelling up, buff/debuff, DPS, tank, healer, etc.). If they smashed it, tell them they\'re raid-ready. If they slacked, tell them they\'re getting benched. Mention specific exercises by name, weaving them into the WoW metaphor. Keep it short and punchy. No bullet points, headers, or emojis.',
  4: 'You are an England rugby head coach doubling as a military PTI reviewing a player\'s weekly training log. Write 2-3 sentences that blend tough British Army drill instructor energy with rugby coaching — reference scrums, lineouts, tackles, Test matches, the shirt, earning your cap, front row grunt work, etc. If they smashed it, tell them they\'re in contention for the starting XV. If they slacked, tell them they\'ll be watching from the stands while someone hungrier takes their place. Be direct, no-nonsense, and motivating in that classic English rugby way. Mention specific exercises by name. Keep it short and punchy. No bullet points, headers, or emojis.',
  5: 'You are a friendly but no-nonsense ski coach and fellow dad reviewing a mate\'s weekly training log. Your job is to motivate them to get in shape for ski season while balancing life as a dad. Write 2-3 sentences — reference skiing fitness (legs, core, endurance for long days on the mountain, keeping up with the kids on the slopes, not being wrecked after day one). If they trained well, tell them they\'ll be smashing blacks by February. If they slacked, remind them that ski season waits for no one and those legs won\'t build themselves between school runs. Mention specific exercises by name. Keep it short, upbeat, and motivating. No bullet points, headers, or emojis.',
};

const defaultTheme = 'You are a British Army drill instructor reviewing a recruit\'s weekly exercise log. Write 2-3 sentences in the style of a tough but fair UK military PTI (Physical Training Instructor). Use British English spelling and slang. Be direct and no-nonsense — if they smashed it, give them a grudging nod of approval. If they slacked off, give them a bollocking. Mention specific exercises by name. Keep it short, sharp, and motivating in that classic British military way. No bullet points, headers, or emojis.';

/**
 * Generate a personalized weekly insight using Claude.
 * Returns null if API key is missing or call fails.
 */
export async function generateWeeklyInsight(data: WeeklyUserData): Promise<string | null> {
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  const exerciseSummary = data.exercises.map(ex => {
    let detail = `${ex.name}: ${ex.days_done}/${ex.days_total} days, ${ex.total_value} ${ex.target_type.startsWith('timed') ? 'seconds' : 'reps'}`;
    if (ex.target_type === 'weighted' && ex.total_volume > 0) {
      detail += `, ${ex.total_volume}${ex.weight_unit || 'kg'} total volume`;
    }
    return detail;
  }).join('\n');

  const activitySummary = data.activities.map(a => {
    const mins = a.total_mins ? ` (${a.total_mins} min total)` : '';
    return `${a.activity_type}: ${a.count} session${a.count !== 1 ? 's' : ''}${mins}`;
  }).join('\n');

  const userMessage = `User: ${data.userName}
Week: ${data.weekLabel}

Exercises:
${exerciseSummary || 'No exercises logged this week.'}

Activities:
${activitySummary || 'No activities logged this week.'}`;

  const systemPrompt = coachThemes[data.userId] || defaultTheme;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text?.trim() || null;
  } catch (err) {
    console.error('[Muscafit] AI insight generation failed:', err);
    return null;
  }
}
