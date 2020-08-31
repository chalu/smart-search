const nodeMap = {};

export const useDOMSelector = (root = document) => {
  const find = (selector = '') => {
    const query = selector.trim().replace(/\s+/g, '-');
    return [nodeMap[query], query];
  };

  const domQuery = (method) => (selector) => {
    const [found, query] = find(selector);
    if (found) return found;

    const dom = root[method](selector);
    if (dom) nodeMap[query] = dom;
    return dom;
  };

  const select = domQuery('querySelector');
  const selectAll = domQuery('querySelectorAll');
  return { select, selectAll };
};

export const getDomParser = () => {
  let parser;
  return () => {
    if (parser) return parser;

    parser = new DOMParser();
    return parser;
  };
};

export const log = console.log.bind(this);
