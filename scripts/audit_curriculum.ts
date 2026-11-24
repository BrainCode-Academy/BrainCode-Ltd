import fs from 'node:fs';
import path from 'node:path';
import {
  formatCurriculumQualityReportSummary,
  generateStructuredCurriculumQualityReport,
} from '../server/curriculum_audit.ts';

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const noWrite = args.includes('--no-write');
  const failOnCritical = args.includes('--fail-on-critical');
  const outArg = args.find((a) => a.startsWith('--out='));
  const outputPath = path.resolve(
    process.cwd(),
    outArg ? outArg.slice('--out='.length) : path.join('data', 'curriculum-quality-report.json')
  );

  const report = generateStructuredCurriculumQualityReport();

  if (!noWrite) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatCurriculumQualityReportSummary(report));
    if (!noWrite) {
      console.log(`\nSaved structured report -> ${path.relative(process.cwd(), outputPath)}`);
    }
  }

  if (failOnCritical && report.summary.criticalGaps > 0) {
    process.exit(1);
  }
}

main();
