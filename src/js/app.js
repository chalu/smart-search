/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */

import { wrap } from 'https://unpkg.com/comlink@4.3.0/dist/esm/comlink.mjs';
import { logr, useDOMSelector, getDomParser, rICQueue, rAFQueue } from './ui-utils.js';

const uiState = {
  /**
   * how much of the device's
   * main-thread idle time should
   * we use up. Default is 75%
   */
  idleTimeUsage: 0.75,

  /**
   * how many records should the
   * app display at a given time
   */
  pageSize: 12,

  /**
   * how many developer records
   * to fetch from the server.
   * default is 3.5k
   */
  devQty: 1500,

  devsToRender: [],

  allDevsCount: 0,

  displayedFirstPage: false,

  searchDebouncer: undefined
};

let OMT;
const { info, error } = logr('App');
const { select } = useDOMSelector();
const progressBar = select('progress');
const contentArea = select('[data-collection-wrap]');
// const ageDisplay = select('[data-search-wrap] span:nth-child(2)');
const countDisplay = select('[data-search-wrap] span:nth-child(1)');

// const iObserver = new IntersectionObserver((entries) => {
//   const srcBackup = ({ target }) => {
//     // TODO this can be a data-url if it helps to
//     // save bandwidth, latency e.t.c
//     target.src = 'https://placehold.it/48x48.png';
//   };
//   entries
//     .filter((e) => e.isIntersecting === true)
//     .forEach(({ target }) => {
//       // TODO consider un-observing the IMG elements as well
//       requestAnimationFrame(() => {
//         const img = target.querySelector('img');
//         if (img && !img.hasAttribute('src') && img.hasAttribute('data-src')) {
//           img.addEventListener('error', srcBackup);
//           img.setAttribute('src', img.getAttribute('data-src'));
//         }
//       });
//     });
// });

// const timeIsRemaining = (deadline) => {
//   if (deadline && typeof deadline.timeRemaining === 'function') {
//     // TODO if possible, expose what 0.75 represents to the UI and allow the user to control it
//     return parseInt(deadline.timeRemaining() * uiState.idleTimeUsage, 10) > 0;
//   }
//   return false;
// };

const renderAPage = (queue) => () => rAFQueue(...queue);

const batchDevsToRender = (state) => {
  const batchSize = 4;
  const devs = uiState.devsToRender.slice();
  const batches = devs
    .map((_, i) => (i % batchSize ? [] : devs.slice(i, i + batchSize)))
    .filter((batch) => batch.length >= 1);

  const placeholders = Array.from(contentArea.querySelectorAll('.dev-item'));
  state.batches = batches.map((devsInBatch) => () => devsInBatch.forEach((dev) => {
    if (!dev) return;

    const dom = placeholders.shift();
    if (!dom) return;

    const {
      id, avatar, bio, country
    } = dev;

    dom.setAttribute('data-dev-id', id);

    const img = dom.querySelector('img');
    img.setAttribute('data-src', avatar);
    img.setAttribute('title', bio.name);

    dom.querySelector('.about p:nth-child(1)').textContent = bio.shortName;
    dom.querySelector('.about p:nth-child(2)').textContent = `${bio.mob[0]}, ${bio.yob}`;
    dom.querySelector('.about p:nth-child(3)').textContent = country;
  }));
};

const padDevsToRenderBatches = (state) => {
  const renderChain = [
    () => {
      progressBar.classList.remove('on');
      countDisplay.textContent = `${uiState.devsToRender.length} of ${uiState.allDevsCount}`;
      const placeholders = contentArea.querySelectorAll('.dev-item');
      placeholders.forEach((pl) => pl.removeAttribute('listed'));
    },
    ...state.batches,
    () => {
      const placeholders = Array.from(contentArea.querySelectorAll('.dev-item'));
      placeholders.slice(0, uiState.pageSize + 1).forEach((pl) => pl.setAttribute('listed', ''));
    }
  ];

  state.renderFn = renderAPage(renderChain);
};

const displayBatchedDevs = ({ renderFn }) => renderFn();

const scheduleRenderDevs = () => {
  rICQueue({ state: {} }, batchDevsToRender, padDevsToRenderBatches, displayBatchedDevs);
};

const runQuery = async (query) => {
  uiState.devsToRender = await OMT.runQuery(query);
  scheduleRenderDevs();
};

let queryPromise = Promise.resolve();
const onSearchInput = ({ target }) => {
  if (uiState.searchDebouncer) clearTimeout(uiState.searchDebouncer);

  const input = (target.value || '').trim();
  if (input === '') return;

  const queryFormat = /[@|#]\w+\s*[=]\s*\w+/;
  if (!queryFormat.test(input)) return;

  uiState.searchDebouncer = setTimeout(() => {
    queryPromise.then(() => {
      queryPromise = runQuery(input);
      return queryPromise;
    });
  }, 1000);
};

const enableSmartSearch = () => {
  const searchField = select('input');
  searchField.addEventListener('input', onSearchInput);
  searchField.focus();

  let tourId;
  let tourIndex = 0;
  const tour = ['', 'make your move ...', 'start by typing @ or #', "there's so much you can do", ''];
  const getNextTourStep = () => {
    const step = tour[tourIndex];
    tourIndex = (tourIndex + 1) % tour.length;
    return step;
  };

  const endTourOnClick = () => {
    requestIdleCallback(() => {
      if (tourId) {
        tourIndex = 0;
        requestAnimationFrame(() => {
          searchField.setAttribute('placeholder', '');
        });
        clearInterval(tourId);
      }
    });
  };
  searchField.addEventListener('click', endTourOnClick);

  tourId = setInterval(() => {
    requestAnimationFrame(() => {
      const step = getNextTourStep();
      searchField.setAttribute('placeholder', `${step}`);
    });
  }, 3000);
};

const handleFecthResponse = async ([data]) => {
  const { developers } = data;
  progressBar.value = developers.length;
  info(`Received ${developers.length} devs data ...`);

  if (!uiState.displayedFirstPage) {
    const payload = { developers, isFirstPage: true, pageSize: uiState.pageSize };
    const { devsToRender } = await OMT.processDeveloperData(payload);

    progressBar.value = devsToRender.length;
    uiState.devsToRender = devsToRender;
    uiState.allDevsCount += devsToRender.length;

    requestAnimationFrame(() => select('body').classList.add('ready'));
    scheduleRenderDevs();
    enableSmartSearch();
    uiState.displayedFirstPage = true;
  }

  const { devsCount } = await OMT.processDeveloperData();
  uiState.allDevsCount += devsCount - uiState.pageSize;
  requestAnimationFrame(() => {
    countDisplay.textContent = `${uiState.devsToRender.length} of ${uiState.allDevsCount}`;
  });
};

const fetchData = async () => {
  const APIBase = 'https://randomapi.com/api/3qjlr7d4';
  const APIKey = 'LEIX-GF3O-AG7I-6J84';

  // TODO expose devQty from the UI
  const endpoint = `${APIBase}?key=${APIKey}&qty=${uiState.devQty}`;

  // TODO when we upgrade to streams, communicate
  // fetch progress with the progress bar
  return fetch(endpoint)
    .then((response) => response.json())
    .then(({ results }) => handleFecthResponse(results))
    .catch((err) => error(err));
};

const startApp = async () => {
  progressBar.setAttribute('max', uiState.devQty);

  const worker = new Worker('./js/off-main-thread/omt.js');
  OMT = wrap(worker);

  fetchData();
};

document.addEventListener('DOMContentLoaded', startApp);
