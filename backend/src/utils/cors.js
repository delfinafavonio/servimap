function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function createOriginMatcher(value = '') {
  const rules = value.split(',').map((item) => item.trim().replace(/\/$/, '')).filter(Boolean).map((item) => {
    if (!item.includes('*')) return { exact: item };
    const expression = `^${item.split('*').map(escapeRegExp).join('[a-z0-9-]+')}$`;
    return { pattern: new RegExp(expression, 'i') };
  });
  return (origin) => !origin || rules.some((rule) => rule.exact === origin || rule.pattern?.test(origin));
}

module.exports = { createOriginMatcher };
