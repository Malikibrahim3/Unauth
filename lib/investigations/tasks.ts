export const investigationTaskKey = {
  response: (investigationId: string) => `investigation:${investigationId}:response`,
  review: (investigationId: string) => `investigation:${investigationId}:review`,
  chase: (investigationId: string, dueAt: string) =>
    `investigation:${investigationId}:chase:${dueAt}`,
  customerDecision: (caseId: string) => `case:${caseId}:customer-decision`,
};

