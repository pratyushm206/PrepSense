const { validateQuestions } = require('./services/responseValidator');

const validInput = JSON.stringify([
  { id: 1, question: 'Explain binary search', topic: 'arrays', difficulty: 'medium', expectedKeyPoints: ['O(log n)', 'sorted input'] },
  { id: 2, question: 'What is a JOIN?', topic: 'DBMS', difficulty: 'medium', expectedKeyPoints: ['inner join', 'outer join'] }
]);
console.log('Case 1 (all valid):', validateQuestions(validInput));

const mixedInput = JSON.stringify([
  { id: 1, question: 'Explain recursion', topic: 'strings', difficulty: 'easy', expectedKeyPoints: ['base case'] },
  { id: 2, question: 'Missing key points', topic: 'graphs', difficulty: 'easy' },
  { id: 3, question: 'Bad topic', topic: 'data structures', difficulty: 'easy', expectedKeyPoints: ['x'] }
]);
console.log('Case 2 (mixed):', validateQuestions(mixedInput));

try {
  validateQuestions('not json {{{');
} catch (err) {
  console.log('Case 3 (garbage, correctly threw):', err.message);
}