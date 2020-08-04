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

const state = {};
const months = [
  ['Jan', 'January'],
  ['Feb', 'February'],
  ['Mar', 'March'],
  ['Apr', 'April'],
  ['May', 'May'],
  ['Jun', 'June'],
  ['Jul', 'July'],
  ['Aug', 'August'],
  ['Sept', 'September'],
  ['Oct', 'October'],
  ['Nov', 'November'],
  ['Dec', 'December']
];

const getProgressBar = () => {
  let pBar;
  return () => {
    if (pBar) return pBar;

    pBar = document.querySelector('progress');
    return pBar;
  };
};

const pBar = getProgressBar();

const getDomParser = () => {
  let parser;
  return () => {
    if (parser) return parser;

    parser = new DOMParser();
    return parser;
  };
};

const getContentArea = () => {
  let root;
  return () => {
    if (root) return root;

    root = document.querySelector('[data-collection-wrap]');
    return root;
  };
};

const getCountDisplay = () => {
  let node;
  return () => {
    if (node) return node;

    node = document.querySelector('[data-search-wrap] span:nth-child(1)');
    return node;
  };
};

const getAgeDisplay = () => {
  let node;
  return () => {
    if (node) return node;

    node = document.querySelector('[data-search-wrap] span:nth-child(2)');
    return node;
  };
};

const iObserver = new IntersectionObserver((entries) => {
  const srcBackup = ({ target }) => {
    // TODO this can be a data-url if it helps to
    // save bandwidth, latency e.t.c
    target.src = 'https://placehold.it/48x48.png';
  };
  entries
    .filter((e) => e.isIntersecting === true)
    .forEach(({ target }) => {
      // TODO consider un-observing the IMG elements as well
      requestAnimationFrame(() => {
        const img = target.querySelector('img');
        if (img && !img.hasAttribute('src') && img.hasAttribute('data-src')) {
          img.addEventListener('error', srcBackup);
          img.setAttribute('src', img.getAttribute('data-src'));
        }
      });
    });
});

const computeAges = (devIds = [], ages = {}) => {
  const { min, max, avg } = ages;

  const id = devIds.shift();
  if (!id) return { min, max, avg };

  const dev = id ? state.devs.find((d) => d.id === id) : undefined;
  if (!dev) return { min, max, avg };

  const yob = new Date(dev.bio.dob).getFullYear();
  const thisYr = new Date().getFullYear();
  const age = thisYr - yob;
  ages.min = Math.min(ages.min || Number.POSITIVE_INFINITY, age);
  ages.max = Math.max(ages.max || 0, age);
  ages.total = (ages.total || 0) + age;
  ages.count = (ages.count || 0) + 1;
  ages.avg = Math.round(ages.total / ages.count);

  requestAnimationFrame(() => {
    const ageDisplay = getAgeDisplay();
    ageDisplay().textContent = `Age: ~${ages.avg} | >=${ages.min} | <=${ages.max}`;
  });
  return computeAges(devIds, ages);
};

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
          ({ skill, competence = '' }) => tag
            === skill.toLowerCase() && weightedLevels.indexOf(competence) >= levelWeight
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
      // console.log(`match for ${dev.bio.name}: ${status}`);
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
      fn: (q, m) => (qtrs
        .filter(({ key }) => !key.test(`${q}`))
        .map(({ data }) => {
          const [start, end] = data;
          return m >= start && m <= end;
        })
        .includes(true))
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
      // console.log(`match for ${dev.bio.name}: ${status}`);
    }

    return status;
  };

  return { matcher: queryMatcher, handler: queryHandler };
};

const makeARow = (dev) => {
  const {
    id, avatar, bio, country
  } = dev;

  const dob = new Date(bio.dob);
  const names = bio.name.split(' ');
  const name = `${names[0]} ${names[1].charAt(0).toUpperCase()}.`;

  return `
    <div data-dev-id="${id}" class="dev-item">
        <div class="avatar">
            <img data-src="${avatar}" title="${bio.name}" />
        </div>
        <div class="about">
            <p>${name}</p>
            <p>${months[dob.getMonth()][0]}, ${dob.getFullYear()}</p>
            <p>${country}</p>
        </div>
    </div>
  `;
};

const displayMatches = () => {
  const queue = state.processQueue.splice(0);
  if (queue.length <= 0) {
    console.log(state.matched.length);
    computeAges(state.matched);
    return;
  }

  state.matched = [...state.matched, ...queue];
  console.log(`Queue: ${queue.length}, Matched: ${state.matched.length}`);

  const devDOM = [...document.querySelectorAll('.dev-item')];
  devDOM.forEach((div) => {
    const id = div.dataset.devId;
    if (id && !state.matched.includes(id)) {
      div.classList.remove('matched');
    }
  });

  queue.forEach((devId) => {
    const div = document.querySelector(`[data-dev-id="${devId}"]`);
    if (div) {
      div.classList.add('matched');
    }
  });

  const matchedLen = state.matched.length;
  const dataWrap = document.querySelector('[data-collection-wrap]');
  const recordStatus = getCountDisplay();
  recordStatus().textContent = `${matchedLen} of ${state.devs.length}`;
  if (matchedLen >= 1 && !dataWrap.classList.contains('filtered')) {
    dataWrap.classList.add('filtered');
  }

  requestAnimationFrame(displayMatches);
};

const processQuery = (deadline) => {
  while (
    // TODO 0.75 should be an intuitively named top-level constant
    // TODO if possible, expose what 0.75 represents to the UI and allow the user to control it
    parseInt(deadline.timeRemaining() * 0.75, 10) > 0
      && state.queueIndex < state.devs.length
  ) {
    const dev = state.devs[state.queueIndex];
    const matched = state.queryHandler(state.query, dev);
    if (matched === true) {
      state.processQueue.push(dev.id);
    }
    state.queueIndex += 1;
  }

  requestAnimationFrame(displayMatches);
  if (state.queueIndex < state.devs.length) {
    requestIdleCallback(processQuery);
  }
};

const queryData = ({ target }) => {
  if (state.status === 'LOADING') return;

  const utterance = (target.value || '').toLowerCase();
  const dataWrap = document.querySelector('[data-collection-wrap]');
  const devsLen = state.devs.length;
  const queryStatus = getCountDisplay();
  const ageStatus = getAgeDisplay();
  if (utterance === '') {
    dataWrap.classList.remove('filtered');
    ageStatus().textContent = '';
    queryStatus().textContent = `${devsLen} of ${devsLen}`;
    return;
  }

  const parts = utterance.split(/&\s*/).map((q) => (q || '').trim());
  const query = parts[parts.length - 1];
  const isInValidQuery = query.length <= 2;

  if (isInValidQuery) {
    dataWrap.classList.remove('filtered');
    ageStatus().textContent = '';
    queryStatus().textContent = `${devsLen} of ${devsLen}`;
    return;
  }

  const qHandler = state.queryHandlers.find(({ matcher }) => matcher
    && matcher.test(query) === true);

  if (!qHandler) {
    dataWrap.classList.remove('filtered');
    ageStatus().textContent = '';
    queryStatus().textContent = `${devsLen} of ${devsLen}`;
    return;
  }

  state.matched = [];
  state.query = query;
  state.queueIndex = 0;
  state.processQueue = [];
  state.queryHandler = qHandler.handler;

  requestIdleCallback(processQuery);
};

const displayData = () => {
  const queue = state.processQueue.splice(0);
  console.log(`Load Queue: ${queue.length}`);

  const devsLength = state.devs.length;
  const recordStatus = getCountDisplay();
  recordStatus().textContent = `${state.queueIndex} of ${devsLength}`;

  if (state.queueIndex >= devsLength - 1) {
    // TODO `.classList.remove('on');` call means internal implementation details are leaking out
    pBar().classList.remove('on');
  }

  if (queue.length <= 0) return;

  pBar().value = state.queueIndex;
  const domParser = getDomParser();
  const nodes = domParser().parseFromString(queue.join(''), 'text/html');

  const content = getContentArea();
  nodes.body.childNodes.forEach((n) => {
    content().appendChild(n);
    iObserver.observe(n);
  });

  requestAnimationFrame(displayData);
};

const timeIsRemaining = (deadline) => {
  if (deadline && typeof deadline.timeRemaining === 'function') {
    // TODO 0.25 should be an intuitively named top-level constant
    // TODO if possible, expose what 0.25 represents to the UI and allow the user to control it
    return parseInt(deadline.timeRemaining() * 0.25, 10) > 0;
  }
  return false;
};

const queueHasItems = () => state.queueIndex < state.devs.length;

const enableSmartSearch = () => {
  state.queryHandlers = [];
  state.queryHandlers.push(dobInMonthOrYear());
  state.queryHandlers.push(dobInHalfAYear());
  state.queryHandlers.push(dobInQuarters());
  state.queryHandlers.push(skillByCompetency());

  const searchField = document.querySelector('input');
  searchField.addEventListener('input', queryData);
  searchField.focus();
};

const processData = (deadline) => {
  state.status = 'LOADING';
  while (timeIsRemaining(deadline) && queueHasItems()) {
    state.processQueue.push(makeARow(state.devs[state.queueIndex]));
    state.queueIndex += 1;
  }

  requestAnimationFrame(displayData);
  if (queueHasItems()) {
    requestIdleCallback(processData);
    return;
  }

  state.status = 'IDLE';
  enableSmartSearch();
};

const handleResponse = ([data]) => {
  console.log('Received API data ...');
  const { developers } = data;

  state.devs = developers;
  state.queueIndex = 0;
  state.processQueue = [];

  pBar().setAttribute('max', state.devs.length);
  pBar().classList.add('on');
  requestIdleCallback(processData);
};

const fetchData = () => {
  const APIBase = 'https://randomapi.com/api';
  const APIKey = 'b02322d7f185419feaab65646b807469';
  const endpoint = `${APIBase}/${APIKey}`;

  fetch(endpoint)
    .then((response) => response.json())
    .then(({ results }) => handleResponse(results))
    .catch((error) => console.log(error));
};

const startApp = () => {
  // TODO the query field should get focus when the app loads
  // TODO consider allowing search input even before data arrives, especially on very slow networks
  // TODO respect data-saver settings and dont fetch images in 2G connections
  fetchData();
};

document.addEventListener('DOMContentLoaded', startApp);
