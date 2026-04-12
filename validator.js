// ═══════════════════════════════════════════════════════════════
// REYHANACHAMPION - QUESTION BANK VALIDATOR
// ═══════════════════════════════════════════════════════════════
// Validates question bank for data integrity and detects:
// - Duplicate IDs
// - Missing required fields
// - Invalid answer formats
// - Invalid difficulty labels
// - Missing required tags

const VALID_SUBJECTS = ['english', 'math', 'gepmath', 'science', 'malay'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'unknown'];
const VALID_POOLS = ['quiz', 'drill', undefined];

// Required fields per question
const REQUIRED_FIELDS = {
  all: ['id', 'q', 'opts', 'ans'],
  mcq: ['id', 'section', 'tag', 'q', 'opts', 'ans', 'exp'],
  drill: ['id', 'section', 'tag', 'q', 'opts', 'ans'],
  math: ['id', 'section', 'tag', 'q', 'opts', 'ans'],
  english: ['id', 'section', 'tag', 'q', 'opts', 'ans', 'exp'],
  science: ['id', 'topic', 'q', 'opts', 'ans'],
  malay: ['id', 'topic', 'q', 'opts', 'ans'],
};

function getSkill(q) {
  if (q.skill) return q.skill;
  if (q.section) {
    const section = q.section;
    if (section === 'Grammar MCQ') return 'grammar';
    if (section === 'Vocabulary') return 'vocabulary';
    if (section === 'Visual Text') return 'visual text';
    if (section === 'Grammar Cloze') return 'grammar cloze';
    if (section === 'Editing') return 'editing';
    if (section === 'Comprehension') return 'comprehension';
    if (section === 'Listening Comprehension') return 'listening comprehension';
    // Math sections - use tag for finer skill categorization
    if (section === 'Section A: MCQ' || section === 'Section B: Short Answer' || section === 'Section C: Word Problems') {
      if (q.tag) {
        const tag = q.tag;
        if (tag === 'numbers') return 'numbers';
        if (tag === 'fractions') return 'fractions';
        if (tag === 'time') return 'time';
        if (tag === 'measurement') return 'measurement';
        if (tag === 'money') return 'money';
        if (tag === 'geometry') return 'geometry';
        if (tag === 'laq') return 'word problems';
      }
      // Fallback for old questions without tag
      if (section === 'Section A: MCQ' || section === 'Section B: Short Answer') return 'arithmetic';
      if (section === 'Section C: Word Problems') return 'word problems';
    }
    if (section === 'Perbendaharaan Kata') return 'perbendaharaan kata';
    if (section === 'Tatabahasa') return 'tatabahasa';
    if (section === 'Pemahaman') return 'kefahaman';
    if (section === 'Isi Tempat Kosong') return 'isi tempat kosong';
    if (section === 'Pemahaman Mendengar') return 'pemahaman mendengar';
    if (section === 'Number Patterns') return 'number patterns';
    if (section === 'Clever Problem Sums') return 'clever problem sums';
    if (section === 'Logic & Spatial') return 'logic & spatial';
    if (section === 'Mental Maths') return 'mental maths';
    if (section === 'Fractions & Measurement') return 'fractions & measurement';
  }
  if (q.topic) {
    const topic = q.topic;
    if (topic === 'Diversity of Living Things') return 'diversity';
    if (topic === 'Materials') return 'materials';
    if (topic === 'Magnets') return 'magnets';
    if (topic === 'Life Cycles') return 'life cycles';
    if (topic === 'Mixed Review') return 'mixed review';
  }
  return q.section || q.topic || 'General';
}

function validateQuestionBank(QB) {
  const issues = {
    duplicates: [],
    missingFields: [],
    invalidAnswers: [],
    invalidDifficulty: [],
    invalidPool: [],
    unmappedSkills: [],
    malformedQuestions: [],
  };

  const idMap = {}; // Track seen IDs
  let questionCount = 0;

  // Validate each subject
  for (const subject of VALID_SUBJECTS) {
    if (!QB[subject]) continue;

    const questions = QB[subject];
    if (!Array.isArray(questions)) {
      issues.malformedQuestions.push(
        `Subject '${subject}' is not an array. Type: ${typeof questions}`
      );
      continue;
    }

    // Check each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      questionCount++;

      // Check if question is an object
      if (typeof q !== 'object' || q === null) {
        issues.malformedQuestions.push(
          `${subject}[${i}]: Question is not an object. Type: ${typeof q}`
        );
        continue;
      }

      // Check for duplicate ID
      if (q.id) {
        if (idMap[q.id]) {
          issues.duplicates.push(
            `Duplicate ID '${q.id}': Found in ${idMap[q.id]} AND ${subject}[${i}]`
          );
        } else {
          idMap[q.id] = `${subject}[${i}]`;
        }
      }

      // Check required fields
      const missingInQuestion = [];
      const subjectFields = REQUIRED_FIELDS[subject] || REQUIRED_FIELDS.all;
      for (const field of subjectFields) {
        if (!(field in q) || q[field] === undefined) {
          missingInQuestion.push(field);
        }
      }
      if (missingInQuestion.length > 0) {
        issues.missingFields.push(
          `${subject}[${i}] (ID: ${q.id}): Missing fields: ${missingInQuestion.join(', ')}`
        );
      }

      // Check skill mapping
      const skill = getSkill(q);
      if (skill === 'General') {
        issues.unmappedSkills.push(
          `${subject}[${i}] (ID: ${q.id}): Question maps to 'General' skill (unmapped section/topic: ${q.section || q.topic})`
        );
      }

      // Validate answer format
      if (q.opts && q.ans !== undefined) {
        if (typeof q.ans !== 'number' || q.ans < 0 || q.ans >= q.opts.length) {
          issues.invalidAnswers.push(
            `${subject}[${i}] (ID: ${q.id}): Answer index ${q.ans} out of range (options: 0-${q.opts.length - 1})`
          );
        }
      }

      // Validate difficulty if present
      if (q.difficulty && !VALID_DIFFICULTIES.includes(q.difficulty)) {
        issues.invalidDifficulty.push(
          `${subject}[${i}] (ID: ${q.id}): Invalid difficulty '${q.difficulty}'. Must be one of: ${VALID_DIFFICULTIES.join(', ')}`
        );
      }

      // Validate pool if present
      if (q.pool && !VALID_POOLS.includes(q.pool)) {
        issues.invalidPool.push(
          `${subject}[${i}] (ID: ${q.id}): Invalid pool '${q.pool}'. Must be one of: ${VALID_POOLS.join(', ')}`
        );
      }

      // Check for unexpected fields (indicator of malformed questions)
      const unexpectedFields = [];
      const knownFields = [
        'id', 'section', 'topic', 'tag', 'q', 'opts', 'ans', 'exp', 'hint',
        'difficulty', 'pool', 'passage', 'type', 'marks', 'unitPre', 'unit',
        'eng', 'skill', 'diff', 'shuffledOpts', 'originalIdx',
      ];
      for (const key of Object.keys(q)) {
        if (!knownFields.includes(key)) {
          unexpectedFields.push(key);
        }
      }
      // Note: Don't flag as error — focus on critical schema issues only

      // Visual Text / Cloze questions should have passage
      if ((q.section === 'Visual Text' || q.section === 'Grammar Cloze') && !q.passage) {
        issues.missingFields.push(
          `${subject}[${i}] (ID: ${q.id}): ${q.section} question missing 'passage' field`
        );
      }
    }
  }

  // Summary
  const summaryReport = {
    totalQuestions: questionCount,
    totalIssues:
      issues.duplicates.length +
      issues.missingFields.length +
      issues.invalidAnswers.length +
      issues.invalidDifficulty.length +
      issues.invalidPool.length +
      issues.unmappedSkills.length +
      issues.malformedQuestions.length,
    issues,
  };

  return summaryReport;
}

// Print validation report to console
function printValidationReport(QB) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('REYHANACHAMPION - QUESTION BANK VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════\n');

  const report = validateQuestionBank(QB);

  console.log(`✓ Total questions: ${report.totalQuestions}`);
  console.log(`⚠ Total issues found: ${report.totalIssues}\n`);

  if (report.issues.duplicates.length > 0) {
    console.log('🔴 DUPLICATE IDs:');
    report.issues.duplicates.forEach((issue) => console.log(`  - ${issue}`));
    console.log();
  }

  if (report.issues.malformedQuestions.length > 0) {
    console.log('🔴 MALFORMED QUESTIONS:');
    report.issues.malformedQuestions.forEach((issue) => console.log(`  - ${issue}`));
    console.log();
  }

  if (report.issues.missingFields.length > 0) {
    console.log('🟠 MISSING REQUIRED FIELDS:');
    report.issues.missingFields.slice(0, 10).forEach((issue) => console.log(`  - ${issue}`));
    if (report.issues.missingFields.length > 10) {
      console.log(`  ... and ${report.issues.missingFields.length - 10} more`);
    }
    console.log();
  }

  if (report.issues.invalidAnswers.length > 0) {
    console.log('🟠 INVALID ANSWER INDEXES:');
    report.issues.invalidAnswers.slice(0, 10).forEach((issue) => console.log(`  - ${issue}`));
    if (report.issues.invalidAnswers.length > 10) {
      console.log(`  ... and ${report.issues.invalidAnswers.length - 10} more`);
    }
    console.log();
  }

  if (report.issues.invalidDifficulty.length > 0) {
    console.log('🟡 INVALID DIFFICULTY LABELS:');
    report.issues.invalidDifficulty.forEach((issue) => console.log(`  - ${issue}`));
    console.log();
  }

  if (report.issues.invalidPool.length > 0) {
    console.log('🟡 INVALID POOL ASSIGNMENTS:');
    report.issues.invalidPool.forEach((issue) => console.log(`  - ${issue}`));
    console.log();
  }

  if (report.issues.unmappedSkills.length > 0) {
    console.log('🟠 UNMAPPED SKILLS:');
    report.issues.unmappedSkills.slice(0, 10).forEach((issue) => console.log(`  - ${issue}`));
    if (report.issues.unmappedSkills.length > 10) {
      console.log(`  ... and ${report.issues.unmappedSkills.length - 10} more`);
    }
    console.log();
  }

  if (report.totalIssues === 0) {
    console.log('✅ All validations passed! Question bank is clean.\n');
  } else {
    console.log(`\n⚠️  ${report.totalIssues} issue(s) found. Review and fix above.\n`);
  }

  return report;
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateQuestionBank, printValidationReport };
}
