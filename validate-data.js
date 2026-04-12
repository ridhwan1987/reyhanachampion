#!/usr/bin/env node
/**
 * Data Validation Script for reyhanachampion Question Bank
 * Checks for duplicate IDs, incomplete entries, invalid answers, etc.
 */

const QB = require('./questions.js');

class DataValidator {
    constructor(qb) {
        this.qb = qb;
        this.issues = {
            duplicateIds: [],
            missingFields: [],
            invalidAnswerIndices: [],
            missingAnswerOptions: [],
            allErrors: []
        };
    }

    validate() {
        console.log('🔍 Starting data validation...\n');
        
        let totalQuestions = 0;
        const idMap = {}; // Track all IDs
        const subjects = Object.keys(this.qb);

        subjects.forEach(subject => {
            const questions = this.qb[subject];
            console.log(`\n📖 Validating ${subject} (${questions.length} questions)...`);
            
            questions.forEach((q, idx) => {
                totalQuestions++;
                
                // Check for duplicate ID
                if (idMap[q.id]) {
                    this.issues.duplicateIds.push({
                        id: q.id,
                        subject,
                        index: idx,
                        previousSubject: idMap[q.id].subject,
                        previousIndex: idMap[q.id].index
                    });
                    this.issues.allErrors.push(`⚠️  DUPLICATE ID '${q.id}' in ${subject}[${idx}] (previously in ${idMap[q.id].subject}[${idMap[q.id].index}])`);
                } else {
                    idMap[q.id] = { subject, index: idx };
                }
                
                // Check for missing required fields
                const requiredFields = ['id', 'q', 'opts', 'ans'];
                requiredFields.forEach(field => {
                    if (!(field in q)) {
                        this.issues.missingFields.push({ id: q.id, subject, field, index: idx });
                        this.issues.allErrors.push(`🔴 MISSING FIELD '${field}' in ${subject}[${idx}] (ID: ${q.id})`);
                    }
                });
                
                // Validate answer index
                if (typeof q.ans === 'number' && q.opts && Array.isArray(q.opts)) {
                    if (q.ans < 0 || q.ans >= q.opts.length) {
                        this.issues.invalidAnswerIndices.push({
                            id: q.id,
                            subject,
                            answerIndex: q.ans,
                            numOptions: q.opts.length
                        });
                        this.issues.allErrors.push(`🔴 INVALID ANSWER INDEX ${q.ans} for ${q.opts.length} options in ${subject}[${idx}] (ID: ${q.id})`);
                    }
                }
                
                // Check if answer exists for non-MCQ questions
                if (q.type === 'text' && !q.ans) {
                    this.issues.missingAnswerOptions.push({ id: q.id, subject });
                    this.issues.allErrors.push(`⚠️  MISSING ANSWER for text-type question in ${subject}[${idx}] (ID: ${q.id})`);
                }
            });
        });

        return this.generateReport(totalQuestions, Object.keys(idMap).length);
    }

    generateReport(totalQuestions, uniqueIds) {
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION REPORT');
        console.log('='.repeat(60) + '\n');
        
        console.log(`📊 STATISTICS:`);
        console.log(`  • Total Questions: ${totalQuestions}`);
        console.log(`  • Unique IDs: ${uniqueIds}`);
        console.log(`  • Subjects: ${Object.keys(this.qb).join(', ')}\n`);
        
        console.log(`⚠️  ISSUES FOUND:\n`);
        console.log(`  • Duplicate IDs: ${this.issues.duplicateIds.length}`);
        console.log(`  • Missing Required Fields: ${this.issues.missingFields.length}`);
        console.log(`  • Invalid Answer Indices: ${this.issues.invalidAnswerIndices.length}`);
        console.log(`  • Missing Answer Options: ${this.issues.missingAnswerOptions.length}`);
        
        const totalIssues = this.issues.allErrors.length;
        console.log(`\n  ✅ TOTAL ERRORS: ${totalIssues}\n`);
        
        if (totalIssues === 0) {
            console.log('✨ No data integrity issues found! Question bank is healthy.\n');
        } else {
            console.log('📋 ERROR DETAILS:\n');
            this.issues.allErrors.forEach(err => console.log(`  ${err}`));
            console.log();
        }
        
        // Detailed breakdowns if needed
        if (this.issues.duplicateIds.length > 0) {
            console.log('\n🔴 DUPLICATE ID DETAILS:');
            this.issues.duplicateIds.forEach(dup => {
                console.log(`  ID '${dup.id}': appears in ${dup.subject}[${dup.index}] and ${dup.previousSubject}[${dup.previousIndex}]`);
            });
        }
        
        return {
            passed: totalIssues === 0,
            totalIssues,
            details: this.issues
        };
    }
}

// Run validation
try {
    const validator = new DataValidator(QB);
    const result = validator.validate();
    process.exit(result.passed ? 0 : 1);
} catch (err) {
    console.error('❌ ERROR DURING VALIDATION:', err.message);
    console.error(err.stack);
    process.exit(2);
}
