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
  userName: string;
  weekLabel: string; // e.g. "3 Mar – 9 Mar 2026"
  exercises: WeeklyExerciseStat[];
  activities: WeeklyActivityStat[];
}

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

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'You are a friendly, concise fitness coach reviewing a user\'s weekly exercise data. Write 2-3 sentences of personalized insight. Be encouraging but honest. Mention specific exercises by name where relevant. If they missed days, gently acknowledge it and encourage. If they did well, celebrate their consistency. Keep it natural and conversational — no bullet points, headers, or emojis.',
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text?.trim() || null;
  } catch (err) {
    console.error('[Muscafit] AI insight generation failed:', err);
    return null;
  }
}
