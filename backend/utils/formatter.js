exports.getShortDescription = (desc) => {
  return desc?.split('\n')[0].replace(/`/g, '').slice(0, 120) || '';
};
