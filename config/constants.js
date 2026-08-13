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

module.exports = { TOPICS, DIFFICULTIES, VERDICTS };