const TOPICS = [
  'arrays', 'strings', 'trees', 'graphs', 'dynamic programming',
  'OS', 'DBMS', 'networks', 'system design', 'behavioral'
];

const CATEGORIES = {
  dsa: { label: 'DSA', topics: ['arrays', 'strings', 'trees', 'graphs', 'dynamic programming'] },
  system_design: { label: 'System design', topics: ['system design'] },
  core: { label: 'Core subjects', topics: ['OS', 'DBMS', 'networks'] },
  behavioral: { label: 'Behavioral', topics: ['behavioral'] }
};

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const VERDICTS = ['good', 'average', 'poor'];

const QUESTION_TYPES = ['behavioral', 'mcq', 'dsa-mcq', 'dsa-subjective'];

const SESSION_MODES = ['mcq', 'subjective', 'mixed'];

module.exports = { TOPICS, DIFFICULTIES, VERDICTS, CATEGORIES, QUESTION_TYPES, SESSION_MODES };