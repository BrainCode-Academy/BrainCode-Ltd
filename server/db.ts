import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.ts';
import { hashPassword, parseJsonSafe, type AuthUser, type UserEntitlement } from './security.ts';
import { seedExpandedCurriculum } from './curriculum_seed.ts';
import { seedCurriculumBlueprintsAndStarterDrafts } from './curriculum_blueprints.ts';
import { seedPriority10Curriculum } from './curriculum_priority10_seeder.ts';
import { seedPhase21Curriculum } from './curriculum_phase21_seeder.ts';
import { seedTechnologyLearningCentres } from './technology_learning_centre.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = process.env.BCSCHOOLS_DB_PATH || path.join(dataDir, 'bcschools.db');
const dbParent = path.dirname(dbFile);
if (!fs.existsSync(dbParent)) {
  fs.mkdirSync(dbParent, { recursive: true });
}

export const db = new DatabaseSync(dbFile);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS brand_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    product_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    support_email TEXT NOT NULL,
    hero_headline TEXT NOT NULL,
    hero_subheadline TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'learner',
    status TEXT NOT NULL DEFAULT 'active',
    email_verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    reset_token TEXT,
    reset_expires TEXT,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    skill_level TEXT DEFAULT 'beginner',
    interests_json TEXT DEFAULT '[]',
    goals_json TEXT DEFAULT '[]',
    preferred_techs_json TEXT DEFAULT '[]',
    external_links_json TEXT DEFAULT '{}',
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT DEFAULT '',
    public_profile INTEGER NOT NULL DEFAULT 1,
    show_activity INTEGER NOT NULL DEFAULT 1,
    allow_messages INTEGER NOT NULL DEFAULT 1,
    theme_preference TEXT NOT NULL DEFAULT 'dark',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    remember_me INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    audience_label TEXT NOT NULL,
    description TEXT NOT NULL,
    monthly_price_cents INTEGER NOT NULL,
    yearly_price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    features_json TEXT NOT NULL,
    limits_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_ref TEXT DEFAULT '',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id TEXT,
    plan_id TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    reference TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS technologies (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon_symbol TEXT NOT NULL DEFAULT '</>',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    overview_markdown TEXT DEFAULT '',
    is_popular INTEGER NOT NULL DEFAULT 0,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    difficulty TEXT NOT NULL DEFAULT 'Beginner',
    brand_color TEXT NOT NULL DEFAULT '#0A84FF',
    content_status TEXT NOT NULL DEFAULT 'coming_soon',
    featured_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS learning_paths (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    estimated_hours INTEGER NOT NULL,
    target_role TEXT DEFAULT '',
    course_ids_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    technology_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    objectives_json TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    estimated_hours INTEGER NOT NULL,
    instructor_id TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    is_published INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (technology_id) REFERENCES technologies(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    topic_name TEXT DEFAULT '',
    summary TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    code_example TEXT DEFAULT '',
    language TEXT DEFAULT 'javascript',
    video_url TEXT DEFAULT '',
    downloadable_resource TEXT DEFAULT '',
    access_tier TEXT NOT NULL DEFAULT 'free',
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    exercise_prompt TEXT DEFAULT '',
    starter_code TEXT DEFAULT '',
    solution_hint TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published',
    version INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    enrolled_at TEXT NOT NULL,
    last_lesson_id TEXT DEFAULT '',
    PRIMARY KEY (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    bookmarked INTEGER NOT NULL DEFAULT 0,
    time_spent_sec INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT DEFAULT '',
    PRIMARY KEY (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    lesson_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'untimed',
    time_limit_sec INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    questions_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assessment_attempts (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    feedback_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'graded',
    instructor_notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_threshold INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    awarded_at TEXT NOT NULL,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    language TEXT NOT NULL DEFAULT 'html',
    files_json TEXT NOT NULL,
    lesson_id TEXT DEFAULT '',
    is_collaborative INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collab_sessions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    max_participants INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collab_participants (
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    joined_at TEXT NOT NULL,
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES collab_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS collab_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES collab_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    workspace_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    repo_url TEXT DEFAULT '',
    live_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    screenshots_json TEXT NOT NULL DEFAULT '[]',
    visibility TEXT NOT NULL DEFAULT 'private',
    contributors_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    privacy TEXT NOT NULL DEFAULT 'public',
    rules_json TEXT NOT NULL DEFAULT '[]',
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS community_members (
    community_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    joined_at TEXT NOT NULL,
    PRIMARY KEY (community_id, user_id),
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    resource_url TEXT DEFAULT '',
    likes_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS community_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    reviewed_by TEXT DEFAULT '',
    resolution_note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    UNIQUE (requester_id, recipient_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    content TEXT NOT NULL,
    attachment_name TEXT DEFAULT '',
    read_at TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT DEFAULT '',
    read_at TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notification_prefs (
    user_id TEXT PRIMARY KEY,
    email_messages INTEGER NOT NULL DEFAULT 1,
    email_courses INTEGER NOT NULL DEFAULT 1,
    email_billing INTEGER NOT NULL DEFAULT 1,
    in_app_community INTEGER NOT NULL DEFAULT 1,
    in_app_assignments INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    technology TEXT NOT NULL,
    type TEXT NOT NULL,
    summary TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    code_snippet TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    downloadable_filename TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    context_type TEXT NOT NULL,
    prompt_tokens_est INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    daily_free_limit INTEGER NOT NULL,
    daily_premium_limit INTEGER NOT NULL,
    model_name TEXT NOT NULL,
    system_guardrail TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entitlements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    starts_at TEXT NOT NULL,
    ends_at TEXT DEFAULT '',
    grant_ref TEXT DEFAULT '',
    granted_by TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_entitlements_user_status ON entitlements(user_id, status);

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed',
    processed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT DEFAULT '',
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_title TEXT NOT NULL,
    learner_name TEXT NOT NULL,
    certificate_code TEXT UNIQUE NOT NULL,
    issued_at TEXT NOT NULL,
    UNIQUE (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contact_inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS course_topics (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lesson_content_blocks (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    block_type TEXT NOT NULL,
    title TEXT DEFAULT '',
    content_markdown TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS code_examples (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    language TEXT NOT NULL DEFAULT 'javascript',
    code TEXT NOT NULL,
    expected_output TEXT DEFAULT '',
    is_runnable INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    module_id TEXT DEFAULT '',
    lesson_id TEXT DEFAULT '',
    technology_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    exercise_type TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'Beginner',
    prompt TEXT NOT NULL,
    starter_code TEXT DEFAULT '',
    options_json TEXT NOT NULL DEFAULT '[]',
    correct_answer TEXT DEFAULT '',
    validation_rule_json TEXT NOT NULL DEFAULT '{}',
    explanation TEXT DEFAULT '',
    hint_text TEXT DEFAULT '',
    xp_reward INTEGER NOT NULL DEFAULT 25,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exercise_submissions (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    answer_text TEXT DEFAULT '',
    code_submitted TEXT DEFAULT '',
    is_correct INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    feedback_text TEXT DEFAULT '',
    instructor_feedback TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'graded',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    module_id TEXT DEFAULT '',
    technology_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions_markdown TEXT NOT NULL,
    requirements_json TEXT NOT NULL DEFAULT '[]',
    starter_files_json TEXT NOT NULL DEFAULT '{}',
    rubric_json TEXT NOT NULL DEFAULT '[]',
    difficulty TEXT NOT NULL DEFAULT 'Intermediate',
    xp_reward INTEGER NOT NULL DEFAULT 120,
    due_days INTEGER NOT NULL DEFAULT 7,
    created_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignment_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    submission_text TEXT DEFAULT '',
    repo_url TEXT DEFAULT '',
    live_url TEXT DEFAULT '',
    files_json TEXT NOT NULL DEFAULT '{}',
    workspace_id TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'submitted',
    score INTEGER DEFAULT 0,
    instructor_feedback TEXT DEFAULT '',
    reviewed_by TEXT DEFAULT '',
    reviewed_at TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_templates (
    id TEXT PRIMARY KEY,
    technology_id TEXT DEFAULT '',
    learning_path_id TEXT DEFAULT '',
    course_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'Web Application',
    difficulty TEXT NOT NULL DEFAULT 'Intermediate',
    estimated_hours INTEGER NOT NULL DEFAULT 6,
    summary TEXT NOT NULL,
    requirements_json TEXT NOT NULL DEFAULT '[]',
    starter_files_json TEXT NOT NULL DEFAULT '{}',
    deliverables_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_template_progress (
    user_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    checked_items_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, template_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS learning_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    note_text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS course_reviews (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, course_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS path_certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    learning_path_id TEXT NOT NULL,
    path_title TEXT NOT NULL,
    learner_name TEXT NOT NULL,
    certificate_code TEXT UNIQUE NOT NULL,
    issued_at TEXT NOT NULL,
    UNIQUE (user_id, learning_path_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS curriculum_blueprints (
    id TEXT PRIMARY KEY,
    technology_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    target_level TEXT NOT NULL DEFAULT 'Beginner to Intermediate',
    summary TEXT NOT NULL DEFAULT '',
    module_outline_json TEXT NOT NULL DEFAULT '[]',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_by TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS completeness_rules (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    config_json TEXT NOT NULL,
    require_independent_review INTEGER NOT NULL DEFAULT 0,
    ai_daily_generation_limit INTEGER NOT NULL DEFAULT 80,
    updated_by TEXT DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_quality_checks (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    validation_status TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    missing_sections_json TEXT NOT NULL DEFAULT '[]',
    educational_warnings_json TEXT NOT NULL DEFAULT '[]',
    technical_warnings_json TEXT NOT NULL DEFAULT '[]',
    checks_detail_json TEXT NOT NULL DEFAULT '[]',
    checked_by TEXT DEFAULT '',
    checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_review_history (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    from_status TEXT DEFAULT '',
    to_status TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    assigned_to_id TEXT DEFAULT '',
    comment TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_revisions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    snapshot_json TEXT NOT NULL,
    change_summary TEXT DEFAULT '',
    editor_id TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    job_type TEXT NOT NULL DEFAULT 'batch_blueprint',
    status TEXT NOT NULL DEFAULT 'queued',
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    skipped_items INTEGER NOT NULL DEFAULT 0,
    tokens_used_est INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL DEFAULT '{}',
    error_message TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS ai_generation_job_items (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    technology_id TEXT NOT NULL,
    blueprint_id TEXT DEFAULT '',
    course_id TEXT DEFAULT '',
    module_id TEXT DEFAULT '',
    module_title TEXT NOT NULL,
    lesson_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    generated_lesson_id TEXT DEFAULT '',
    tokens_used_est INTEGER NOT NULL DEFAULT 0,
    error_message TEXT DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES ai_generation_jobs(id) ON DELETE CASCADE
  );
`);

function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

ensureColumn('users', 'theme_preference', `TEXT NOT NULL DEFAULT 'dark'`);
ensureColumn('users', 'daily_goal_minutes', `INTEGER NOT NULL DEFAULT 30`);
ensureColumn('technologies', 'icon_symbol', `TEXT NOT NULL DEFAULT '</>'`);
ensureColumn('technologies', 'sort_order', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('technologies', 'is_published', `INTEGER NOT NULL DEFAULT 1`);
ensureColumn('technologies', 'overview_markdown', `TEXT DEFAULT ''`);
ensureColumn('technologies', 'is_popular', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('technologies', 'aliases_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('technologies', 'difficulty', `TEXT NOT NULL DEFAULT 'Beginner'`);
ensureColumn('technologies', 'brand_color', `TEXT NOT NULL DEFAULT '#0A84FF'`);
ensureColumn('technologies', 'content_status', `TEXT NOT NULL DEFAULT 'coming_soon'`);
ensureColumn('technologies', 'featured_order', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('technologies', 'created_at', `TEXT NOT NULL DEFAULT ''`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_technologies_pub_sort ON technologies(is_published, sort_order, name);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_technologies_category ON technologies(category_id, is_published);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_technologies_featured ON technologies(is_popular, featured_order);`);
ensureColumn('learning_paths', 'target_role', `TEXT DEFAULT ''`);
ensureColumn('learning_paths', 'overview', `TEXT DEFAULT ''`);
ensureColumn('learning_paths', 'audience', `TEXT DEFAULT ''`);
ensureColumn('learning_paths', 'prerequisites_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('learning_paths', 'objectives_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('learning_paths', 'milestones_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('learning_paths', 'project_template_ids_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('learning_paths', 'is_published', `INTEGER NOT NULL DEFAULT 1`);
ensureColumn('courses', 'status', `TEXT NOT NULL DEFAULT 'published'`);
ensureColumn('courses', 'prerequisites_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('courses', 'completion_rule', `TEXT NOT NULL DEFAULT 'all_lessons'`);
ensureColumn('courses', 'workflow_status', `TEXT NOT NULL DEFAULT 'published'`);
ensureColumn('lessons', 'topic_name', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'topic_id', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'status', `TEXT NOT NULL DEFAULT 'published'`);
ensureColumn('lessons', 'workflow_status', `TEXT NOT NULL DEFAULT 'published'`);
ensureColumn('lessons', 'version', `INTEGER NOT NULL DEFAULT 1`);
ensureColumn('lessons', 'prerequisites_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('lessons', 'objectives_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('assessments', 'passing_score_pct', `INTEGER NOT NULL DEFAULT 70`);
ensureColumn('assessments', 'randomize_questions', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('assessments', 'max_attempts', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('assessment_attempts', 'passed', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('assessment_attempts', 'percentage', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('projects', 'template_id', `TEXT DEFAULT ''`);
ensureColumn('projects', 'status', `TEXT NOT NULL DEFAULT 'draft'`);
ensureColumn('projects', 'instructor_feedback', `TEXT DEFAULT ''`);
ensureColumn('projects', 'reviewed_by', `TEXT DEFAULT ''`);
ensureColumn('projects', 'reviewed_at', `TEXT DEFAULT ''`);
ensureColumn('learning_paths', 'workflow_status', `TEXT NOT NULL DEFAULT 'published'`);
ensureColumn('learning_paths', 'is_ai_generated', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('learning_paths', 'completeness_score', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('learning_paths', 'updated_at', `TEXT DEFAULT ''`);
ensureColumn('courses', 'assigned_instructor_id', `TEXT DEFAULT ''`);
ensureColumn('courses', 'is_ai_generated', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('courses', 'review_notes', `TEXT DEFAULT ''`);
ensureColumn('courses', 'reviewed_by', `TEXT DEFAULT ''`);
ensureColumn('courses', 'reviewed_at', `TEXT DEFAULT ''`);
ensureColumn('courses', 'completeness_score', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('courses', 'qa_status', `TEXT NOT NULL DEFAULT 'pending'`);
ensureColumn('courses', 'updated_at', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'author_id', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'assigned_reviewer_id', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'is_ai_generated', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('lessons', 'qa_status', `TEXT NOT NULL DEFAULT 'pending'`);
ensureColumn('lessons', 'review_notes', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'reviewed_by', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'reviewed_at', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'source_references_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('lessons', 'updated_at', `TEXT DEFAULT ''`);

ensureColumn('certificates', 'status', `TEXT NOT NULL DEFAULT 'active'`);
ensureColumn('certificates', 'revoked_at', `TEXT DEFAULT ''`);
ensureColumn('certificates', 'revoked_by', `TEXT DEFAULT ''`);
ensureColumn('certificates', 'revocation_reason', `TEXT DEFAULT ''`);
ensureColumn('path_certificates', 'status', `TEXT NOT NULL DEFAULT 'active'`);
ensureColumn('path_certificates', 'revoked_at', `TEXT DEFAULT ''`);
ensureColumn('path_certificates', 'revoked_by', `TEXT DEFAULT ''`);
ensureColumn('path_certificates', 'revocation_reason', `TEXT DEFAULT ''`);

// Phase 24 Additive Curriculum Intelligence, Progression, Competency & Rubric Columns
ensureColumn('courses', 'learning_outcomes_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('courses', 'skill_level', `TEXT NOT NULL DEFAULT 'Beginner'`);
ensureColumn('courses', 'progression_model', `TEXT NOT NULL DEFAULT 'tiered_progression'`);
ensureColumn('courses', 'quality_status', `TEXT NOT NULL DEFAULT 'not_audited'`);
ensureColumn('courses', 'min_certificate_score', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('courses', 'require_practical_projects', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('courses', 'technical_verified', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('courses', 'technical_verified_by', `TEXT DEFAULT ''`);
ensureColumn('courses', 'technical_verified_at', `TEXT DEFAULT ''`);

ensureColumn('modules', 'prerequisites_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('modules', 'difficulty_band', `TEXT DEFAULT ''`);
ensureColumn('modules', 'estimated_minutes', `INTEGER NOT NULL DEFAULT 60`);

ensureColumn('lessons', 'difficulty', `TEXT NOT NULL DEFAULT 'Beginner'`);
ensureColumn('lessons', 'estimated_minutes', `INTEGER NOT NULL DEFAULT 15`);
ensureColumn('lessons', 'quality_status', `TEXT NOT NULL DEFAULT 'not_audited'`);
ensureColumn('lessons', 'further_practice_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('lessons', 'next_step_guidance', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'visual_explanation_markdown', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'common_mistakes_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('lessons', 'best_practices_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('lessons', 'technical_verified', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('lessons', 'technical_verified_by', `TEXT DEFAULT ''`);
ensureColumn('lessons', 'technical_verified_at', `TEXT DEFAULT ''`);

ensureColumn('exercises', 'marks', `INTEGER NOT NULL DEFAULT 10`);
ensureColumn('exercises', 'max_attempts', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('exercises', 'allow_partial_credit', `INTEGER NOT NULL DEFAULT 1`);
ensureColumn('exercises', 'validation_method', `TEXT DEFAULT 'exact_match'`);
ensureColumn('exercises', 'learning_objective', `TEXT DEFAULT ''`);

ensureColumn('assessments', 'module_id', `TEXT DEFAULT ''`);
ensureColumn('assessments', 'grading_policy_json', `TEXT NOT NULL DEFAULT '{}'`);
ensureColumn('assessments', 'objective_tags_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('assessments', 'question_bank_size', `INTEGER NOT NULL DEFAULT 0`);
ensureColumn('assessments', 'allow_partial_credit', `INTEGER NOT NULL DEFAULT 1`);
ensureColumn('assessments', 'shuffle_options', `INTEGER NOT NULL DEFAULT 0`);

ensureColumn('assignment_submissions', 'rubric_scores_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('assignment_submissions', 'resubmission_count', `INTEGER NOT NULL DEFAULT 0`);

ensureColumn('projects', 'rubric_scores_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('projects', 'resubmission_count', `INTEGER NOT NULL DEFAULT 0`);

db.exec(`
  CREATE TABLE IF NOT EXISTS learning_objectives (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    objective_code TEXT DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    mastery_level TEXT DEFAULT 'beginner',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS curriculum_quality_evaluations (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 100,
    percentage INTEGER NOT NULL DEFAULT 0,
    dimensions_json TEXT NOT NULL DEFAULT '[]',
    missing_requirements_json TEXT NOT NULL DEFAULT '[]',
    warnings_json TEXT NOT NULL DEFAULT '[]',
    recommendations_json TEXT NOT NULL DEFAULT '[]',
    review_status TEXT NOT NULL DEFAULT 'Not Audited',
    editorial_stage TEXT NOT NULL DEFAULT 'planned',
    technical_verified INTEGER NOT NULL DEFAULT 0,
    evaluated_by TEXT DEFAULT 'system',
    evaluated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS learner_competencies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    objective_key TEXT NOT NULL,
    objective_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'developing',
    mastery_pct INTEGER NOT NULL DEFAULT 0,
    evidence_count INTEGER NOT NULL DEFAULT 1,
    last_evidence_type TEXT NOT NULL DEFAULT 'lesson',
    last_evidence_id TEXT DEFAULT '',
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, course_id, objective_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS technology_learning_centres (
    technology_id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    interactive_tools_json TEXT NOT NULL DEFAULT '["snippet_runner"]',
    sections_config_json TEXT NOT NULL DEFAULT '[]',
    topic_groups_json TEXT NOT NULL DEFAULT '[]',
    guided_examples_json TEXT NOT NULL DEFAULT '[]',
    challenges_json TEXT NOT NULL DEFAULT '[]',
    website_project_json TEXT NOT NULL DEFAULT '{}',
    syllabus_json TEXT NOT NULL DEFAULT '[]',
    study_plan_json TEXT NOT NULL DEFAULT '[]',
    interview_prep_json TEXT NOT NULL DEFAULT '[]',
    summary_json TEXT NOT NULL DEFAULT '[]',
    best_practices_json TEXT NOT NULL DEFAULT '[]',
    certification_config_json TEXT NOT NULL DEFAULT '{}',
    references_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE CASCADE
  );
`);

// Reconcile any pre-existing empty Phase 24 tables created before column alignment
try {
  const loCols = (db.prepare(`PRAGMA table_info(learning_objectives)`).all() as Array<{ name: string }>).map((c) => c.name);
  if (!loCols.includes('title')) {
    db.exec(`DROP TABLE IF EXISTS learning_objectives;`);
    db.exec(`
      CREATE TABLE learning_objectives (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        objective_code TEXT DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        mastery_level TEXT DEFAULT 'beginner',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }
  const lcCols = (db.prepare(`PRAGMA table_info(learner_competencies)`).all() as Array<{ name: string }>).map((c) => c.name);
  if (!lcCols.includes('mastery_pct')) {
    db.exec(`DROP TABLE IF EXISTS learner_competencies;`);
    db.exec(`
      CREATE TABLE learner_competencies (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        objective_key TEXT NOT NULL,
        objective_title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'developing',
        mastery_pct INTEGER NOT NULL DEFAULT 0,
        evidence_count INTEGER NOT NULL DEFAULT 1,
        last_evidence_type TEXT NOT NULL DEFAULT 'lesson',
        last_evidence_id TEXT DEFAULT '',
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, course_id, objective_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `);
  }
} catch {
  // Ignore migration check error if table just created
}

ensureColumn('curriculum_quality_evaluations', 'max_score', `INTEGER NOT NULL DEFAULT 100`);
ensureColumn('curriculum_quality_evaluations', 'percentage', `INTEGER NOT NULL DEFAULT 0`);

// Curriculum, Session & Learning Progress Performance Indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_token_exp ON sessions(token, expires_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id, enrolled_at DESC);
  CREATE INDEX IF NOT EXISTS idx_courses_tech_pub ON courses(technology_id, is_published, status);
  CREATE INDEX IF NOT EXISTS idx_courses_workflow ON courses(workflow_status, updated_at);
  CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_topics_course_mod ON course_topics(course_id, module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_lessons_course_mod ON lessons(course_id, module_id, status, sort_order);
  CREATE INDEX IF NOT EXISTS idx_lessons_workflow ON lessons(workflow_status, qa_status);
  CREATE INDEX IF NOT EXISTS idx_blocks_lesson ON lesson_content_blocks(lesson_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_examples_lesson ON code_examples(lesson_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON exercises(lesson_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_exercises_course ON exercises(course_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_ex_sub_user ON exercise_submissions(user_id, exercise_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
  CREATE INDEX IF NOT EXISTS idx_assign_sub_user ON assignment_submissions(user_id, assignment_id);
  CREATE INDEX IF NOT EXISTS idx_assign_sub_status ON assignment_submissions(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(assessment_id, user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notes_user_course ON learning_notes(user_id, course_id);
  CREATE INDEX IF NOT EXISTS idx_lesson_prog_user ON lesson_progress(user_id, course_id, completed);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_certificates_user_status ON certificates(user_id, status, issued_at DESC);
  CREATE INDEX IF NOT EXISTS idx_path_certificates_user_status ON path_certificates(user_id, status, issued_at DESC);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_blueprints_tech ON curriculum_blueprints(technology_id);
  CREATE INDEX IF NOT EXISTS idx_qa_entity ON content_quality_checks(entity_type, entity_id, checked_at DESC);
  CREATE INDEX IF NOT EXISTS idx_review_hist_entity ON content_review_history(entity_type, entity_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_revisions_entity ON content_revisions(entity_type, entity_id, version_number DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_job_items_job ON ai_generation_job_items(job_id, status);
  CREATE INDEX IF NOT EXISTS idx_learning_obj_entity ON learning_objectives(entity_type, entity_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_qual_eval_entity ON curriculum_quality_evaluations(entity_type, entity_id, evaluated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_competencies_user_course ON learner_competencies(user_id, course_id);
  CREATE INDEX IF NOT EXISTS idx_tech_learning_centres_slug ON technology_learning_centres(slug);
`);

ensureColumn('project_templates', 'learning_outcomes_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('project_templates', 'milestones_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('project_templates', 'checklist_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('project_templates', 'rubric_json', `TEXT NOT NULL DEFAULT '[]'`);
ensureColumn('project_templates', 'submission_instructions', `TEXT DEFAULT ''`);

ensureColumn('lesson_progress', 'status', `TEXT NOT NULL DEFAULT 'not_started'`);
ensureColumn('lesson_progress', 'last_opened_at', `TEXT DEFAULT ''`);
db.exec(`UPDATE lesson_progress SET status = 'completed' WHERE completed = 1 AND status != 'completed'`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_proj_tpl_progress_user ON project_template_progress(user_id, template_id);`);

// Extended configurable branding, official contact & social media handles
ensureColumn('brand_config', 'logo_url', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'favicon_url', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'official_contact_email', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'business_phone', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'whatsapp_url', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'business_address', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'office_hours', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'contact_intro', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'about_headline', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'about_description', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'footer_about_text', `TEXT DEFAULT ''`);
ensureColumn('brand_config', 'social_links_json', `TEXT DEFAULT '{}'`);

// Contact enquiries lifecycle & triage columns
ensureColumn('contact_inquiries', 'category', `TEXT NOT NULL DEFAULT 'General Enquiry'`);
ensureColumn('contact_inquiries', 'status', `TEXT NOT NULL DEFAULT 'pending'`);
ensureColumn('contact_inquiries', 'admin_notes', `TEXT DEFAULT ''`);
ensureColumn('contact_inquiries', 'responded_at', `TEXT DEFAULT ''`);
ensureColumn('contact_inquiries', 'updated_at', `TEXT DEFAULT ''`);

export interface SocialLinksMap {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  x?: string;
  whatsapp_community?: string;
  custom?: Array<{ label: string; url: string }>;
}

export function getPublicBrandConfig() {
  const row = db.prepare(`SELECT * FROM brand_config WHERE id = 1`).get() as Record<string, unknown> | undefined;
  if (!row) return null;
  const socialLinks = parseJsonSafe<SocialLinksMap>(String(row.social_links_json || '{}'), {});
  return {
    ...row,
    social_links: socialLinks,
  };
}

export function recordAuditLog(
  actorId: string,
  action: string,
  targetType: string,
  targetId = '',
  metadata: Record<string, unknown> = {}
) {
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, actorId, action, targetType, targetId, JSON.stringify(metadata), new Date().toISOString());
}

export function grantUserEntitlements(
  userId: string,
  featureKeys: string[],
  source: string,
  grantRef: string,
  endsAt = '',
  grantedBy = '',
  notes = ''
) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO entitlements (id, user_id, feature_key, source, status, starts_at, ends_at, grant_ref, granted_by, notes, created_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
  );
  for (const featureKey of featureKeys) {
    const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    stmt.run(id, userId, featureKey, source, now, endsAt, grantRef, grantedBy, notes, now);
  }
}

export function revokeUserEntitlementsByRef(grantRef: string) {
  if (!grantRef) return;
  db.prepare(`UPDATE entitlements SET status = 'revoked' WHERE grant_ref = ? AND status = 'active'`).run(grantRef);
}

export function getUserEntitlement(userId: string): UserEntitlement {
  const nowIso = new Date().toISOString();
  const activeSub = db
    .prepare(
      `SELECT s.*, p.slug as plan_slug, p.name as plan_name, p.limits_json
       FROM subscriptions s
       JOIN subscription_plans p ON p.id = s.plan_id
       WHERE s.user_id = ? AND s.status = 'active' AND s.current_period_end > ?
       ORDER BY s.created_at DESC LIMIT 1`
    )
    .get(userId, nowIso) as
    | {
        plan_slug: string;
        plan_name: string;
        status: string;
        current_period_end: string;
        limits_json: string;
      }
    | undefined;

  const explicitGrants = db
    .prepare(
      `SELECT feature_key, source, ends_at
       FROM entitlements
       WHERE user_id = ? AND status = 'active' AND starts_at <= ? AND (ends_at = '' OR ends_at > ?)`
    )
    .all(userId, nowIso, nowIso) as Array<{ feature_key: string; source: string; ends_at: string }>;

  const hasFeature = (key: string) =>
    explicitGrants.some((g) => g.feature_key === key || g.feature_key === 'all_premium');

  const freePlan = db
    .prepare(`SELECT slug, name, limits_json FROM subscription_plans WHERE slug = 'starter-free' LIMIT 1`)
    .get() as { slug: string; name: string; limits_json: string } | undefined;

  const baseLimits = parseJsonSafe(freePlan?.limits_json, {
    aiDailyLimit: config.aiDailyFreeLimit,
    maxWorkspaces: 5,
    maxCollabParticipants: 0,
    canAccessPremiumCourses: false,
    canCreateCommunity: false,
    canUseCollabWorkspace: false,
  });

  if (activeSub) {
    const subLimits = parseJsonSafe(activeSub.limits_json, {
      aiDailyLimit: config.aiDailyPremiumLimit,
      maxWorkspaces: 50,
      maxCollabParticipants: 8,
      canAccessPremiumCourses: true,
      canCreateCommunity: true,
      canUseCollabWorkspace: true,
    });
    const isSubPremium = activeSub.plan_slug !== 'starter-free';
    const anyExplicitPremium = explicitGrants.length > 0;
    return {
      planSlug: activeSub.plan_slug,
      planName: activeSub.plan_name,
      isPremium: isSubPremium || anyExplicitPremium,
      status: activeSub.status,
      currentPeriodEnd: activeSub.current_period_end,
      limits: {
        ...subLimits,
        canAccessPremiumCourses:
          subLimits.canAccessPremiumCourses || hasFeature('premium_course_access') || hasFeature('premium_lesson_access'),
        canCreateCommunity: subLimits.canCreateCommunity || hasFeature('community_create'),
        canUseCollabWorkspace: subLimits.canUseCollabWorkspace || hasFeature('collaborative_workspace_access'),
      },
    };
  }

  if (explicitGrants.length > 0) {
    const canCourses = hasFeature('premium_course_access') || hasFeature('premium_lesson_access');
    const canComm = hasFeature('community_create');
    const canCollab = hasFeature('collaborative_workspace_access');
    const latestEnd = explicitGrants
      .map((g) => g.ends_at)
      .filter(Boolean)
      .sort()
      .pop() || null;

    return {
      planSlug: 'entitlement-grant',
      planName: explicitGrants[0].source === 'scholarship' ? 'Scholarship Access' : 'Granted Premium Access',
      isPremium: true,
      status: 'active',
      currentPeriodEnd: latestEnd,
      limits: {
        aiDailyLimit: Math.max(baseLimits.aiDailyLimit, config.aiDailyPremiumLimit),
        maxWorkspaces: Math.max(baseLimits.maxWorkspaces, 50),
        maxCollabParticipants: canCollab ? Math.max(baseLimits.maxCollabParticipants, 6) : baseLimits.maxCollabParticipants,
        canAccessPremiumCourses: canCourses,
        canCreateCommunity: canComm,
        canUseCollabWorkspace: canCollab,
      },
    };
  }

  return {
    planSlug: freePlan?.slug || 'starter-free',
    planName: freePlan?.name || 'Starter Free',
    isPremium: false,
    status: 'free',
    currentPeriodEnd: null,
    limits: baseLimits,
  };
}

export function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link = ''
) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, link, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, '', ?)`
  ).run(id, userId, type, title, body, link, new Date().toISOString());
  return { id, user_id: userId, type, title, body, link, read_at: '', created_at: new Date().toISOString() };
}

export function awardXpAndBadges(userId: string, xpDelta: number) {
  const user = db.prepare(`SELECT xp, streak_days, last_active_date FROM users WHERE id = ?`).get(userId) as
    | { xp: number; streak_days: number; last_active_date: string }
    | undefined;
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let nextStreak = user.streak_days;
  if (user.last_active_date !== today) {
    nextStreak = user.last_active_date === yesterday ? user.streak_days + 1 : 1;
  }

  const nextXp = user.xp + xpDelta;
  const nextLevel = Math.max(1, Math.floor(nextXp / 250) + 1);

  db.prepare(
    `UPDATE users SET xp = ?, level = ?, streak_days = ?, last_active_date = ? WHERE id = ?`
  ).run(nextXp, nextLevel, nextStreak, today, userId);

  const eligibleBadges = db
    .prepare(`SELECT id, title, xp_threshold FROM badges WHERE xp_threshold <= ?`)
    .all(nextXp) as Array<{ id: string; title: string; xp_threshold: number }>;

  for (const badge of eligibleBadges) {
    const existing = db
      .prepare(`SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?`)
      .get(userId, badge.id);
    if (!existing) {
      db.prepare(`INSERT INTO user_badges (user_id, badge_id, awarded_at) VALUES (?, ?, ?)`).run(
        userId,
        badge.id,
        new Date().toISOString()
      );
      createNotification(
        userId,
        'achievement',
        `Badge Earned: ${badge.title}`,
        `You reached ${nextXp} XP and unlocked the ${badge.title} achievement.`,
        '/dashboard'
      );
    }
  }
}

export function sanitizeUserPublic(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    username: user.username,
    avatar_url: user.avatar_url,
    bio: user.bio,
    role: user.role,
    status: user.status,
    email_verified: Boolean(user.email_verified),
    onboarding_completed: Boolean(user.onboarding_completed),
    skill_level: user.skill_level,
    interests: parseJsonSafe<string[]>(user.interests_json, []),
    goals: parseJsonSafe<string[]>(user.goals_json, []),
    preferred_techs: parseJsonSafe<string[]>(user.preferred_techs_json, []),
    xp: user.xp,
    level: user.level,
    streak_days: user.streak_days,
    public_profile: Boolean(user.public_profile),
    show_activity: Boolean(user.show_activity),
    allow_messages: Boolean(user.allow_messages),
    theme_preference: (user.theme_preference === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    created_at: user.created_at,
  };
}

export function seedDatabase() {
  const now = new Date().toISOString();

  const existingBrand = db.prepare(`SELECT * FROM brand_config WHERE id = 1`).get() as
    | {
        product_name: string;
        tagline: string;
        support_email: string;
        contact_intro?: string;
        about_headline?: string;
        about_description?: string;
        footer_about_text?: string;
        official_contact_email?: string;
        business_phone?: string;
        whatsapp_url?: string;
        business_address?: string;
        office_hours?: string;
      }
    | undefined;

  const defaultContactIntro =
    'Have a question about learning, technology, partnerships or Braincode? Get in touch with our team.';
  const defaultAboutHeadline = 'Empowering People Through Technology.';
  const defaultAboutDescription =
    'Braincode is a technology education and coding platform operated by BrainCode Technology Limited. We help learners build practical skills in software development, programming languages, databases, web development, artificial intelligence, cloud computing, cybersecurity and emerging technologies.';
  const defaultFooterAbout =
    'Braincode is a technology education platform by BrainCode Technology Limited.';

  if (!existingBrand) {
    db.prepare(
      `INSERT INTO brand_config (
        id, product_name, company_name, tagline, support_email, hero_headline, hero_subheadline,
        official_contact_email, business_phone, whatsapp_url, business_address, office_hours,
        contact_intro, about_headline, about_description, footer_about_text, social_links_json, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      config.productName,
      config.companyName,
      config.tagline,
      config.supportEmail,
      'What do you want to learn?',
      'Explore 200+ technologies, programming languages, frameworks, databases and developer tools. Learn at your own pace, practise with real code and build skills for the future.',
      config.contactInfo.officialEmail,
      config.contactInfo.businessPhone,
      config.contactInfo.whatsappUrl,
      config.contactInfo.businessAddress,
      config.contactInfo.officeHours,
      defaultContactIntro,
      defaultAboutHeadline,
      defaultAboutDescription,
      defaultFooterAbout,
      JSON.stringify({}),
      now
    );
  } else {
    // Migrate legacy BCschools branding in-place cleanly without overwriting custom admin values
    const migratedProduct =
      existingBrand.product_name === 'BCschools' ? 'Braincode' : existingBrand.product_name;
    const migratedTagline =
      existingBrand.product_name === 'BCschools' ||
      existingBrand.tagline.includes('one integrated workspace')
        ? config.tagline
        : existingBrand.tagline;
    const migratedSupport =
      existingBrand.support_email === 'support@bcschools.dev'
        ? config.supportEmail
        : existingBrand.support_email;
    db.prepare(
      `UPDATE brand_config
       SET product_name = ?,
           company_name = CASE WHEN company_name = '' THEN ? ELSE company_name END,
           tagline = ?,
           support_email = ?,
           contact_intro = CASE WHEN COALESCE(contact_intro, '') = '' THEN ? ELSE contact_intro END,
           about_headline = CASE WHEN COALESCE(about_headline, '') = '' THEN ? ELSE about_headline END,
           about_description = CASE WHEN COALESCE(about_description, '') = '' THEN ? ELSE about_description END,
           footer_about_text = CASE WHEN COALESCE(footer_about_text, '') = '' THEN ? ELSE footer_about_text END
       WHERE id = 1`
    ).run(
      migratedProduct,
      config.companyName,
      migratedTagline,
      migratedSupport,
      defaultContactIntro,
      defaultAboutHeadline,
      defaultAboutDescription,
      defaultFooterAbout
    );
  }

  const existingAiConfig = db.prepare(`SELECT * FROM ai_config WHERE id = 1`).get() as
    | { system_guardrail: string }
    | undefined;
  if (!existingAiConfig) {
    db.prepare(
      `INSERT INTO ai_config (id, daily_free_limit, daily_premium_limit, model_name, system_guardrail, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)`
    ).run(
      config.aiDailyFreeLimit,
      config.aiDailyPremiumLimit,
      config.aiModel,
      'Act as an encouraging senior software engineering mentor on Braincode. Explain concepts clearly, point out root causes in code, give guided hints before full solutions when tutoring, and remind learners that AI guidance should be tested and verified.',
      now
    );
  } else if (existingAiConfig.system_guardrail.includes('BCschools')) {
    db.prepare(`UPDATE ai_config SET system_guardrail = REPLACE(system_guardrail, 'BCschools', 'Braincode') WHERE id = 1`).run();
  }

  // Subscription plans (configurable prices in DB, never hardcoded in UI)
  const planCount = (db.prepare(`SELECT COUNT(*) as c FROM subscription_plans`).get() as { c: number }).c;
  if (planCount === 0) {
    const insertPlan = db.prepare(
      `INSERT INTO subscription_plans (id, slug, name, audience_label, description, monthly_price_cents, yearly_price_cents, currency, features_json, limits_json, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, 1, ?)`
    );
    insertPlan.run(
      'plan_free',
      'starter-free',
      'Starter Free',
      'For independent learners exploring core foundations',
      'Access course outlines, foundational free lessons, personal coding workspaces, public communities, and developer portfolios.',
      0,
      0,
      JSON.stringify([
        'All course outlines & foundational free lessons',
        'Up to 5 personal coding workspaces',
        'Join & participate in public developer communities',
        '15 AI learning assistant prompts per day',
        'Public developer portfolio & project showcase',
      ]),
      JSON.stringify({
        aiDailyLimit: config.aiDailyFreeLimit,
        maxWorkspaces: 5,
        maxCollabParticipants: 0,
        canAccessPremiumCourses: false,
        canCreateCommunity: false,
        canUseCollabWorkspace: false,
      }),
      1
    );
    insertPlan.run(
      'plan_pro',
      'pro-learner',
      'Pro Learner',
      'For builders mastering full-stack engineering & collaboration',
      'Unlock all premium courses, advanced coding challenges, higher AI tutoring capacity, community creation, and collaborative coding rooms.',
      1900,
      18000,
      JSON.stringify([
        'Unlimited access to all premium courses & tracks',
        'Create & moderate new developer communities',
        'Real-time collaborative coding sessions (up to 8 peers)',
        'Up to 50 personal & shared coding workspaces',
        '250 AI learning assistant prompts per day',
      ]),
      JSON.stringify({
        aiDailyLimit: config.aiDailyPremiumLimit,
        maxWorkspaces: 50,
        maxCollabParticipants: 8,
        canAccessPremiumCourses: true,
        canCreateCommunity: true,
        canUseCollabWorkspace: true,
      }),
      2
    );
    insertPlan.run(
      'plan_studio',
      'team-studio',
      'Team & Studio',
      'For engineering cohorts, bootcamps, and technical teams',
      'Expanded collaboration rooms, cohort workspace capacity, priority instructor review queues, and extended AI tutoring limits.',
      4900,
      46800,
      JSON.stringify([
        'Everything in Pro Learner',
        'Collaborative sessions for up to 25 participants',
        'Up to 200 workspaces with contributor attribution',
        '1,000 AI assistant prompts per day',
        'Priority assignment review & cohort analytics',
      ]),
      JSON.stringify({
        aiDailyLimit: 1000,
        maxWorkspaces: 200,
        maxCollabParticipants: 25,
        canAccessPremiumCourses: true,
        canCreateCommunity: true,
        canUseCollabWorkspace: true,
      }),
      3
    );
  }

  // Seed mentor/admin user if empty
  const userCount = (db.prepare(`SELECT COUNT(*) as c FROM users`).get() as { c: number }).c;
  if (userCount === 0) {
    const adminId = 'usr_mentor_admin';
    const instructorId = 'usr_instructor_elena';
    const seedPassword = hashPassword('BrainCode#2026!');
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, username, avatar_url, bio, role, status, email_verified, onboarding_completed, skill_level, interests_json, goals_json, preferred_techs_json, xp, level, streak_days, last_active_date, public_profile, show_activity, allow_messages, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 1, 'advanced', ?, ?, ?, 1850, 8, 12, ?, 1, 1, 1, ?)`
    ).run(
      adminId,
      'mentor@bcschools.dev',
      seedPassword,
      'Dr. Marcus Vance',
      'marcus_vance',
      '/src/assets/images/avatar_mentor_portrait_1794920077667.jpg',
      'Principal Systems Architect & Lead Curriculum Director at BrainCode Technology Limited.',
      'admin',
      JSON.stringify(['Distributed Systems', 'TypeScript', 'Applied AI']),
      JSON.stringify(['Mentor engineering cohorts', 'Publish architecture curricula']),
      JSON.stringify(['TypeScript', 'React', 'Node.js', 'SQL']),
      now.slice(0, 10),
      now
    );

    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, username, avatar_url, bio, role, status, email_verified, onboarding_completed, skill_level, interests_json, goals_json, preferred_techs_json, xp, level, streak_days, last_active_date, public_profile, show_activity, allow_messages, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 1, 'advanced', ?, ?, ?, 1420, 6, 7, ?, 1, 1, 1, ?)`
    ).run(
      instructorId,
      'elena@bcschools.dev',
      seedPassword,
      'Elena Rostova',
      'elena_rostova',
      '/src/assets/images/avatar_mentor_portrait_1794920077667.jpg',
      'Algorithms & Frontend Systems Instructor focused on interactive visualizations and web performance.',
      'instructor',
      JSON.stringify(['Algorithms', 'Web Performance', 'Frontend Engineering']),
      JSON.stringify(['Build interactive labs']),
      JSON.stringify(['JavaScript', 'CSS', 'TypeScript']),
      now.slice(0, 10),
      now
    );

    // Give admin an active Pro subscription so admin/mentor capabilities work out of the box
    const nextYear = new Date(Date.now() + 365 * 86400000).toISOString();
    db.prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, status, provider, provider_ref, current_period_start, current_period_end, cancel_at_period_end, created_at)
       VALUES ('sub_seed_admin', ?, 'plan_studio', 'yearly', 'active', 'internal', 'seed_grant', ?, ?, 0, ?)`
    ).run(adminId, now, nextYear, now);
  }

  // Badges
  const badgeCount = (db.prepare(`SELECT COUNT(*) as c FROM badges`).get() as { c: number }).c;
  if (badgeCount === 0) {
    const insertBadge = db.prepare(`INSERT INTO badges (id, slug, title, description, xp_threshold) VALUES (?, ?, ?, ?, ?)`);
    insertBadge.run('bdg_1', 'first-commit', 'First Milestone', 'Completed your first structured lesson or challenge.', 50);
    insertBadge.run('bdg_2', 'code-builder', 'Code Builder', 'Accumulated 250 XP across practical coding exercises.', 250);
    insertBadge.run('bdg_3', 'systems-thinker', 'Systems Thinker', 'Reached 750 XP demonstrating architecture and debugging mastery.', 750);
    insertBadge.run('bdg_4', 'architect', 'Lead Architect', 'Reached 1,500 XP across courses, quizzes, and projects.', 1500);
  }

  // Categories, Technologies, Courses, Modules, Lessons, Assessments
  const catCount = (db.prepare(`SELECT COUNT(*) as c FROM categories`).get() as { c: number }).c;
  if (catCount === 0) {
    db.prepare(`INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'cat_web',
      'Full-Stack Engineering',
      'full-stack-engineering',
      'Modern frontend interfaces, TypeScript architecture, REST APIs, and relational persistence.',
      1
    );
    db.prepare(`INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'cat_cs',
      'Computer Science & Algorithms',
      'computer-science-algorithms',
      'Data structures, graph traversal, complexity analysis, and systems thinking.',
      2
    );
    db.prepare(`INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'cat_ai',
      'Applied AI Engineering',
      'applied-ai-engineering',
      'Prompt engineering, structured outputs, tool calling, and production AI workflows.',
      3
    );

    db.prepare(`INSERT INTO technologies (id, category_id, name, slug, description) VALUES (?, ?, ?, ?, ?)`).run(
      'tech_ts',
      'cat_web',
      'TypeScript & React',
      'typescript-react',
      'Type-safe UI engineering and component state architecture.'
    );
    db.prepare(`INSERT INTO technologies (id, category_id, name, slug, description) VALUES (?, ?, ?, ?, ?)`).run(
      'tech_html',
      'cat_web',
      'HTML, CSS & JavaScript',
      'html-css-javascript',
      'Core browser fundamentals, DOM manipulation, and responsive layout.'
    );
    db.prepare(`INSERT INTO technologies (id, category_id, name, slug, description) VALUES (?, ?, ?, ?, ?)`).run(
      'tech_algo',
      'cat_cs',
      'Algorithms & Data Structures',
      'algorithms-data-structures',
      'Trees, graphs, dynamic programming, and algorithmic problem solving.'
    );
    db.prepare(`INSERT INTO technologies (id, category_id, name, slug, description) VALUES (?, ?, ?, ?, ?)`).run(
      'tech_genai',
      'cat_ai',
      'Gemini & AI Systems',
      'gemini-ai-systems',
      'Structured JSON generation, context windows, and agentic pipelines.'
    );

    // Courses
    db.prepare(
      `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      'crs_fullstack',
      'cat_web',
      'tech_ts',
      'Full-Stack TypeScript & Interactive DOM Systems',
      'fullstack-typescript-dom',
      'Build resilient web applications from semantic browser interfaces and state machines to server-side validation and REST APIs.',
      JSON.stringify([
        'Construct semantic, accessible HTML/CSS layouts with modern flexbox and grid.',
        'Manipulate the DOM cleanly using pure JavaScript event delegation.',
        'Design type-safe API contracts with server-side validation and error handling.',
      ]),
      'Beginner to Intermediate',
      18,
      'usr_mentor_admin',
      '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
      now
    );

    db.prepare(
      `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      'crs_algorithms',
      'cat_cs',
      'tech_algo',
      'Data Structures, Graphs & Complexity Analysis',
      'data-structures-graphs',
      'Master trees, hash maps, breadth-first and depth-first graph traversal, and Big-O runtime reasoning through interactive coding labs.',
      JSON.stringify([
        'Analyze time and space complexity using Big-O notation.',
        'Implement hash tables, stacks, queues, and adjacency-list graphs.',
        'Solve shortest-path and cycle-detection challenges in JavaScript.',
      ]),
      'Intermediate',
      24,
      'usr_instructor_elena',
      '/src/assets/images/course_systems_algorithms_1794920076843.jpg',
      now
    );

    db.prepare(
      `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      'crs_ai_eng',
      'cat_ai',
      'tech_genai',
      'Applied AI Engineering & Structured Pipelines',
      'applied-ai-engineering',
      'Design server-side AI workflows with strict schema validation, context management, rate limiting, and evaluation rubrics.',
      JSON.stringify([
        'Separate client UI from server-side AI orchestration endpoints.',
        'Enforce deterministic JSON schemas and prompt guardrails.',
        'Implement per-user token accounting and graceful fallback UX.',
      ]),
      'Advanced',
      14,
      'usr_mentor_admin',
      '/src/assets/images/course_ai_engineering_1794920077792.jpg',
      now
    );

    // Learning paths
    db.prepare(
      `INSERT INTO learning_paths (id, title, slug, description, difficulty, estimated_hours, course_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'path_core_swe',
      'Production Software Engineer Track',
      'production-swe-track',
      'A structured career track moving from interactive web foundations through algorithmic problem solving to applied AI backend integration.',
      'Beginner to Advanced',
      56,
      JSON.stringify(['crs_fullstack', 'crs_algorithms', 'crs_ai_eng'])
    );

    db.prepare(
      `INSERT INTO learning_paths (id, title, slug, description, difficulty, estimated_hours, course_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'path_systems_ai',
      'Systems & Applied AI Architect',
      'systems-ai-architect',
      'Deepen algorithmic rigor and build production-grade AI services with strict latency, quota, and schema guarantees.',
      'Intermediate to Advanced',
      38,
      JSON.stringify(['crs_algorithms', 'crs_ai_eng'])
    );

    // Modules & Lessons for Full-Stack course
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'mod_fs_1',
      'crs_fullstack',
      'Module 1: Interactive Browser Foundations',
      'HTML Structure, Layout & DOM Events',
      1
    );
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'mod_fs_2',
      'crs_fullstack',
      'Module 2: State Machines & API Contracts',
      'Asynchronous Fetch & Server Validation',
      2
    );

    const insertLesson = db.prepare(
      `INSERT INTO lessons (id, module_id, course_id, title, slug, summary, content_markdown, code_example, language, video_url, downloadable_resource, access_tier, duration_minutes, exercise_prompt, starter_code, solution_hint, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertLesson.run(
      'les_fs_1',
      'mod_fs_1',
      'crs_fullstack',
      'Semantic HTML & CSS Grid Architecture',
      'semantic-html-css-grid',
      'Structure accessible web layouts using landmark elements and responsive CSS Grid tracks.',
      `### Why Semantic Structure Matters\n\nScreen readers, search crawlers, and maintainable stylesheets rely on explicit document landmarks such as \`<header>\`, \`<main>\`, \`<section>\`, and \`<article>\` rather than nested \`<div>\` soup.\n\n### Responsive Grid Without Media-Query Bloat\n\nUsing \`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))\` creates fluid card grids that adapt cleanly from mobile viewports to widescreen desktops.`,
      `<main class="grid-shell">\n  <article class="panel">\n    <h2>Module One</h2>\n    <p>Fluid grid cell adapting automatically.</p>\n  </article>\n</main>`,
      'html',
      '',
      'semantic-grid-cheatsheet.md',
      'free',
      15,
      'Create a responsive 3-card layout inside <main> using CSS Grid and print the card count to the console.',
      `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: system-ui; background: #0b1220; color: #e2e8f0; padding: 24px; }\n    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }\n    .card { background: #152238; border: 1px solid #263b5e; border-radius: 10px; padding: 16px; }\n  </style>\n</head>\n<body>\n  <main class="grid">\n    <article class="card"><h3>HTML</h3><p>Structure</p></article>\n    <article class="card"><h3>CSS</h3><p>Presentation</p></article>\n    <article class="card"><h3>JS</h3><p>Behavior</p></article>\n  </main>\n  <script>\n    console.log('Rendered cards:', document.querySelectorAll('.card').length);\n  </script>\n</body>\n</html>`,
      'Use document.querySelectorAll(".card").length inside your <script> block to verify all cards exist.',
      1
    );

    insertLesson.run(
      'les_fs_2',
      'mod_fs_1',
      'crs_fullstack',
      'Event Delegation & Unidirectional State',
      'event-delegation-state',
      'Handle dynamic UI lists cleanly with a single parent event listener and predictable state updates.',
      `### Avoid Listener Leaks\n\nAttaching click handlers to hundreds of list items wastes memory and breaks when new items are inserted. Instead, attach one listener to the parent container and inspect \`event.target.closest('[data-action]')\`.\n\n### Predictable Rendering\n\nKeep a single JavaScript array as your source of truth and re-render the DOM list whenever state changes.`,
      `container.addEventListener('click', (e) => {\n  const btn = e.target.closest('button[data-id]');\n  if (!btn) return;\n  toggleTask(btn.dataset.id);\n});`,
      'javascript',
      '',
      'event-delegation-notes.md',
      'free',
      20,
      'Implement a filterable task list using event delegation and log state transitions.',
      `const tasks = [\n  { id: '1', title: 'Design schema', done: true },\n  { id: '2', title: 'Build API validation', done: false },\n  { id: '3', title: 'Write integration tests', done: false }\n];\n\nfunction summarize(list) {\n  const completed = list.filter(t => t.done).length;\n  console.log(\`Completed \${completed} of \${list.length} tasks\`);\n}\n\nsummarize(tasks);`,
      'Filter tasks by `done` property and return a deterministic summary.',
      2
    );

    insertLesson.run(
      'les_fs_3',
      'mod_fs_2',
      'crs_fullstack',
      'Server-Side Validation & Entitlement Enforcement',
      'server-side-validation-entitlements',
      'Why client-side checks are only UX convenience and how backend guards protect paid features and mutations.',
      `### Trust Boundaries\n\nAny JavaScript executing in a user browser can be inspected or bypassed. Therefore:\n\n1. Validate payload types, lengths, and ownership on the server.\n2. Resolve subscription entitlements from database records—never from a boolean flag sent by the client.\n3. Return explicit HTTP status codes (\`401\` unauthenticated, \`403\` forbidden/upgrade required, \`400\` validation failure).`,
      `if (!entitlement.canCreateCommunity) {\n  return res.status(403).json({ code: 'PREMIUM_REQUIRED' });\n}`,
      'javascript',
      '',
      'security-boundaries-guide.md',
      'premium',
      25,
      'Write a pure authorization check function that verifies ownership and active entitlement before permitting a mutation.',
      `function canAccessLesson(user, lesson, hasActivePlan) {\n  if (!user) return { allowed: false, reason: 'AUTH_REQUIRED' };\n  if (lesson.accessTier === 'free') return { allowed: true };\n  if (hasActivePlan) return { allowed: true };\n  return { allowed: false, reason: 'PREMIUM_REQUIRED' };\n}\n\nconsole.log(canAccessLesson({ id: 'u1' }, { accessTier: 'premium' }, false));`,
      'Check `lesson.accessTier === "free"` first, then require `hasActivePlan === true`.',
      3
    );

    // Algorithms course
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'mod_alg_1',
      'crs_algorithms',
      'Module 1: Asymptotic Complexity & Hash Maps',
      'Big-O & Constant-Time Lookups',
      1
    );
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'mod_alg_2',
      'crs_algorithms',
      'Module 2: Graph Traversal & Shortest Paths',
      'BFS, DFS & Queue Mechanics',
      2
    );

    insertLesson.run(
      'les_alg_1',
      'mod_alg_1',
      'crs_algorithms',
      'Hash Maps & O(n) Pair Finding',
      'hash-maps-pair-finding',
      'Eliminate nested O(n^2) loops by trading space for constant-time Map lookups.',
      `### From Quadratic to Linear Time\n\nNested loops compare every pair in \`O(n^2)\` operations. By storing previously seen complements in a JavaScript \`Map\`, we inspect each element exactly once in \`O(n)\` time.`,
      `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (seen.has(comp)) return [seen.get(comp), i];\n    seen.set(nums[i], i);\n  }\n  return null;\n}`,
      'javascript',
      '',
      '',
      'free',
      18,
      'Implement twoSum using Map() and verify it returns [0, 2] for ([2, 7, 11, 15], 13).',
      `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) return [seen.get(complement), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n\nconsole.log('Indices:', JSON.stringify(twoSum([2, 7, 11, 15], 13)));`,
      'Store `seen.set(nums[i], i)` after checking `seen.has(target - nums[i])`.',
      1
    );

    insertLesson.run(
      'les_alg_2',
      'mod_alg_2',
      'crs_algorithms',
      'Breadth-First Search on Adjacency Lists',
      'bfs-adjacency-lists',
      'Traverse unweighted graphs level-by-level to find shortest hop paths.',
      `### Level-Order Exploration\n\nBreadth-First Search (BFS) uses a FIFO queue and a \`visited\` Set to guarantee that the first time a node is reached, it is via the minimum number of edges.`,
      `const queue = [start];\nconst visited = new Set([start]);`,
      'javascript',
      '',
      '',
      'premium',
      25,
      'Implement BFS shortest distance between two nodes in an adjacency list graph.',
      `const graph = {\n  A: ['B', 'C'],\n  B: ['A', 'D', 'E'],\n  C: ['A', 'F'],\n  D: ['B'],\n  E: ['B', 'F'],\n  F: ['C', 'E']\n};\n\nfunction shortestDistance(adj, start, target) {\n  const queue = [[start, 0]];\n  const visited = new Set([start]);\n  while (queue.length > 0) {\n    const [node, dist] = queue.shift();\n    if (node === target) return dist;\n    for (const next of adj[node] || []) {\n      if (!visited.has(next)) {\n        visited.add(next);\n        queue.push([next, dist + 1]);\n      }\n    }\n  }\n  return -1;\n}\n\nconsole.log('Distance A -> F:', shortestDistance(graph, 'A', 'F'));`,
      'Track `[node, distance]` tuples in the queue and mark neighbors visited when enqueueing.',
      2
    );

    // Applied AI course
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      'mod_ai_1',
      'crs_ai_eng',
      'Module 1: Server-Side AI Proxies & Context Budgets',
      'API Isolation, Rate Limits & Prompts',
      1
    );

    insertLesson.run(
      'les_ai_1',
      'mod_ai_1',
      'crs_ai_eng',
      'Designing Safe Server-Side AI Endpoints',
      'safe-server-ai-endpoints',
      'Protect provider keys, inject authorized context only, and log token usage per user.',
      `### Architecture Checklist\n\n- Keep API credentials strictly in server environment variables.\n- Enforce per-user daily quotas against the database before calling the model.\n- Scope context prompts to authorized lesson or workspace snippets only.`,
      `const allowed = usageToday < entitlement.limits.aiDailyLimit;`,
      'javascript',
      '',
      '',
      'free',
      15,
      'Build a quota guard helper that computes remaining AI prompts and blocks exhausted free accounts.',
      `function checkQuota(usedToday, planLimit) {\n  const remaining = Math.max(0, planLimit - usedToday);\n  return { allowed: remaining > 0, remaining };\n}\n\nconsole.log(checkQuota(12, 15));\nconsole.log(checkQuota(15, 15));`,
      'Compare `usedToday` against `planLimit` before dispatching upstream requests.',
      1
    );

    insertLesson.run(
      'les_ai_2',
      'mod_ai_1',
      'crs_ai_eng',
      'Structured JSON Schemas & Rubric Evaluation',
      'structured-json-rubrics',
      'Constrain model responses to deterministic JSON schemas for reliable UI rendering.',
      `### Why Schema Constraints Beat Regex Parsing\n\nWhen an educational app needs structured feedback—such as \`strengths\`, \`issues\`, and \`nextSteps\`—configuring \`responseMimeType: "application/json"\` and an explicit \`responseSchema\` eliminates fragile string splitting.`,
      `responseMimeType: "application/json"`,
      'javascript',
      '',
      '',
      'premium',
      22,
      'Validate a simulated structured AI feedback payload against required schema keys.',
      `function validateFeedback(payload) {\n  const required = ['summary', 'hints', 'verified'];\n  const missing = required.filter(k => !(k in payload));\n  return { valid: missing.length === 0, missing };\n}\n\nconsole.log(validateFeedback({ summary: 'Check loop bounds', hints: ['Inspect index i'], verified: true }));`,
      'Ensure every required field exists on the parsed object before rendering.',
      2
    );

    // Assessments (Quizzes, Gamified Challenges, Practical Assignment)
    const insertAssessment = db.prepare(
      `INSERT INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertAssessment.run(
      'asm_fs_quiz',
      'crs_fullstack',
      'les_fs_1',
      'Full-Stack Foundations & Security Challenge',
      'quiz',
      'timed',
      180,
      100,
      JSON.stringify([
        {
          id: 'q1',
          kind: 'multiple_choice',
          prompt: 'Which pattern prevents attaching hundreds of redundant click listeners to dynamic list rows?',
          options: [
            'Inline onclick attributes on every span',
            'Event delegation on the parent container using event.target.closest()',
            'Polling the DOM with setInterval every 100ms',
            'Wrapping every row in an iframe',
          ],
          correctAnswer: 'Event delegation on the parent container using event.target.closest()',
          explanation: 'Event delegation attaches a single listener to an ancestor element and inspects the event target via closest().',
        },
        {
          id: 'q2',
          kind: 'true_false',
          prompt: 'True or False: Hiding a premium button in React is sufficient to prevent unauthorized access to paid lessons.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Client-side UI hiding is easily bypassed. Access entitlements must always be verified on the backend API.',
        },
        {
          id: 'q3',
          kind: 'fill_blank',
          prompt: 'Complete the CSS declaration for fluid responsive grid columns: grid-template-columns: repeat(______, minmax(220px, 1fr));',
          correctAnswer: 'auto-fit',
          explanation: '`auto-fit` collapses empty tracks and expands filled columns to fill available width.',
        },
        {
          id: 'q4',
          kind: 'find_error',
          prompt: 'Identify the bug in this Express entitlement check: `if (req.body.isPremium = true) { allow(); }`',
          options: [
            'Assignment operator (=) is used instead of strict equality (===), and isPremium should come from the database',
            'req.body is always undefined in Express',
            'true must be capitalized as TRUE',
            'allow() must be awaited with new Promise',
          ],
          correctAnswer: 'Assignment operator (=) is used instead of strict equality (===), and isPremium should come from the database',
          explanation: 'Using `=` mutates the value to true, and trusting `req.body.isPremium` allows clients to forge entitlements.',
        },
      ]),
      now
    );

    insertAssessment.run(
      'asm_alg_challenge',
      'crs_algorithms',
      'les_alg_1',
      'Algorithmic Complexity & Code Completion Sprint',
      'challenge',
      'untimed',
      0,
      120,
      JSON.stringify([
        {
          id: 'aq1',
          kind: 'code_completion',
          prompt: 'What is the time complexity of looking up a key in a balanced hash map on average?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
          correctAnswer: 'O(1)',
          explanation: 'Hash maps compute a bucket index directly from the key hash, giving average O(1) lookup time.',
        },
        {
          id: 'aq2',
          kind: 'ordering',
          prompt: 'Select the correct step sequence for Breadth-First Search (BFS):',
          options: [
            '1. Push start to queue & mark visited -> 2. Shift front node -> 3. Enqueue unvisited neighbors',
            '1. Sort all edges -> 2. Pop from stack -> 3. Skip visited check',
            '1. Recurse infinitely -> 2. Build hash table -> 3. Return -1',
          ],
          correctAnswer: '1. Push start to queue & mark visited -> 2. Shift front node -> 3. Enqueue unvisited neighbors',
          explanation: 'BFS explores level by level using a FIFO queue and marks nodes visited upon enqueueing.',
        },
        {
          id: 'aq3',
          kind: 'practical',
          prompt: 'Submit a short explanation or implementation note describing how you would detect a cycle in an undirected graph.',
          correctAnswer: '',
          explanation: 'Subjective coding reflection queued for instructor feedback or self-review.',
        },
      ]),
      now
    );
  }

  // Resources & Platform Tutorial Guides
  const resCount = (db.prepare(`SELECT COUNT(*) as c FROM resources`).get() as { c: number }).c;
  if (resCount === 0) {
    const insertRes = db.prepare(
      `INSERT INTO resources (id, title, category, technology, type, summary, content_markdown, code_snippet, video_url, downloadable_filename, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertRes.run(
      'res_tut_1',
      'Platform Guide: Enrolling in Courses & Tracking Progress',
      'Platform Tutorials',
      'Braincode',
      'tutorial',
      'Step-by-step walkthrough on browsing tracks, inspecting free outlines, completing lessons, and earning XP.',
      `1. Open **Explore Courses** from the navigation bar.\n2. Filter by category or technology and inspect any course outline at no cost.\n3. Select **Enroll in Course** to add it to your Dashboard.\n4. Inside the lesson viewer, run interactive code exercises, ask the AI Assistant for hints, and mark lessons complete to build your streak.`,
      '',
      '',
      'braincode-learner-quickstart.txt',
      now
    );
    insertRes.run(
      'res_tut_2',
      'Platform Guide: Using the Coding Workspace & Live Preview',
      'Platform Tutorials',
      'Braincode',
      'tutorial',
      'Learn how to organize multi-file projects, execute HTML/CSS/JS safely in the browser sandbox, and save work to your portfolio.',
      `1. Launch **Coding Workspace** from your dashboard or directly from a lesson exercise.\n2. Create files or folders in the left explorer.\n3. Click **Run Code** to render HTML/CSS/JS inside an isolated sandboxed preview and inspect console output.\n4. Save your workspace and publish finished work under **Projects & Portfolio**.`,
      `console.log('Workspace ready!');`,
      '',
      'workspace-shortcuts.txt',
      now
    );
    insertRes.run(
      'res_tut_3',
      'Platform Guide: Communities, Collaborative Coding & Subscriptions',
      'Platform Tutorials',
      'Braincode',
      'tutorial',
      'Understand free community participation, premium community creation, collaborative coding invites, and billing management.',
      `1. Joining and posting in eligible public communities is free for all verified learners.\n2. Creating a new community or hosting a real-time collaborative coding session checks your backend subscription entitlement.\n3. Manage monthly or yearly plans anytime under **Pricing & Billing**.`,
      '',
      '',
      '',
      now
    );
    insertRes.run(
      'res_doc_1',
      'TypeScript Strict Discriminated Unions Reference',
      'Documentation',
      'TypeScript',
      'docs',
      'Pattern-matching API responses and state machines safely using discriminated union types.',
      `Discriminated unions attach a literal \`status\` or \`type\` tag to each variant so TypeScript narrows fields exhaustively inside \`switch\` statements.`,
      `type ApiResult<T> =\n  | { status: 'ok'; data: T }\n  | { status: 'error'; message: string };`,
      '',
      'ts-unions-reference.ts',
      now
    );
    insertRes.run(
      'res_doc_2',
      'SQLite Relational Indexing & Query Patterns',
      'Guides',
      'SQL',
      'guide',
      'Design composite indexes and foreign-key constraints for fast dashboard and messaging queries.',
      `Always index foreign keys used in \`WHERE\` and \`JOIN\` clauses (such as \`user_id\`, \`course_id\`, and \`created_at\`) to keep pagination latency flat as tables grow.`,
      `CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at);`,
      '',
      'sqlite-indexing-guide.sql',
      now
    );
  }

  // Seed 1 public community so discovery works immediately
  const commCount = (db.prepare(`SELECT COUNT(*) as c FROM communities`).get() as { c: number }).c;
  if (commCount === 0) {
    db.prepare(
      `INSERT INTO communities (id, name, slug, description, category, privacy, rules_json, owner_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'public', ?, 'usr_mentor_admin', ?)`
    ).run(
      'comm_fullstack_guild',
      'Full-Stack Engineering Guild',
      'full-stack-engineering-guild',
      'Peer code reviews, architecture discussions, and weekly system design threads for web & backend learners.',
      'Full-Stack Engineering',
      JSON.stringify([
        'Share reproducible code snippets when asking debugging questions.',
        'Keep critiques constructive and focused on engineering trade-offs.',
        'No spam, self-promotion links without context, or unverified claims.',
      ]),
      now
    );
    db.prepare(
      `INSERT INTO community_members (community_id, user_id, role, status, joined_at)
       VALUES ('comm_fullstack_guild', 'usr_mentor_admin', 'owner', 'active', ?)`
    ).run(now);
    db.prepare(
      `INSERT INTO community_members (community_id, user_id, role, status, joined_at)
       VALUES ('comm_fullstack_guild', 'usr_instructor_elena', 'moderator', 'active', ?)`
    ).run(now);

    db.prepare(
      `INSERT INTO community_posts (id, community_id, author_id, title, content, resource_url, likes_json, status, created_at)
       VALUES (?, 'comm_fullstack_guild', 'usr_mentor_admin', ?, ?, '', '["usr_instructor_elena"]', 'active', ?)`
    ).run(
      'post_welcome_1',
      'Welcome to the Full-Stack Engineering Guild',
      'Introduce what you are currently building in the Coding Workspace, share blockers from Module 1 or 2, and connect with peers working on similar tracks.',
      now
    );
  }

  seedExpandedCurriculum(db);
  seedCurriculumBlueprintsAndStarterDrafts(db);
  seedPriority10Curriculum(db);
  seedPhase21Curriculum(db);
  seedTechnologyLearningCentres(db);

  // One-time idempotent migration for legacy visible BCschools strings & code example language/syntax normalization
  db.exec(`
    UPDATE technologies
       SET overview_markdown = REPLACE(overview_markdown, 'BCschools', 'Braincode')
     WHERE overview_markdown LIKE '%BCschools%';
    UPDATE resources
       SET technology = 'Braincode',
           downloadable_filename = REPLACE(downloadable_filename, 'bcschools', 'braincode')
     WHERE technology = 'BCschools' OR downloadable_filename LIKE '%bcschools%';
    UPDATE lessons
       SET code_example = REPLACE(code_example, 'BCschools', 'Braincode'),
           starter_code = REPLACE(starter_code, 'BCschools', 'Braincode')
     WHERE code_example LIKE '%BCschools%' OR starter_code LIKE '%BCschools%';

    -- Fix mis-tagged TypeScript & React JSX examples so syntax validators inspect accurately
    UPDATE lessons SET language = 'typescript' WHERE id = 'les_ts_1' AND language = 'javascript';
    UPDATE code_examples SET language = 'typescript' WHERE id = 'cex_les_ts_1_1' AND language = 'javascript';
    UPDATE lessons SET language = 'jsx' WHERE id IN ('les_react_2', 'les_react_4', 'les_react_5') AND language = 'javascript';
    UPDATE code_examples SET language = 'jsx' WHERE id IN ('ce_les_react_2_1', 'ce_les_react_4_1', 'ce_les_react_5_1') AND language = 'javascript';
  `);

  // Wrap partial Express route fragments into complete handler functions so JS syntax checks pass cleanly
  const wrapSnippetIfBareReturn = (table: 'lessons' | 'code_examples', id: string, col: 'code_example' | 'code', wrapperName: string) => {
    const row = db.prepare(`SELECT ${col} as txt FROM ${table} WHERE id = ?`).get(id) as { txt?: string } | undefined;
    if (row?.txt && !/^\s*(async\s+)?function\b/.test(row.txt) && /\breturn\s+res\.status/.test(row.txt)) {
      const wrapped = `async function ${wrapperName}(req, res) {\n${row.txt}\n}`;
      db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`).run(wrapped, id);
    }
  };
  wrapSnippetIfBareReturn('lessons', 'les_fs_3', 'code_example', 'createEnrollmentHandler');
  wrapSnippetIfBareReturn('code_examples', 'cex_les_fs_3_1', 'code', 'createEnrollmentHandler');
  wrapSnippetIfBareReturn('lessons', 'les_node_1', 'code_example', 'handleUserRoute');
  wrapSnippetIfBareReturn('code_examples', 'cex_les_node_1_1', 'code', 'handleUserRoute');
}

seedDatabase();
