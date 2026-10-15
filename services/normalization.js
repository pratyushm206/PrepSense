function normalizeCompany(value) {
  return String(value || '').trim().toLowerCase();
}

function companyMatch(company) {
  const key = normalizeCompany(company);
  return {
    $expr: {
      $eq: [
        { $toLower: { $trim: { input: { $ifNull: ['$companyKey', '$company'] } } } },
        key
      ]
    }
  };
}

module.exports = { normalizeCompany, companyMatch };
