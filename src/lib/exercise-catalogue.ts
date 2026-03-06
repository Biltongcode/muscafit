export interface CatalogueExercise {
  name: string;
  category: string;
  defaultTargetType: string;
}

export const EXERCISE_CATALOGUE: CatalogueExercise[] = [
  // Upper Body - Push
  { name: 'Press Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Diamond Press Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Wide Press Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Decline Press Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Pike Press Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Clap Press Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Bench Press', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Incline Bench Press', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Dumbbell Chest Press', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Overhead Press', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Dumbbell Shoulder Press', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Lateral Raises', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Front Raises', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Dips', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Tricep Extensions', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Tricep Dips', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Skull Crushers', category: 'Upper Body', defaultTargetType: 'weighted' },

  // Upper Body - Pull
  { name: 'Pull Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Chin Ups', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Inverted Rows', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Bent Over Rows', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Dumbbell Rows', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Lat Pulldowns', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Seated Cable Rows', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Bicep Curls', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Hammer Curls', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Face Pulls', category: 'Upper Body', defaultTargetType: 'reps' },
  { name: 'Shrugs', category: 'Upper Body', defaultTargetType: 'weighted' },
  { name: 'Upright Rows', category: 'Upper Body', defaultTargetType: 'weighted' },

  // Core
  { name: 'Crunches', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Bicycle Crunches', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Knee to Elbow Crunches', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Reverse Crunches', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Sit Ups', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Leg Raises', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Scissor Leg Raises', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Hanging Leg Raises', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Ankle Taps', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Russian Twists', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Plank', category: 'Core', defaultTargetType: 'timed' },
  { name: 'Side Planks', category: 'Core', defaultTargetType: 'timed_sets' },
  { name: 'Mountain Climbers', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Dead Bugs', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Flutter Kicks', category: 'Core', defaultTargetType: 'reps' },
  { name: 'V-Ups', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Ab Wheel Rollouts', category: 'Core', defaultTargetType: 'reps' },
  { name: 'Woodchoppers', category: 'Core', defaultTargetType: 'reps' },

  // Lower Body
  { name: 'Squats', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Barbell Squats', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Goblet Squats', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Front Squats', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Bulgarian Split Squats', category: 'Lower Body', defaultTargetType: 'reps_sets' },
  { name: 'Lunges', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Walking Lunges', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Reverse Lunges', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Deadlifts', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Romanian Deadlifts', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Sumo Deadlifts', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Leg Press', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Leg Curls', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Leg Extensions', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Calf Raises', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Glute Bridges', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Hip Thrusts', category: 'Lower Body', defaultTargetType: 'weighted' },
  { name: 'Wall Sits', category: 'Lower Body', defaultTargetType: 'timed' },
  { name: 'Step Ups', category: 'Lower Body', defaultTargetType: 'reps' },
  { name: 'Box Squats', category: 'Lower Body', defaultTargetType: 'weighted' },

  // Cardio / Full Body
  { name: 'Burpees', category: 'Cardio', defaultTargetType: 'reps' },
  { name: 'Jumping Jacks', category: 'Cardio', defaultTargetType: 'reps' },
  { name: 'High Knees', category: 'Cardio', defaultTargetType: 'timed' },
  { name: 'Jump Squats', category: 'Cardio', defaultTargetType: 'reps' },
  { name: 'Box Jumps', category: 'Cardio', defaultTargetType: 'reps' },
  { name: 'Skipping', category: 'Cardio', defaultTargetType: 'timed' },
  { name: 'Rowing Machine', category: 'Cardio', defaultTargetType: 'timed' },
  { name: 'Battle Ropes', category: 'Cardio', defaultTargetType: 'timed' },
  { name: 'Bear Crawls', category: 'Cardio', defaultTargetType: 'timed' },
  { name: 'Kettlebell Swings', category: 'Cardio', defaultTargetType: 'reps' },

  // Flexibility / Mobility
  { name: 'Stretching', category: 'Flexibility', defaultTargetType: 'timed' },
  { name: 'Yoga', category: 'Flexibility', defaultTargetType: 'timed' },
  { name: 'Foam Rolling', category: 'Flexibility', defaultTargetType: 'timed' },
  { name: 'Pilates', category: 'Flexibility', defaultTargetType: 'timed' },
];

export const CATALOGUE_CATEGORIES = [
  'Upper Body',
  'Core',
  'Lower Body',
  'Cardio',
  'Flexibility',
];

export function getCatalogueByCategory(): Map<string, CatalogueExercise[]> {
  const map = new Map<string, CatalogueExercise[]>();
  for (const cat of CATALOGUE_CATEGORIES) {
    map.set(cat, EXERCISE_CATALOGUE.filter(e => e.category === cat));
  }
  return map;
}

/** Normalise a name for matching: lowercase, strip hyphens/extra spaces */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Find a catalogue match for a given exercise name */
export function findCatalogueMatch(name: string): CatalogueExercise | undefined {
  const normalised = normaliseName(name);
  return EXERCISE_CATALOGUE.find(e => normaliseName(e.name) === normalised);
}
