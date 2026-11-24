import type { DatabaseSync } from 'node:sqlite';
import { PRIORITY_BATCH_1_WEB_CORE } from './curriculum_priority10_batch1.ts';
import { PRIORITY_BATCH_2_APP_STACK } from './curriculum_priority10_batch2.ts';
import { PRIORITY_BATCH_3_SYSTEMS_DATA } from './curriculum_priority10_batch3.ts';
import { formatSubstantiveLessonMarkdown, type PriorityBatchBundle } from './curriculum_priority10_types.ts';

export function seedPriority10Curriculum(db: DatabaseSync) {
  const now = new Date().toISOString();
  const batches: PriorityBatchBundle[] = [
    PRIORITY_BATCH_1_WEB_CORE,
    PRIORITY_BATCH_2_APP_STACK,
    PRIORITY_BATCH_3_SYSTEMS_DATA,
  ];

  const insertModule = db.prepare(
    `INSERT OR IGNORE INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`
  );

  const insertTopic = db.prepare(
    `INSERT OR IGNORE INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertLesson = db.prepare(
    `INSERT OR IGNORE INTO lessons (
       id, module_id, topic_id, course_id, title, slug, topic_name, summary, content_markdown,
       code_example, language, video_url, downloadable_resource, access_tier, duration_minutes,
       exercise_prompt, starter_code, solution_hint, status, workflow_status, qa_status,
       author_id, is_ai_generated, objectives_json, prerequisites_json, version, sort_order, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, 'usr_instructor_elena', 0, ?, ?, 1, ?, ?)`
  );

  const insertBlock = db.prepare(
    `INSERT OR IGNORE INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertCodeExample = db.prepare(
    `INSERT OR IGNORE INTO code_examples (id, lesson_id, title, description, language, code, expected_output, is_runnable, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertExercise = db.prepare(
    `INSERT OR IGNORE INTO exercises (
       id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty,
       prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation,
       hint_text, xp_reward, sort_order, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertAssessment = db.prepare(
    `INSERT OR IGNORE INTO assessments (
       id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward,
       questions_json, passing_score_pct, created_at
     ) VALUES (?, ?, ?, ?, 'quiz', 'untimed', 0, ?, ?, 70, ?)`
  );

  const insertAssignment = db.prepare(
    `INSERT OR IGNORE INTO assignments (
       id, course_id, module_id, technology_id, title, description, instructions_markdown,
       requirements_json, starter_files_json, rubric_json, difficulty, xp_reward, due_days, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 7, ?)`
  );

  const insertProjectTpl = db.prepare(
    `INSERT OR IGNORE INTO project_templates (
       id, technology_id, learning_path_id, course_id, title, slug, category, difficulty,
       estimated_hours, summary, requirements_json, starter_files_json, deliverables_json, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const browserRunnableLangs = new Set(['html', 'css', 'javascript', 'js']);

  for (const batch of batches) {
    for (const mod of batch.modules) {
      insertModule.run(mod.id, mod.courseId, mod.title, mod.topic, mod.sortOrder);
    }

    for (const les of batch.lessons) {
      const topicId = `top_${les.id}`;
      insertTopic.run(
        topicId,
        les.courseId,
        les.moduleId,
        les.topicName,
        `${les.slug}-topic`,
        les.summary,
        les.sortOrder,
        now
      );

      const markdown = formatSubstantiveLessonMarkdown(les);
      const primaryCode = les.codeExamples[0]?.code || les.starterCode || '';
      const initialQaStatus = les.status === 'published' ? 'pass' : 'pending';

      insertLesson.run(
        les.id,
        les.moduleId,
        topicId,
        les.courseId,
        les.title,
        les.slug,
        les.topicName,
        les.summary,
        markdown,
        primaryCode,
        les.language,
        les.accessTier,
        les.durationMinutes,
        les.practicalActivity,
        les.starterCode,
        les.solutionHint,
        les.status,
        les.workflowStatus,
        initialQaStatus,
        JSON.stringify(les.objectives),
        JSON.stringify(les.prerequisites),
        les.sortOrder,
        now
      );

      // Rich structured content blocks
      insertBlock.run(
        `blk_${les.id}_1`,
        les.id,
        'paragraph',
        'Detailed Concept Architecture',
        les.detailedExplanation,
        '{}',
        1
      );
      insertBlock.run(
        `blk_${les.id}_2`,
        les.id,
        'list',
        'Key Concepts & Terminology',
        les.conceptsAndTerminology.map((c) => `- **${c.term}**: ${c.definition}`).join('\n'),
        '{}',
        2
      );
      insertBlock.run(
        `blk_${les.id}_3`,
        les.id,
        'step_guide',
        'Step-by-Step Implementation Guide',
        les.stepByStepTeaching.map((s, idx) => `${idx + 1}. ${s}`).join('\n'),
        '{}',
        3
      );
      if (les.codeExamples[0]) {
        insertBlock.run(
          `blk_${les.id}_4`,
          les.id,
          'code_example',
          les.codeExamples[0].title,
          `\`\`\`${les.codeExamples[0].language}\n${les.codeExamples[0].code}\n\`\`\`\nExpected Output: \`${les.codeExamples[0].expectedOutput}\``,
          JSON.stringify({ language: les.codeExamples[0].language }),
          4
        );
      }
      insertBlock.run(
        `blk_${les.id}_5`,
        les.id,
        'warning',
        'Common Mistakes to Avoid',
        les.commonMistakes.map((m) => `- ${m}`).join('\n'),
        '{}',
        5
      );
      insertBlock.run(
        `blk_${les.id}_6`,
        les.id,
        'callout',
        'Production Best Practices',
        les.bestPractices.map((b) => `- ${b}`).join('\n'),
        '{}',
        6
      );
      if (les.extraBlockTable) {
        insertBlock.run(
          `blk_${les.id}_7`,
          les.id,
          'table',
          les.extraBlockTable.title,
          les.extraBlockTable.markdown,
          '{}',
          7
        );
      }

      les.codeExamples.forEach((ex, idx) => {
        const runnable = browserRunnableLangs.has(ex.language.toLowerCase()) ? 1 : 0;
        insertCodeExample.run(
          `ce_${les.id}_${idx + 1}`,
          les.id,
          ex.title,
          `${ex.description} ${ex.explanation}`.trim(),
          ex.language,
          ex.code,
          ex.expectedOutput,
          runnable,
          idx + 1
        );
      });
    }

    for (const ex of batch.exercises) {
      insertExercise.run(
        ex.id,
        ex.courseId,
        ex.moduleId,
        ex.lessonId,
        ex.technologyId,
        ex.title,
        ex.exerciseType,
        ex.difficulty,
        ex.prompt,
        ex.starterCode,
        JSON.stringify(ex.options || []),
        ex.correctAnswer,
        JSON.stringify(ex.validationRule || {}),
        ex.explanation,
        ex.hintText,
        ex.xpReward,
        ex.sortOrder,
        now
      );
    }

    for (const asm of batch.assessments) {
      insertAssessment.run(
        asm.id,
        asm.courseId,
        asm.lessonId,
        asm.title,
        asm.xpReward,
        JSON.stringify(asm.questions),
        now
      );
    }

    for (const asn of batch.assignments) {
      const normalizedRubric = asn.rubric.map((criterion) => ({
        criterion,
        points: Math.max(10, Math.round(100 / Math.max(1, asn.rubric.length))),
      }));
      insertAssignment.run(
        asn.id,
        asn.courseId,
        asn.moduleId,
        asn.technologyId,
        asn.title,
        asn.description,
        asn.instructionsMarkdown,
        JSON.stringify(asn.requirements),
        JSON.stringify(asn.starterFiles),
        JSON.stringify(normalizedRubric),
        asn.difficulty,
        asn.xpReward,
        now
      );
    }

    for (const pt of batch.projects) {
      insertProjectTpl.run(
        pt.id,
        pt.technologyId,
        pt.learningPathId,
        pt.courseId,
        pt.title,
        pt.slug,
        pt.category,
        pt.difficulty,
        pt.estimatedHours,
        pt.summary,
        JSON.stringify(pt.requirements),
        JSON.stringify(pt.starterFiles),
        JSON.stringify(pt.deliverables),
        now
      );
    }
  }

  // Ensure Priority 10 courses reflect updated curriculum timestamp cleanly and reset cached completeness_score so QA recalculates accurately
  const priorityCourseIds = [
    'crs_html',
    'crs_css',
    'crs_js',
    'crs_python',
    'crs_react',
    'crs_typescript',
    'crs_nodejs',
    'crs_sql',
    'crs_java',
    'crs_cpp_draft',
  ];
  const syncCourseMeta = db.prepare(
    `UPDATE courses
     SET completeness_score = 0,
         updated_at = CASE WHEN updated_at = '' THEN ? ELSE updated_at END
     WHERE id = ?`
  );
  for (const cid of priorityCourseIds) {
    syncCourseMeta.run(now, cid);
  }
}
