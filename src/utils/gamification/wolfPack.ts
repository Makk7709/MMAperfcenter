/**
 * Wolf Pack Gamification System
 * 
 * Theme: Meute de Loups (Wolf Pack)
 * Progression: Louveteau → Loup Garou
 * 
 * "La force du loup, c'est la meute. La force de la meute, c'est le loup."
 */

// ============================================
// TYPES
// ============================================

export interface WolfRank {
  level: number;
  name: string;
  icon: string;
  xpRequired: number;
  description: string;
  unlocks: string[];
}

export interface WolfBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: BadgeCategory;
  condition: BadgeCondition;
  xpReward: number;
}

export interface WolfSound {
  wolf: string;
  classic: string;
}

export type BadgeCategory = 'milestone' | 'streak' | 'combat' | 'achievement' | 'special';

export interface BadgeCondition {
  type: string;
  value: number;
}

export interface UserStats {
  totalWorkouts?: number;
  streakDays?: number;
  totalStrikes?: number;
  personalRecords?: number;
  lateNightWorkouts?: number;
  sparringAnalyses?: number;
  totalXP?: number;
}

export type SoundPreference = 'wolf' | 'classic';
export type SoundEvent = 'round_end' | 'workout_complete' | 'pr_achieved' | 'badge_unlocked' | 'streak_maintained';
export type ActionType = 'workout_completed' | 'exercise_completed' | 'set_completed' | 'pr_achieved' | 'streak_day' | 'sparring_analyzed';
export type Intensity = 'light' | 'moderate' | 'intense';

// ============================================
// RANK SYSTEM
// ============================================

export const WOLF_RANKS: WolfRank[] = [
  {
    level: 1,
    name: 'Louveteau',
    icon: '🐺',
    xpRequired: 0,
    description: 'Tu fais tes premiers pas dans la meute',
    unlocks: ['Accès de base'],
  },
  {
    level: 2,
    name: 'Loup Solitaire',
    icon: '🐺',
    xpRequired: 500,
    description: 'Tu chasses seul mais ta force grandit',
    unlocks: ['Sons de hurlement'],
  },
  {
    level: 3,
    name: 'Chasseur de Meute',
    icon: '🐺',
    xpRequired: 1500,
    description: 'Tu coordonnes tes attaques avec la meute',
    unlocks: ['Badges spéciaux'],
  },
  {
    level: 4,
    name: 'Loup de Guerre',
    icon: '🐺',
    xpRequired: 4000,
    description: 'Tes crocs sont redoutés sur le territoire',
    unlocks: ['Thèmes visuels'],
  },
  {
    level: 5,
    name: 'Beta',
    icon: '🐺',
    xpRequired: 8000,
    description: 'Tu es le bras droit de l\'Alpha',
    unlocks: ['Timer personnalisé'],
  },
  {
    level: 6,
    name: 'Alpha',
    icon: '🐺',
    xpRequired: 15000,
    description: 'Tu diriges la meute avec sagesse et force',
    unlocks: ['Création de meute'],
  },
  {
    level: 7,
    name: 'Loup Garou',
    icon: '🌕',
    xpRequired: 30000,
    description: 'La légende de la meute. Transformation complète.',
    unlocks: ['Statut légendaire', 'Badge Pleine Lune'],
  },
];

export function calculateRank(xp: number): WolfRank {
  // Find the highest rank the user qualifies for
  for (let i = WOLF_RANKS.length - 1; i >= 0; i--) {
    if (xp >= WOLF_RANKS[i].xpRequired) {
      return WOLF_RANKS[i];
    }
  }
  return WOLF_RANKS[0];
}

export function getNextRank(currentRank: WolfRank): WolfRank | null {
  const currentIndex = WOLF_RANKS.findIndex(r => r.level === currentRank.level);
  if (currentIndex === -1 || currentIndex === WOLF_RANKS.length - 1) {
    return null;
  }
  return WOLF_RANKS[currentIndex + 1];
}

export function getXPForNextRank(currentXP: number): number {
  const currentRank = calculateRank(currentXP);
  const nextRank = getNextRank(currentRank);
  
  if (!nextRank) {
    return 0; // Max rank reached
  }
  
  return nextRank.xpRequired - currentXP;
}

export function getRankProgress(xp: number): number {
  const currentRank = calculateRank(xp);
  const nextRank = getNextRank(currentRank);
  
  if (!nextRank) {
    return 100; // Max rank
  }
  
  const xpInCurrentRank = xp - currentRank.xpRequired;
  const xpNeededForNextRank = nextRank.xpRequired - currentRank.xpRequired;
  
  if (xpNeededForNextRank === 0) return 0;
  
  return Math.round((xpInCurrentRank / xpNeededForNextRank) * 100);
}

// ============================================
// XP SYSTEM
// ============================================

export const XP_REWARDS: Record<ActionType, number> = {
  workout_completed: 50,
  exercise_completed: 10,
  set_completed: 5,
  pr_achieved: 100,
  streak_day: 25,
  sparring_analyzed: 30,
};

interface XPCalculationOptions {
  streakDays?: number;
  intensity?: Intensity;
}

export function calculateXPForAction(
  action: ActionType,
  options: XPCalculationOptions = {}
): number {
  const baseXP = XP_REWARDS[action];
  let multiplier = 1;
  
  // Streak bonus (up to 1.5x)
  if (options.streakDays && options.streakDays > 1) {
    const streakBonus = Math.min(0.5, options.streakDays * 0.05);
    multiplier += streakBonus;
  }
  
  // Intensity bonus
  if (options.intensity) {
    switch (options.intensity) {
      case 'light':
        multiplier *= 0.8;
        break;
      case 'moderate':
        multiplier *= 1.0;
        break;
      case 'intense':
        multiplier *= 1.3;
        break;
    }
  }
  
  // Cap at 5x base XP
  const maxMultiplier = 5;
  multiplier = Math.min(multiplier, maxMultiplier);
  
  return Math.round(baseXP * multiplier);
}

// ============================================
// BADGE SYSTEM
// ============================================

export const WOLF_BADGES: WolfBadge[] = [
  {
    id: 'premiere_lune',
    name: 'Première Lune',
    icon: '🌙',
    description: 'Tu as hurlé pour la première fois - Premier entraînement',
    category: 'milestone',
    condition: { type: 'totalWorkouts', value: 1 },
    xpReward: 50,
  },
  {
    id: 'feu_meute',
    name: 'Feu de Meute',
    icon: '🔥',
    description: 'La flamme de la meute brûle en toi - 7 jours consécutifs',
    category: 'streak',
    condition: { type: 'streakDays', value: 7 },
    xpReward: 100,
  },
  {
    id: 'crocs_aceres',
    name: 'Crocs Acérés',
    icon: '⚡',
    description: 'Tes crocs sont redoutables - 100 coups portés',
    category: 'combat',
    condition: { type: 'totalStrikes', value: 100 },
    xpReward: 150,
  },
  {
    id: 'sommet_territoire',
    name: 'Sommet du Territoire',
    icon: '🏔️',
    description: 'Tu domines ton territoire - Record personnel battu',
    category: 'achievement',
    condition: { type: 'personalRecords', value: 1 },
    xpReward: 75,
  },
  {
    id: 'nuit_chasse',
    name: 'Nuit de Chasse',
    icon: '🌑',
    description: 'La nuit t\'appartient - Entraînement après 22h',
    category: 'special',
    condition: { type: 'lateNightWorkouts', value: 1 },
    xpReward: 100,
  },
  {
    id: 'trace_indelebile',
    name: 'Trace Indélébile',
    icon: '🐾',
    description: 'Ta trace marque le territoire - 30 jours consécutifs',
    category: 'streak',
    condition: { type: 'streakDays', value: 30 },
    xpReward: 300,
  },
  {
    id: 'predateur',
    name: 'Prédateur',
    icon: '🦴',
    description: 'La proie ne t\'échappe jamais - 50 entraînements',
    category: 'milestone',
    condition: { type: 'totalWorkouts', value: 50 },
    xpReward: 250,
  },
  {
    id: 'regard_loup',
    name: 'Regard du Loup',
    icon: '👁️',
    description: 'Tu vois ce que les autres ne voient pas - 10 analyses sparring',
    category: 'combat',
    condition: { type: 'sparringAnalyses', value: 10 },
    xpReward: 200,
  },
  {
    id: 'pleine_lune',
    name: 'Pleine Lune',
    icon: '🌕',
    description: 'La transformation est complète - Rang Loup Garou atteint',
    category: 'achievement',
    condition: { type: 'totalXP', value: 30000 },
    xpReward: 500,
  },
];

export function checkBadgeUnlock(
  userStats: UserStats,
  ownedBadgeIds: string[]
): WolfBadge[] {
  const newBadges: WolfBadge[] = [];
  
  for (const badge of WOLF_BADGES) {
    // Skip if already owned
    if (ownedBadgeIds.includes(badge.id)) {
      continue;
    }
    
    // Check condition
    const statValue = userStats[badge.condition.type as keyof UserStats] ?? 0;
    if (statValue >= badge.condition.value) {
      newBadges.push(badge);
    }
  }
  
  return newBadges;
}

export function getBadgesByCategory(category: string): WolfBadge[] {
  return WOLF_BADGES.filter(badge => badge.category === category);
}

// ============================================
// STREAK SYSTEM
// ============================================

export function calculateStreak(workoutDates: string[]): number {
  if (workoutDates.length === 0) {
    return 0;
  }
  
  // Sort dates descending (most recent first)
  const sortedDates = [...workoutDates]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const mostRecent = new Date(sortedDates[0]);
  mostRecent.setHours(0, 0, 0, 0);
  
  // Check if most recent workout is today or yesterday
  const daysSinceLastWorkout = Math.floor(
    (today.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000)
  );
  
  if (daysSinceLastWorkout > 1) {
    return 0; // Streak broken
  }
  
  // Count consecutive days
  let streak = 1;
  let currentDate = mostRecent;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i]);
    prevDate.setHours(0, 0, 0, 0);
    
    const dayDiff = Math.floor(
      (currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    if (dayDiff === 1) {
      streak++;
      currentDate = prevDate;
    } else if (dayDiff > 1) {
      break; // Streak broken
    }
    // dayDiff === 0 means same day, skip
  }
  
  return streak;
}

export function getStreakBonus(streakDays: number): number {
  if (streakDays <= 1) {
    return 1;
  }
  
  // Bonus increases logarithmically, capped at 3x
  // 1 day = 1x, 7 days ≈ 1.5x, 30 days ≈ 2x, 100+ days ≈ 3x
  const bonus = 1 + Math.log10(streakDays) * 0.5;
  return Math.min(bonus, 3);
}

// ============================================
// MOTIVATIONAL MESSAGES
// ============================================

const MOTIVATIONAL_MESSAGES = [
  "Le loup ne se soucie pas de l'avis des moutons.",
  "Une meute qui s'entraîne ensemble, chasse ensemble.",
  "Même le loup solitaire a besoin de sa meute.",
  "La force du loup, c'est la meute. La force de la meute, c'est le loup.",
  "Hurle à la lune, même si tu es seul.",
  "Chaque muscle que tu construis est un croc de plus.",
  "Le territoire ne se conquiert pas en restant dans la tanière.",
  "Un loup affamé est plus dangereux qu'un lion repu.",
  "Ta meute compte sur toi. Ne les déçois pas.",
  "Les loups n'abandonnent jamais leur proie.",
  "Chaque round est une chasse. Chaque round est une victoire.",
  "Le hurlement du loup fait trembler la forêt entière.",
];

export function getMotivationalMessage(): string {
  const index = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[index];
}

export function getRankUpMessage(newRank: WolfRank): string {
  const messages = [
    `🐺 Félicitations ! Tu es devenu ${newRank.name} !`,
    `🌙 Incroyable ascension ! Tu as évolué en ${newRank.name} !`,
    `⚡ La meute célèbre ton nouveau rang : ${newRank.name} !`,
    `🔥 Bravo, guerrier ! Tu as atteint le rang de ${newRank.name} !`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================
// SOUND SYSTEM
// ============================================

export const WOLF_SOUNDS: Record<SoundEvent, WolfSound> = {
  round_end: {
    wolf: 'howl_short',
    classic: 'bell',
  },
  workout_complete: {
    wolf: 'howl_long',
    classic: 'success_ding',
  },
  pr_achieved: {
    wolf: 'pack_howl',
    classic: 'fanfare',
  },
  badge_unlocked: {
    wolf: 'growl_howl',
    classic: 'star_chime',
  },
  streak_maintained: {
    wolf: 'moon_howl',
    classic: 'fire_crackle',
  },
};

export function getSoundForEvent(
  event: SoundEvent,
  preference: SoundPreference = 'wolf'
): string {
  return WOLF_SOUNDS[event][preference];
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Ranks
  WOLF_RANKS,
  calculateRank,
  getNextRank,
  getXPForNextRank,
  getRankProgress,
  
  // XP
  XP_REWARDS,
  calculateXPForAction,
  
  // Badges
  WOLF_BADGES,
  checkBadgeUnlock,
  getBadgesByCategory,
  
  // Streaks
  calculateStreak,
  getStreakBonus,
  
  // Messages
  getMotivationalMessage,
  getRankUpMessage,
  
  // Sounds
  WOLF_SOUNDS,
  getSoundForEvent,
};

