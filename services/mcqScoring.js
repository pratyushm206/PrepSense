function scoreMcq(question, selectedOptionIndex) {
  const selected = Number(selectedOptionIndex);
  const isCorrect = selected === Number(question.correctOptionIndex);
  const explanation = question.explanation || '';
  return {
    score: isCorrect ? 100 : 0,
    strengths: isCorrect ? [explanation || 'Correct option selected.'] : [],
    improvements: isCorrect ? [] : [explanation || 'Incorrect option selected.'],
    missedPoints: isCorrect ? [] : ['Selected option does not match the correct answer.'],
    verdict: isCorrect ? 'good' : 'poor',
    explanation,
    evaluationStatus: 'success',
    failureReason: ''
  };
}

module.exports = { scoreMcq };
