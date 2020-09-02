/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */

// import expose from 'comlink';
// import { produce } from 'immer';
// import arrayviewer from './array-wrap.js';

import engines from './search-engines';
import { getState, setState, getMonths } from './state';

const sortDevs = async (developers) => {
  const devs = developers.slice();
  engines.forEach(({ type, sorter, indexer }) => {
    const sorted = devs.sort(sorter);
    setState((draft) => {
      draft.sorted[type] = sorted.map(indexer);
    });
  });
  // console.log(getState().sorted.byYearOfBirth);
};

const devToDOMString = (dev) => {
  const {
    id, avatar, bio, country
  } = dev;

  const dob = new Date(bio.dob);
  const names = bio.name.split(' ');
  const name = `${names[0]} ${names[1].charAt(0).toUpperCase()}.`;
  const months = getMonths();

  return `
      <div data-dev-id="${id}" class="dev-item">
          <div class="avatar">
              <img data-src="${avatar}" title="${bio.name}"
                src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 12c1.65 0 3-1.35 3-3s-1.35-3-3-3-3 1.35-3 3 1.35 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 8.58c0-2.5-3.97-3.58-6-3.58s-6 1.08-6 3.58V18h12v-1.42zM8.48 16c.74-.51 2.23-1 3.52-1s2.78.49 3.52 1H8.48zM19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>' />
          </div>
          <div class="about">
              <p>${name}</p>
              <p>${months[dob.getMonth()][0]}, ${dob.getFullYear()}</p>
              <p>${country}</p>
          </div>
      </div>
    `;
};

const dataToDev = (dev) => {
  const { bio } = dev;
  const months = getMonths();

  bio.dob = new Date(bio.dob);
  bio.yob = bio.dob.getFullYear();
  bio.mob = months[bio.dob.getMonth()];
  const thisYr = new Date().getFullYear();
  bio.age = thisYr - bio.yob;

  const names = bio.name.split(' ');
  bio.shortName = `${names[0]} ${names[1].charAt(0).toUpperCase()}.`;

  dev.bio = bio;
  dev.domString = devToDOMString(dev);
  return dev;
};

const makeDevs = (devs, sink) => devs.reduce((processed, dev) => {
  if (dev) processed[dev.id] = dataToDev(dev);
  return processed;
}, sink);

const processDeveloperData = async (payload = {}) => {
  const { pageSize, developers = [], isFirstPage = false } = payload;

  let devs = developers;
  if (isFirstPage === true) {
    devs = developers.slice(0, pageSize);
    setState((draft) => {
      makeDevs(devs, draft.developers);
      draft.staging = developers.slice(pageSize);
    });

    const state = getState();
    const devsToRender = Object.values(state.developers).map((d) => d.domString);
    return { devsToRender };
  }

  setState((draft) => {
    if (draft.staging.length > 0) devs = [...draft.staging, ...devs];
    makeDevs(devs, draft.developers);
    draft.staging = [];
  });

  // TODO dont sort the entire collection every time!!
  const state = getState();
  sortDevs(Object.values(state.developers));
  return { devsCount: Object.keys(state.developers).length };
};

const runQuery = async (query) => {
  console.log(query);
  const engine = engines.find(({ matcher }) => matcher && matcher.test(query) === true);
  if (!engine) return []; // no matches found

  setState((draft) => {
    draft.query = query;
  });

  const matchingIndexes = engine.search(query);
  // console.log(matchingIndexes);

  if (matchingIndexes && matchingIndexes.length > 0) {
    const gatherer = new Array(matchingIndexes.length);
    const matched = matchingIndexes.reduce((matches, { id }, pos) => {
      const state = getState();
      const dev = state.developers[id];
      if (dev) matches[pos] = dev.domString;
      return matches;
    }, gatherer);

    setState((draft) => {
      draft.queryMatches = matched;
    });

    const state = getState();
    return state.queryMatches;
  }

  return []; // no matches found
};

/**
 * exposed web-worker-ready "API"
 */
const OffMainThreadAPI = {
  runQuery,
  processDeveloperData
};

export default OffMainThreadAPI;
// expose(OffMainThreadAPI);
