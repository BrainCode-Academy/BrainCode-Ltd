export interface RichLessonSpec {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  slug: string;
  topicName: string;
  summary: string;
  language: string;
  accessTier: 'free' | 'premium';
  durationMinutes: number;
  sortOrder: number;
  status: 'published' | 'draft';
  workflowStatus: 'published' | 'review' | 'draft';
  objectives: string[];
  prerequisites: string[];
  detailedExplanation: string;
  conceptsAndTerminology: Array<{ term: string; definition: string }>;
  stepByStepTeaching: string[];
  syntaxAndUsage: string[];
  practicalExampleNarrative: string;
  codeExamples: Array<{
    title: string;
    description: string;
    language: string;
    code: string;
    expectedOutput: string;
    explanation: string;
  }>;
  commonMistakes: string[];
  bestPractices: string[];
  practicalActivity: string;
  starterCode: string;
  solutionHint: string;
  knowledgeChecks: string[];
  summaryPoints: string[];
  furtherResources: string[];
  extraBlockTable?: { title: string; markdown: string };
}

export interface RichModuleSpec {
  id: string;
  courseId: string;
  title: string;
  topic: string;
  sortOrder: number;
}

export interface RichExerciseSpec {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  technologyId: string;
  title: string;
  exerciseType:
    | 'multiple_choice'
    | 'true_false'
    | 'fill_blank'
    | 'code_completion'
    | 'predict_output'
    | 'find_error'
    | 'write_code'
    | 'short_answer'
    | 'matching'
    | 'practical_task';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  prompt: string;
  starterCode: string;
  options: string[];
  correctAnswer: string;
  validationRule: Record<string, unknown>;
  explanation: string;
  hintText: string;
  xpReward: number;
  sortOrder: number;
}

export interface RichAssessmentSpec {
  id: string;
  courseId: string;
  lessonId: string;
  title: string;
  xpReward: number;
  questions: Array<{
    id: string;
    kind: string;
    prompt: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

export interface RichAssignmentSpec {
  id: string;
  courseId: string;
  moduleId: string;
  technologyId: string;
  title: string;
  description: string;
  instructionsMarkdown: string;
  requirements: string[];
  starterFiles: Record<string, string>;
  rubric: string[];
  difficulty: string;
  xpReward: number;
}

export interface RichProjectSpec {
  id: string;
  technologyId: string;
  learningPathId: string;
  courseId: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  summary: string;
  requirements: string[];
  starterFiles: Record<string, string>;
  deliverables: string[];
}

export interface PriorityBatchBundle {
  modules: RichModuleSpec[];
  lessons: RichLessonSpec[];
  exercises: RichExerciseSpec[];
  assessments: RichAssessmentSpec[];
  assignments: RichAssignmentSpec[];
  projects: RichProjectSpec[];
}

export function formatSubstantiveLessonMarkdown(spec: RichLessonSpec): string {
  const sections: string[] = [
    `## ${spec.title}`,
    `### 1. Learning Objectives\n${spec.objectives.map((o) => `- ${o}`).join('\n')}`,
    `### 2. Prerequisites\n${spec.prerequisites.map((p) => `- ${p}`).join('\n')}`,
    `### 3. Detailed Explanation\n\n${spec.detailedExplanation}`,
    `### 4. Key Concepts & Terminology\n${spec.conceptsAndTerminology.map((c) => `- **${c.term}**: ${c.definition}`).join('\n')}`,
    `### 5. Step-by-Step Guide\n${spec.stepByStepTeaching.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    `### 6. Syntax & Usage Rules\n${spec.syntaxAndUsage.map((s) => `- ${s}`).join('\n')}`,
    `### 7. Practical Example & Walkthrough\n\n${spec.practicalExampleNarrative}\n\n${spec.codeExamples
      .map(
        (ex, idx) =>
          `#### Example ${idx + 1}: ${ex.title}\n${ex.description}\n\n\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n**Why this works:** ${ex.explanation}\n\n**Expected Output:** \`${ex.expectedOutput}\``
      )
      .join('\n\n')}`,
    `### 8. Common Mistakes to Avoid\n${spec.commonMistakes.map((m) => `- ${m}`).join('\n')}`,
    `### 9. Best Practices\n${spec.bestPractices.map((b) => `- ${b}`).join('\n')}`,
    `### 10. Practical Activity\n\n${spec.practicalActivity}`,
    `### 11. Knowledge Check Questions\n${spec.knowledgeChecks.map((k, i) => `${i + 1}. ${k}`).join('\n')}`,
    `### 12. Lesson Summary\n${spec.summaryPoints.map((s) => `- ${s}`).join('\n')}`,
    `### 13. Further Learning Resources\n${spec.furtherResources.map((r) => `- ${r}`).join('\n')}`,
  ];
  return sections.join('\n\n');
}
