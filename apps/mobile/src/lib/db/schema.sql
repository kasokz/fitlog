-- FitLog database schema v2

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL,
  applied_at TEXT NOT NULL
);

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT NOT NULL,
  secondary_muscle_groups TEXT,
  equipment TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_compound INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Training Days
CREATE TABLE IF NOT EXISTS training_days (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_training_days_program_id ON training_days(program_id);

-- Exercise Assignments
CREATE TABLE IF NOT EXISTS exercise_assignments (
  id TEXT PRIMARY KEY,
  training_day_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  min_reps INTEGER NOT NULL DEFAULT 8,
  max_reps INTEGER NOT NULL DEFAULT 12,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_exercise_assignments_training_day_id ON exercise_assignments(training_day_id);
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_exercise_id ON exercise_assignments(exercise_id);

-- Mesocycles
CREATE TABLE IF NOT EXISTS mesocycles (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  weeks_count INTEGER NOT NULL DEFAULT 4,
  deload_week_number INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  current_week INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mesocycles_program_id ON mesocycles(program_id);
