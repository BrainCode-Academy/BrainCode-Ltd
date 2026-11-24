import type { TechnologyCapabilityProfile } from '../shared/technologyCapabilities';

export interface SocialLinksConfig {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  x?: string;
  whatsapp_community?: string;
  custom?: Array<{ label: string; url: string }>;
}

export interface BrandConfig {
  product_name: string;
  company_name: string;
  tagline: string;
  support_email: string;
  hero_headline: string;
  hero_subheadline: string;
  logo_url?: string;
  favicon_url?: string;
  official_contact_email?: string;
  business_phone?: string;
  whatsapp_url?: string;
  business_address?: string;
  office_hours?: string;
  contact_intro?: string;
  about_headline?: string;
  about_description?: string;
  footer_about_text?: string;
  social_links_json?: string;
  social_links?: SocialLinksConfig;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_notes?: string;
  responded_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface CapabilitiesConfig {
  oauth: {
    googleEnabled: boolean;
    appleEnabled: boolean;
  };
  payments: {
    provider: string;
    stripeConfigured: boolean;
  };
  sandbox: {
    remoteSandboxUrl: string;
    remoteSandboxEnabled: boolean;
    sqlMemorySandboxEnabled?: boolean;
    browserLanguages: string[];
    remoteOnlyLanguages: string[];
  };
  aiConfigured: boolean;
  aiStatus?: {
    status: 'healthy' | 'unconfigured' | 'degraded';
    configured: boolean;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    lastCheckedAt?: string | null;
    modelName?: string | null;
  };
  emailDeliveryConfigured?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  role: 'learner' | 'instructor' | 'moderator' | 'admin';
  status: 'active' | 'suspended';
  email_verified: boolean;
  onboarding_completed: boolean;
  skill_level: string;
  interests: string[];
  goals: string[];
  preferred_techs: string[];
  xp: number;
  level: number;
  streak_days: number;
  public_profile: boolean;
  show_activity: boolean;
  allow_messages: boolean;
  theme_preference?: 'dark' | 'light';
  daily_goal_minutes?: number;
  created_at: string;
}

export interface UserEntitlement {
  planSlug: string;
  planName: string;
  isPremium: boolean;
  status: string;
  currentPeriodEnd: string | null;
  limits: {
    aiDailyLimit: number;
    maxWorkspaces: number;
    maxCollabParticipants: number;
    canAccessPremiumCourses: boolean;
    canCreateCommunity: boolean;
    canUseCollabWorkspace: boolean;
  };
}

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  audience_label: string;
  description: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  features: string[];
  limits: Record<string, unknown>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order?: number;
}

export interface Technology {
  id: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug: string;
  description: string;
  icon_symbol?: string;
  sort_order?: number;
  is_published?: number;
  is_popular?: number;
  overview_markdown?: string;
  course_count?: number;
  aliases?: string[];
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  brand_color?: string;
  content_status?: 'available' | 'in_development' | 'coming_soon' | string;
  learning_status?: 'available' | 'in_development' | 'coming_soon';
  featured_order?: number;
  created_at?: string;
}

export interface TechnologyDirectoryResponse {
  technologies: Technology[];
  totalCount: number;
  filteredCount: number;
  statusCounts: {
    available: number;
    in_development: number;
    coming_soon: number;
  };
  featured: Technology[];
}

export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  overview?: string;
  audience?: string;
  difficulty: string;
  estimated_hours: number;
  target_role?: string;
  course_ids: string[];
  prerequisites?: string[];
  objectives?: string[];
  milestones?: Array<{ step: number; title: string; summary: string }>;
  project_template_ids?: string[];
  is_published?: number;
}

export interface CourseTopic {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  slug: string;
  summary: string;
  sort_order: number;
}

export type WorkflowStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

export interface Course {
  id: string;
  category_id: string;
  technology_id: string;
  category_name?: string;
  category_slug?: string;
  technology_name?: string;
  technology_slug?: string;
  title: string;
  slug: string;
  description: string;
  objectives: string[];
  prerequisites?: string[];
  completion_rule?: 'all_lessons' | 'lessons_and_assessments' | 'all_requirements' | string;
  workflow_status?: WorkflowStatus;
  difficulty: string;
  estimated_hours: number;
  instructor_name?: string;
  instructor_username?: string;
  instructor_bio?: string;
  instructor_avatar?: string;
  thumbnail_url: string;
  total_lessons?: number;
  free_lessons?: number;
  enrolled?: boolean;
  last_lesson_id?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface LessonOutlineItem {
  id: string;
  module_id: string;
  topic_id?: string;
  course_id: string;
  title: string;
  slug: string;
  topic_name?: string;
  summary: string;
  access_tier: 'free' | 'premium';
  duration_minutes: number;
  language?: string;
  completed?: boolean;
  bookmarked?: boolean;
  progress_status?: 'not_started' | 'in_progress' | 'completed';
  status?: 'draft' | 'published' | 'archived';
  workflow_status?: WorkflowStatus;
  version?: number;
}

export interface LessonContentBlock {
  id: string;
  lesson_id: string;
  block_type:
    | 'heading'
    | 'paragraph'
    | 'list'
    | 'table'
    | 'code_example'
    | 'callout'
    | 'warning'
    | 'step_guide'
    | 'diagram'
    | 'doc_link'
    | 'visual_explanation'
    | 'common_mistakes'
    | 'best_practices'
    | 'summary'
    | 'next_steps'
    | 'image'
    | 'video_reference'
    | string;
  title: string;
  content_markdown: string;
  metadata?: Record<string, unknown>;
  sort_order: number;
}

export interface CodeExampleItem {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  expected_output: string;
  is_runnable: number | boolean;
  sort_order: number;
}

export type ExerciseType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false'
  | 'fill_blank'
  | 'predict_output'
  | 'find_error'
  | 'code_completion'
  | 'write_code'
  | 'sql_write'
  | 'ordering'
  | 'matching'
  | 'short_answer'
  | 'scenario_analysis'
  | 'design_submission'
  | 'practical_task';

export interface ExerciseSubmissionItem {
  id: string;
  exercise_id: string;
  user_id?: string;
  answer_text: string;
  code_submitted: string;
  is_correct: number | boolean;
  score: number;
  feedback_text: string;
  instructor_feedback?: string;
  status: string;
  attempt_number: number;
  created_at: string;
}

export interface ExerciseItem {
  id: string;
  course_id: string;
  module_id?: string;
  lesson_id?: string;
  technology_id?: string;
  title: string;
  exercise_type: ExerciseType;
  difficulty: string;
  prompt: string;
  starter_code?: string;
  options: string[];
  hint_text?: string;
  explanation?: string;
  correct_answer?: string;
  xp_reward: number;
  marks?: number;
  max_attempts?: number;
  allow_partial_credit?: number | boolean;
  validation_method?: string;
  learning_objective?: string;
  sort_order: number;
  submissions?: ExerciseSubmissionItem[];
  solved?: boolean;
}

export interface RubricScoreItem {
  criterion: string;
  earned: number;
  max: number;
  note?: string;
}

export interface AssignmentSubmissionItem {
  id: string;
  assignment_id: string;
  user_id: string;
  submission_text: string;
  repo_url: string;
  live_url: string;
  files?: Record<string, string>;
  workspace_id?: string;
  status: 'submitted' | 'graded' | 'needs_revision' | 'approved' | string;
  score: number;
  instructor_feedback: string;
  rubric_scores?: RubricScoreItem[];
  rubric_scores_json?: string;
  resubmission_count?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentItem {
  id: string;
  course_id: string;
  module_id?: string;
  technology_id?: string;
  title: string;
  description: string;
  instructions_markdown: string;
  requirements: string[];
  starter_files: Record<string, string>;
  rubric: Array<{ criterion: string; points: number }>;
  difficulty: string;
  xp_reward: number;
  due_days: number;
  mySubmission?: AssignmentSubmissionItem | null;
}

export interface ProjectTemplate {
  id: string;
  technology_id: string;
  learning_path_id: string;
  course_id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  estimated_hours: number;
  summary: string;
  requirements: string[];
  starter_files: Record<string, string>;
  deliverables: string[];
  learning_outcomes?: string[];
  milestones?: Array<{ step: number; title: string; summary: string }>;
  checklist?: string[];
  rubric?: Array<{ criterion: string; points: number }>;
  submission_instructions?: string;
  myProgress?: { checkedItems: string[]; notes: string; updatedAt: string } | null;
  technology_name?: string;
  course_title?: string;
}

export interface LessonFull extends LessonOutlineItem {
  content_markdown: string;
  code_example: string;
  language: string;
  video_url: string;
  downloadable_resource: string;
  exercise_prompt: string;
  starter_code: string;
  solution_hint: string;
  prerequisites?: string[];
  objectives?: string[];
  difficulty?: string;
  estimated_minutes?: number;
  quality_status?: string;
  visual_explanation_markdown?: string;
  common_mistakes?: string[];
  best_practices?: string[];
  further_practice?: string[];
  next_step_guidance?: string;
  technical_verified?: number | boolean;
}

export interface CertificateItem {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  course_slug?: string;
  category_name?: string;
  technology_name?: string;
  learner_name: string;
  certificate_code: string;
  issued_at: string;
  status?: 'active' | 'revoked' | string;
  revoked_at?: string;
  revocation_reason?: string;
}

export interface PathCertificateItem {
  id: string;
  user_id: string;
  learning_path_id: string;
  path_title: string;
  learner_name: string;
  certificate_code: string;
  issued_at: string;
  status?: 'active' | 'revoked' | string;
  revoked_at?: string;
  revocation_reason?: string;
}

export interface SearchResponse {
  query: string;
  technologies: Array<Technology & { category_name: string; category_slug: string }>;
  learningPaths: LearningPath[];
  courses: Course[];
  modules?: Array<{ id: string; course_id: string; title: string; topic: string; course_title: string; course_slug: string }>;
  lessons: Array<
    LessonOutlineItem & {
      course_title: string;
      course_slug: string;
      difficulty: string;
      category_name: string;
      technology_name: string;
      technology_slug: string;
    }
  >;
  exercises?: Array<{ id: string; course_id: string; lesson_id: string; title: string; exercise_type: string; difficulty: string; course_title: string; course_slug: string }>;
  projectTemplates?: ProjectTemplate[];
  resources: ResourceItem[];
}

export interface LearningCentreSectionDef {
  id: string;
  label: string;
  group: 'curriculum' | 'practice' | 'planning' | 'certification' | 'reference';
  order: number;
  summary: string;
}

export interface LearningCentreTopicItem {
  id: string;
  title: string;
  subtopics: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  kind: 'lesson' | 'project' | 'api' | 'practice';
  lessonId?: string | null;
  courseSlug?: string | null;
  status?: 'available' | 'in_development' | 'planned';
}

export interface LearningCentreTopicGroup {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  order: number;
  topics: LearningCentreTopicItem[];
}

export interface LearningCentreGuidedExample {
  id: string;
  title: string;
  topic: string;
  language: string;
  description: string;
  code: string;
  expectedOutput: string;
}

export interface LearningCentreChallenge {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  objective: string;
  prompt: string;
  starterCode: string;
  hint: string;
  xpReward: number;
}

export interface LearningCentreStudyWeek {
  week: number;
  title: string;
  focus: string;
  milestones: string[];
  estimatedHours: number;
}

export interface LearningCentreInterviewQuestion {
  id: string;
  question: string;
  level: 'Junior' | 'Mid-Level' | 'Senior';
  keyPoints: string[];
  sampleAnswer: string;
}

export interface LearningCentreBestPractice {
  id: string;
  category: string;
  title: string;
  guidance: string;
  antiPattern: string;
}

export interface LearningCentreReferenceRow {
  symbol: string;
  syntax: string;
  description: string;
  supportNote?: string;
}

export interface LearningCentreReferenceTable {
  id: string;
  title: string;
  description: string;
  columns: [string, string, string];
  rows: LearningCentreReferenceRow[];
}

export interface LearningCentreCertificationBlueprint {
  examTitle: string;
  passingScorePct: number;
  durationMinutes: number;
  questionCount: number;
  prerequisiteSummary: string;
  examSections: Array<{ domain: string; weightPct: number; topics: string[] }>;
  preparationTips: string[];
}

export interface LearningCentreWebsiteProject {
  title: string;
  summary: string;
  phases: Array<{ phase: string; title: string; deliverables: string[] }>;
}

export interface LearningCentreCertificationExam {
  id: string;
  courseId: string;
  courseSlug: string;
  title: string;
  type: string;
  mode: string;
  timeLimitSec: number;
  passingScorePct: number;
  xpReward: number;
  questionCount: number;
  userBestScorePct?: number | null;
  userPassed?: boolean;
}

export interface TechnologyLearningCentre {
  slug: string;
  technologyId: string;
  source: 'curated_centre' | 'dynamic_blueprint';
  environmentType: string;
  environmentLabel: string;
  interactiveTools: Array<'px_em_converter' | 'color_contrast' | 'sql_schema_viewer' | 'snippet_runner'>;
  sections: LearningCentreSectionDef[];
  topicGroups: LearningCentreTopicGroup[];
  guidedExamples: LearningCentreGuidedExample[];
  challenges: LearningCentreChallenge[];
  websiteProject: LearningCentreWebsiteProject | null;
  syllabusSummary: Array<{ unit: string; title: string; outcomes: string[]; hours: number }>;
  studyPlan: LearningCentreStudyWeek[];
  interviewPrep: LearningCentreInterviewQuestion[];
  summaryPoints: string[];
  bestPractices: LearningCentreBestPractice[];
  certification: LearningCentreCertificationBlueprint;
  certificationExams: LearningCentreCertificationExam[];
  references: LearningCentreReferenceTable[];
  metrics: {
    totalSections: number;
    totalTopics: number;
    availableInteractiveTopics: number;
    guidedExamplesCount: number;
    challengesCount: number;
    studyWeeks: number;
    interviewQuestionsCount: number;
    referenceEntriesCount: number;
  };
}

export interface TechnologyDetailResponse {
  technology: Technology;
  capabilityProfile?: TechnologyCapabilityProfile;
  courses: Array<
    Course & {
      modules: Array<{ id: string; title: string; topic: string; topics?: CourseTopic[]; lessons: LessonOutlineItem[] }>;
      assessments: Array<{ id: string; title: string; type: string; mode: string; xp_reward: number; passing_score_pct?: number }>;
    }
  >;
  hydratedCourses?: Array<
    Course & {
      modules: Array<{ id: string; title: string; topic: string; topics?: CourseTopic[]; lessons: LessonOutlineItem[] }>;
      assessments: Array<{ id: string; title: string; type: string; mode: string; xp_reward: number; passing_score_pct?: number }>;
    }
  >;
  learningPaths: LearningPath[];
  resources: ResourceItem[];
  relatedTechnologies?: Technology[];
  projectTemplates?: ProjectTemplate[];
  prerequisites?: string[];
  objectives?: string[];
  exerciseCount?: number;
  assignmentCount?: number;
  userProgress?: {
    completedLessons: number;
    inProgressLessons?: number;
    totalLessons: number;
    completedExercises: number;
    percentage: number;
    enrolledCourseIds: string[];
  } | null;
  freeSample: {
    id: string;
    title: string;
    language: string;
    code_example: string;
    starter_code: string;
    exercise_prompt: string;
  } | null;
  learningCentre?: TechnologyLearningCentre | null;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  language: string;
  files: Record<string, string>;
  lesson_id?: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  owner_id: string;
  owner_name?: string;
  owner_username?: string;
  title: string;
  description: string;
  tags: string[];
  repo_url: string;
  live_url: string;
  image_url: string;
  screenshots: string[];
  visibility: 'public' | 'private';
  contributors: string[];
  template_id?: string;
  status?: string;
  instructor_feedback?: string;
  updated_at: string;
}

export interface CommunityItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  privacy: 'public' | 'private' | 'approval';
  rules: string[];
  owner_id: string;
  owner_name?: string;
  owner_username?: string;
  member_count?: number;
  post_count?: number;
  myMembership?: { role: string; status: string } | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read_at: string;
  created_at: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  category: string;
  technology: string;
  type: 'docs' | 'guide' | 'example' | 'reference' | 'tutorial';
  summary: string;
  content_markdown: string;
  code_snippet: string;
  video_url: string;
  downloadable_filename: string;
  created_at: string;
}

export type CoverageStatus =
  | 'not_started'
  | 'planned'
  | 'in_development'
  | 'content_review'
  | 'published'
  | 'substantially_complete'
  | 'needs_improvement';

export type EditorialStage =
  | 'planned'
  | 'blueprint_available'
  | 'course_in_development'
  | 'draft_content_available'
  | 'awaiting_review'
  | 'published'
  | 'substantially_complete'
  | 'needs_improvement';

export interface TechnologyCoverageRow {
  technologyId: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  difficulty: string;
  isPublished: boolean;
  hasBlueprint: boolean;
  blueprintModulesCount: number;
  blueprintTopicsCount: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  reviewCourses: number;
  totalModules: number;
  totalTopics: number;
  publishedLessons: number;
  draftLessons: number;
  reviewLessons: number;
  codeExamplesCount: number;
  exercisesCount: number;
  quizzesCount: number;
  assignmentsCount: number;
  projectsCount: number;
  learningPathsCount: number;
  aiGeneratedCount: number;
  qaIssuesCount: number;
  currentlyGenerating?: boolean;
  completenessScore: number;
  calculatedStatus: CoverageStatus;
  editorialStage?: EditorialStage;
  assignedInstructors: string[];
  lastUpdatedAt: string;
}

export interface IncompleteCourseSummary {
  courseId: string;
  title: string;
  slug: string;
  technologyId: string;
  technologyName: string;
  status: string;
  workflowStatus: string;
  publishedLessons: number;
  draftOrReviewLessons: number;
  exercisesCount: number;
  quizzesCount: number;
  projectsCount: number;
  completenessScore: number;
  updatedAt: string;
}

export interface CoverageSummary {
  totalTechnologies: number;
  byStatus: Record<CoverageStatus, number>;
  totalCourses: number;
  publishedCourses: number;
  incompleteCoursesCount?: number;
  totalLessons: number;
  publishedLessons: number;
  draftLessons: number;
  reviewLessons: number;
  lessonsAwaitingReview?: number;
  qaFailuresCount?: number;
  technologiesAwaitingContent?: number;
  technologiesCurrentlyGenerating?: number;
  exerciseCoverageCount?: number;
  assessmentCoverageCount?: number;
  projectCoverageCount?: number;
  totalExercises: number;
  totalAssessments: number;
  totalProjects: number;
  averageCompleteness: number;
  productionProgressPct?: number;
}

export interface QualityCheckReport {
  id: string;
  entityType: 'lesson' | 'course';
  entityId: string;
  validationStatus: 'pass' | 'warning' | 'fail';
  score: number;
  missingSections: string[];
  educationalWarnings: string[];
  technicalWarnings: string[];
  checksDetail: Array<{
    category: 'structural' | 'educational' | 'technical';
    check: string;
    status: 'pass' | 'warning' | 'fail';
    detail: string;
  }>;
  checkedAt: string;
  staticInspectionNote: string;
}

export interface LearnerRecommendation {
  id: string;
  category:
    | 'continue_lesson'
    | 'retry_assessment'
    | 'review_weak_objective'
    | 'practice_exercise'
    | 'complete_assignment'
    | 'next_course';
  type?: string;
  title: string;
  reason: string;
  actionLabel?: string;
  targetType?: 'course' | 'lesson' | 'assessment' | 'assignment';
  targetId?: string;
  courseId?: string;
  courseSlug?: string;
  lessonId?: string;
  assessmentId?: string;
  requiresUpgrade?: boolean;
  priority: number;
}

export interface CourseCompetencySummary {
  courseId: string;
  courseTitle: string;
  minCertificateScore: number;
  requirePracticalProjects: boolean;
  metrics: {
    completedLessons: number;
    totalLessons: number;
    solvedExercises: number;
    totalExercises: number;
    bestAssessmentPct: number | null;
    approvedPracticalCount: number;
    averageMasteryPct: number;
  };
  objectives: Array<{
    key: string;
    title: string;
    status: 'mastered' | 'developing' | 'needs_review' | 'not_started' | string;
    masteryPct: number;
    evidenceCount: number;
  }>;
}

export interface IntelligenceDimensionScore {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'partial' | 'fail' | 'exempt';
  detail: string;
}

export interface QualityEvaluationResult {
  id: string;
  entityType: 'course' | 'lesson';
  entityId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  reviewStatus: string;
  editorialStage: string;
  technicalVerified: boolean;
  technicalVerifiedBy: string;
  technicalVerifiedAt: string;
  dimensions: IntelligenceDimensionScore[];
  missingRequirements: string[];
  warnings: string[];
  recommendations: string[];
  evaluatedBy: string;
  evaluatedAt: string;
}

export interface CourseAuditSummaryRow {
  courseId: string;
  title: string;
  slug: string;
  technologyId: string;
  technologyName: string;
  categoryName: string;
  difficulty: string;
  status: string;
  workflowStatus: string;
  isPublished: boolean;
  score: number;
  maxScore: number;
  percentage: number;
  reviewStatus: string;
  technicalVerified: boolean;
  missingCount: number;
  warningCount: number;
  missingRequirements: string[];
  warnings: string[];
}

export interface MasterCurriculumAudit {
  generatedAt: string;
  totals: {
    categories: number;
    technologies: number;
    blueprints: number;
    learningPaths: number;
    courses: number;
    publishedCourses: number;
    draftCourses: number;
    modules: number;
    lessons: number;
    publishedLessons: number;
    draftLessons: number;
    codeExamples: number;
    exercises: number;
    assessments: number;
    assignments: number;
    projectTemplates: number;
    learningObjectives: number;
  };
  coverage: {
    technologiesWithPublishedCourses: number;
    technologiesWithoutPublishedCourses: number;
    averageCourseQualityScore: number;
  };
  findings: {
    emptyCourses: number;
    emptyModules: number;
    coursesMissingObjectives: number;
    coursesMissingPrerequisites: number;
    coursesWithoutProjects?: number;
    lessonsMissingObjectives: number;
    lessonsBriefContent: number;
    lessonsMissingCodeExample: number;
    lessonsMissingBlocks: number;
    duplicateLessonTitlesSameCourse: number;
    exercisesMissingAnswer: number;
    exercisesMissingExplanation: number;
    assessmentsMissingQuestions: number;
    assessmentsMissingObjectives: number;
    assignmentsMissingRubric: number;
    projectTemplatesMissingRubric: number;
    coursesUnverifiedTechnical: number;
    lessonsUnverifiedTechnical: number;
  };
  courseSummaries: CourseAuditSummaryRow[];
  actionableLinks: Array<{
    severity: 'critical' | 'warning' | 'info';
    entityType: 'course' | 'module' | 'lesson' | 'exercise' | 'assessment' | 'assignment' | 'project_template';
    entityId: string;
    courseId?: string;
    courseTitle?: string;
    title: string;
    issue: string;
  }>;
}

export type CurriculumAuditGapType =
  | 'missing_objective'
  | 'empty_module'
  | 'empty_course'
  | 'course_without_project'
  | 'technology_without_course'
  | 'technology_without_project'
  | 'missing_assessment'
  | 'brief_content'
  | 'missing_code_example'
  | 'unverified_technical';

export interface CurriculumAuditGapItem {
  id: string;
  gapType: CurriculumAuditGapType;
  severity: 'critical' | 'warning' | 'info';
  entityType: 'technology' | 'course' | 'module' | 'lesson';
  entityId: string;
  entityTitle: string;
  courseId?: string;
  courseTitle?: string;
  technologyId?: string;
  technologyName?: string;
  technologySlug?: string;
  detail: string;
  recommendation: string;
  actionTarget: 'lesson_editor' | 'course_inspector' | 'technology_catalog';
}

export interface TechnologyAuditEntry {
  technologyId: string;
  name: string;
  slug: string;
  categoryName: string;
  difficulty: string;
  contentStatus: string;
  totalCourses: number;
  publishedCourses: number;
  totalModules: number;
  emptyModules: number;
  totalLessons: number;
  lessonsMissingObjectives: number;
  projectTemplatesCount: number;
  exercisesCount: number;
  assessmentsCount: number;
  hasBlueprint: boolean;
  hasLearningCentre: boolean;
  healthStatus: 'healthy' | 'needs_attention' | 'critical_gaps' | 'unstarted';
  gaps: string[];
}

export interface CourseAuditDetailEntry {
  courseId: string;
  title: string;
  slug: string;
  technologyId: string;
  technologyName: string;
  technologySlug: string;
  status: string;
  isPublished: boolean;
  modulesCount: number;
  emptyModulesCount: number;
  lessonsCount: number;
  lessonsMissingObjectives: number;
  missingObjectives: boolean;
  projectTemplatesCount: number;
  assignmentsCount: number;
  missingProject: boolean;
  assessmentsCount: number;
  exercisesCount: number;
  technicalVerified: boolean;
  gaps: string[];
}

export interface EmptyModuleGapEntry {
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  technologyId: string;
  technologyName: string;
  technologySlug: string;
}

export interface CurriculumQualityReport {
  reportId: string;
  reportTitle: string;
  generatedAt: string;
  summary: {
    totalTechnologies: number;
    healthyTechnologies: number;
    technologiesWithGaps: number;
    unstartedTechnologies: number;
    totalCourses: number;
    emptyCourses: number;
    coursesMissingObjectives: number;
    coursesWithoutProjects: number;
    coursesMissingAssessments: number;
    totalModules: number;
    emptyModules: number;
    totalLessons: number;
    lessonsMissingObjectives: number;
    lessonsBriefContent: number;
    lessonsMissingCodeExample: number;
    lessonsMissingBlocks: number;
    unverifiedCourses: number;
    unverifiedLessons: number;
    totalGaps: number;
    criticalGaps: number;
    warningGaps: number;
    infoGaps: number;
    overallHealthScorePct: number;
  };
  byGapType: Record<CurriculumAuditGapType, number>;
  technologyAudits: TechnologyAuditEntry[];
  courseAudits: CourseAuditDetailEntry[];
  emptyModules: EmptyModuleGapEntry[];
  gaps: CurriculumAuditGapItem[];
}

