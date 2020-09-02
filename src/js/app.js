/* Some Ideas ==========+
  1. Allow user control speed-of-execution figures
     This will be the 0.75 and 0.25 values in the codebase

  2. Demostrate impact of data-saver mode, as well as when user is on slow (2G) connections

  3. Demonstrate processing on ui-thread, ui-thread with rAF & rIC, and comlink.
     E.g allow the user toggle between these options with a radio button

  4. Consider paginating the image collection with a sort of re-cycler view. This
     should not diminish the initial problem space of optimised processing for large data

  5. Consider using components for the UI elements and don't allow their
     internal implementation details to leak out. Wrap such with a clean API
    e.g Do pBar.turnOn(); pBar.progressTo(50) or pBar.turnOn().progressTo(50)
    instead of pBar.classList.remove('off')

  6. If it makes sense, use HTTP streams so that we dont have to wait to
     fetch all 3.5k records before displaying anything. Can be
     very poor UX on slow connections, even if not displaying any images

  7. Make the current console.log logs viewable as part of the app, visualize / graph
     it if you can. E.g pipe the apps' log through an in-app logger that can also
     output to console.log. Make Console.log output very beautiful

  8. Modularise this file, e.g query handlers can all be in a single separate file

  9. Make this into a PWA, if it makes sense
*/

/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */

// import { wrap } from 'https://unpkg.com/comlink@4.3.0/dist/esm/comlink.mjs';
// import { wrap } from 'comlink';

import OMT from './omt.js';
import { log, useDOMSelector, getDomParser } from './ui-utils.js';

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

// let OMT;
const domParser = getDomParser();
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

// const computeAges = (devIds = [], ages = {}) => {
//   const { min, max, avg } = ages;

//   const id = devIds.shift();
//   if (!id) return { min, max, avg };

//   const dev = id ? uiState.devs.find((d) => d.id === id) : undefined;
//   if (!dev) return { min, max, avg };

//   const yob = new Date(dev.bio.dob).getFullYear();
//   const thisYr = new Date().getFullYear();
//   const age = thisYr - yob;
//   ages.min = Math.min(ages.min || Number.POSITIVE_INFINITY, age);
//   ages.max = Math.max(ages.max || 0, age);
//   ages.total = (ages.total || 0) + age;
//   ages.count = (ages.count || 0) + 1;
//   ages.avg = Math.round(ages.total / ages.count);

//   requestAnimationFrame(() => {
//     ageDisplay.textContent = `Age: ~${ages.avg} | >=${ages.min} | <=${ages.max}`;
//   });
//   return computeAges(devIds, ages);
// };

const skillByCompetency = () => {
  const matcher = /^#[a-z]+\s*(=|>=|<=|!=)\s*[a-z ]+$/i;
  const operatorRegex = /=|>=|<=|!=/;
  const weightedLevels = [
    'Have No Idea',
    'Heard About It',
    'Learning It',
    'Learnt It',
    'Building With It',
    'Built With It',
    'Deployed It',
    'Can Mentor On It',
    'Can Consult On It'
  ];

  const opHandlers = [
    {
      key: /^=$/,
      fn: (tagQry, level, skillGraph) => {
        const tag = tagQry.replace('#', '');
        const found = skillGraph.find(
          ({ skill, competence = '' }) => tag === skill.toLowerCase() && level === competence.toLowerCase()
        );
        return found !== undefined;
      }
    },
    {
      key: /^>=$/,
      fn: (tagQry, level, skillGraph) => {
        const tag = tagQry.replace('#', '');
        const levelWeight = weightedLevels.map((l) => l.toLowerCase()).indexOf(level);
        if (levelWeight < 0) return false;

        const found = skillGraph.find(
          ({ skill, competence = '' }) =>
            tag === skill.toLowerCase() && weightedLevels.indexOf(competence) >= levelWeight
        );
        return found !== undefined;
      }
    }
  ];

  const handler = (query, { tags }) => {
    let status = false;
    const operator = query.match(operatorRegex);

    if (operator && operator[0]) {
      const op = operator[0].trim();
      const opHndlr = opHandlers.find(({ key }) => key.test(`${op}`));

      if (!opHndlr) return status;

      let [tag, level] = query.split(operatorRegex);
      if (!level) return status;

      tag = tag.trim();
      level = level.trim();
      const { fn } = opHndlr;
      status = fn(tag, level, tags);
      // log(`match for ${dev.bio.name}: ${status}`);
    }

    return status;
  };

  return { matcher, handler };
};

const dobInMonthOrYear = () => {
  const matcher = /^@DOB\s*=\s*[a-z]{3,}|\d{4}$/i;
  const handler = (query, dev) => {
    const dob = new Date(dev.bio.dob);
    const qry = (query.split(/=\s*/)[1] || '').trim();

    if (/[a-z]{3,}/.test(qry)) {
      const mth = dob.getMonth();
      const [shortMth, longMth] = months[mth];
      return qry === shortMth.toLowerCase() || qry === longMth.toLowerCase();
    }

    if (/\d{4}/.test(qry)) {
      const year = dob.getFullYear();
      return `${qry}` === `${year}`;
    }

    return false;
  };
  return { matcher, handler };
};

const dobInHalfAYear = () => {
  const matcher = /^@DOB\s*=\s*h[1-2]$/i;
  const handler = (query, dev) => {
    const dob = new Date(dev.bio.dob);
    const mth = dob.getMonth();
    const qry = query.split(/=\s*/)[1];
    return qry === 'h1' ? mth <= 5 : mth >= 6;
  };
  return { matcher, handler };
};

const dobInQuarters = () => {
  const queryMatcher = /^@DOB\s*(=|>=|<=|!=)\s*q[1-4]$/i;
  const operatorRegex = /=|>=|<=|!=/;
  const qtrs = [
    {
      key: /^q1$/,
      data: [0, 2]
    },
    {
      key: /^q2$/,
      data: [3, 5]
    },
    {
      key: /^q3$/,
      data: [6, 8]
    },
    {
      key: /^q4$/,
      data: [9, 11]
    }
  ];

  const opHandlers = [
    {
      key: /^=$/,
      fn: (q, m) => {
        const qtr = qtrs.find(({ key }) => key.test(`${q}`));
        if (!qtr) return false;

        const {
          data: [start, end]
        } = qtr;
        return m >= start && m <= end;
      }
    },
    {
      key: /^!=$/,
      fn: (q, m) =>
        qtrs
          .filter(({ key }) => !key.test(`${q}`))
          .map(({ data }) => {
            const [start, end] = data;
            return m >= start && m <= end;
          })
          .includes(true)
    },
    {
      key: /^>=$/,
      fn: (q, m) => {
        const pos = parseInt(q.charAt(1), 10) - 1;
        return qtrs
          .filter((qtr, index) => index >= pos)
          .map(({ data }) => {
            const [start, end] = data;
            return m >= start && m <= end;
          })
          .includes(true);
      }
    },
    {
      key: /^<=$/,
      fn: (q, m) => {
        const pos = parseInt(q.charAt(1), 10) - 1;
        return qtrs
          .filter((qtr, index) => index >= pos)
          .map(({ data }) => {
            const [start, end] = data;
            return m >= start && m <= end;
          })
          .includes(true);
      }
    }
  ];

  const queryHandler = (query, dev) => {
    const dob = new Date(dev.bio.dob);
    const month = dob.getMonth();
    const operator = query.match(operatorRegex);

    let status = false;
    if (operator && operator[0]) {
      const op = operator[0].trim();
      const opHndlr = opHandlers.find(({ key }) => key.test(`${op}`));

      if (!opHndlr) return status;

      let qry = query.split(operatorRegex)[1];
      if (!qry) return status;

      qry = qry.trim();
      const { fn } = opHndlr;
      status = fn(qry, month);
      // log(`match for ${dev.bio.name}: ${status}`);
    }

    return status;
  };

  return { matcher: queryMatcher, handler: queryHandler };
};

// const timeIsRemaining = (deadline) => {
//   if (deadline && typeof deadline.timeRemaining === 'function') {
//     // TODO if possible, expose what 0.75 represents to the UI and allow the user to control it
//     return parseInt(deadline.timeRemaining() * uiState.idleTimeUsage, 10) > 0;
//   }
//   return false;
// };

const renderAPage = () => {
  const items = uiState.devsToRender.slice();
  const nodes = domParser().parseFromString(items.join(''), 'text/html');
  contentArea.innerHTML = '';
  nodes.body.childNodes.forEach((node) => {
    contentArea.appendChild(node);
    // iObserver.observe(n);
  });

  progressBar.classList.remove('on');
  countDisplay.textContent = `${uiState.devsToRender.length} of ${uiState.allDevsCount}`;
};

const runQuery = async (query) => {
  uiState.devsToRender = await OMT.runQuery(query);
  requestIdleCallback(renderAPage);
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
  const tour = [
    '',
    'make your move ...',
    'start by typing @ or #',
    'there\'s so much you can do',
    ''
  ];

  const endTourOnClick = () => {
    if (tourId) {
      clearInterval(tourId);
      tourIndex = 0;
      requestAnimationFrame(() => {
        searchField.setAttribute('placeholder', '');
      });
    }
  };
  searchField.addEventListener('click', endTourOnClick);

  tourId = setInterval(() => {
    requestAnimationFrame(() => {
      searchField.setAttribute('placeholder', tour[tourIndex]);
      tourIndex = (tourIndex + 1) % tour.length;
    });
  }, 3000);
};

const handleFecthResponse = async ([data]) => {
  const { developers } = data;
  progressBar.value = developers.length;
  log(`Received ${developers.length} devs data ...`);

  if (!uiState.displayedFirstPage) {
    const payload = { developers, isFirstPage: true, pageSize: uiState.pageSize };
    const { devsToRender } = await OMT.processDeveloperData(payload);

    progressBar.value = devsToRender.length;
    uiState.devsToRender = devsToRender;
    uiState.allDevsCount += devsToRender.length;

    requestAnimationFrame(() => {
      select('body').classList.add('ready');
      requestAnimationFrame(renderAPage);
    });
    enableSmartSearch();
    uiState.displayedFirstPage = true;
  }

  const { devsCount } = await OMT.processDeveloperData();
  uiState.allDevsCount += (devsCount - uiState.pageSize);
  requestAnimationFrame(() => {
    countDisplay.textContent = `${uiState.devsToRender.length} of ${uiState.allDevsCount}`;
  });
};

const fetchData = async () => {
  const APIBase = 'https://randomapi.com/api/3qjlr7d4';
  const APIKey = 'LEIX-GF3O-AG7I-6J84';

  // TODO expose devQty from the UI
  const endpoint = `${APIBase}?key=${APIKey}&qty=${uiState.devQty}`;

  progressBar.setAttribute('max', uiState.devQty);
  progressBar.classList.add('on');

  // TODO when we upgrade to streams, communicate
  // fetch progress with the progress bar
  return fetch(endpoint)
    .then((response) => response.json())
    .then(({ results }) => handleFecthResponse(results))
    .catch((error) => log(error));
};

const startApp = () => {
  // TODO the query field should get focus when the app loads
  // TODO consider allowing search input even before data arrives, especially on very slow networks
  // TODO respect data-saver settings and dont fetch images in 2G connections
  // OMT = wrap(new Worker('./js/omt.js', { type: 'module' }));
  fetchData();
};

document.addEventListener('DOMContentLoaded', startApp);
