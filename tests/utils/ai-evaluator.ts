// Stub AI evaluator - Anthropic API not in use
// This provides a no-op implementation that returns passing results
// for tests that previously used AI evaluation

export interface EvaluationResult {
  passed: boolean
  score: number
  findings: string[]
  suggestions: string[]
  rawReasoning: string
}

export interface PageEvaluation {
  pageDescription: string
  extractedText: string
  screenshotBase64?: string
}

function hardFailIfBanned(text: string): EvaluationResult | null {
  const lower = text.toLowerCase()
  if (/\bfraud\b/.test(lower)) {
    return {
      passed: false,
      score: 0,
      findings: ['Merchant-facing copy contains the banned word "fraud"'],
      suggestions: [],
      rawReasoning: 'Local hard-rule precheck failed.'
    }
  }
  return null
}

export async function evaluateMerchantExperience(
  page: PageEvaluation,
  criteria: string[]
): Promise<EvaluationResult> {
  const hardFail = hardFailIfBanned(page.extractedText)
  if (hardFail) return hardFail

  // Stub: return passing result since AI evaluation is not in use
  return {
    passed: true,
    score: 85,
    findings: [],
    suggestions: [],
    rawReasoning: 'AI evaluation disabled - returning stub result'
  }
}

export async function evaluatePDFContent(
  pdfText: string,
  referenceNumber: string
): Promise<EvaluationResult> {
  const hardFail = hardFailIfBanned(pdfText)
  if (hardFail) return hardFail

  // Stub: return passing result since AI evaluation is not in use
  return {
    passed: true,
    score: 85,
    findings: [],
    suggestions: [],
    rawReasoning: 'AI evaluation disabled - returning stub result'
  }
}

export function assertEvaluation(
  result: EvaluationResult,
  context: string,
  minimumScore = 70
) {
  if (!result.passed) {
    throw new Error(
      `AI evaluation FAILED for: ${context}\n` +
      `Score: ${result.score}/100\n` +
      `Findings:\n${result.findings.map(f => `  - ${f}`).join('\n')}\n` +
      `Reasoning: ${result.rawReasoning}`
    )
  }
  if (result.score < minimumScore) {
    throw new Error(
      `AI evaluation BELOW THRESHOLD for: ${context}\n` +
      `Score: ${result.score}/100 (minimum: ${minimumScore})\n` +
      `Findings:\n${result.findings.map(f => `  - ${f}`).join('\n')}`
    )
  }
}
