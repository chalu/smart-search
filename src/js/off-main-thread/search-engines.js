import arrayviewer from './array-wrap';
import { getState, getMonths } from './state';

const searchByFaningOut = (payload) => {
  const { midIndex, data, isEQ } = payload;
  const start = data.start + midIndex;
  console.log(`fanning out @ [${midIndex}], which resolves to [${start}]`);
  console.log(`your results should be the closest neighbours of [${start}] ....`);

  let left = midIndex;
  let right = midIndex;

  while (left > 0) {
    if (isEQ(data.get(left - 1))) {
      left -= 1;
    } else {
      break;
    }
  }

  while (right < data.length) {
    if (isEQ(data.get(right + 1))) {
      right += 1;
    } else {
      break;
    }
  }

  const effectiveLeft = start - (midIndex - left);
  // Add 1 to make room in effectiveRight for
  // array.slice() which is what .toArray() uses
  const effectiveRight = start + (right - midIndex) + 1;
  return data.viewAs(effectiveLeft, effectiveRight).toArray().filter(isEQ);
};

const runBinarySearch = (payload) => {
  const { data, isEQ, isGT } = payload;
  const itemsLen = data.length;

  // At below 5 items, not sure there's need to further
  // split the sorted (data) array, we can just quickly filter
  // for our matches. Need a way to determine what 5 should be.
  if (itemsLen <= 5) return data.toArray().filter(isEQ);

  const partition = data.partition();
  const { midItem, midIndex } = partition;
  if (isEQ(midItem) === true) {
    return searchByFaningOut({
      midIndex,
      data,
      isEQ
    });
  }

  const { left, right } = partition;
  console.log(`pivoting @ [${midIndex}]`);
  const dataView = isGT(midItem) === true ? left() : right();
  return runBinarySearch({
    isEQ,
    isGT,
    data: dataView
  });
};

const searchByYearOfBirth = (query) => {
  // This can currently only search with
  // = (e.g @dob = 1990). TODO: add support
  // for !=, >, >=, <, <=
  const qry = (query.split(/=\s*/)[1] || '').trim();

  // search by 4 digit year, e.g 1985
  if (/\d{4}/.test(qry)) {
    console.log('searching by year');
    const queryYear = parseInt(qry, 10);
    const isGT = ({ yob }) => yob > queryYear;
    const isEQ = ({ yob }) => yob === queryYear;
    const isLTE = ({ yob }) => yob <= queryYear;
    const data = arrayviewer(getState().sorted.byYearOfBirth);

    return runBinarySearch({
      isEQ,
      isGT,
      isLTE,
      data
    });
  }

  return undefined;
};

const searchByMonthOfBirth = (query) => [query];

const engines = [
  {
    type: 'byYearOfBirth',
    // match @dob = 1985
    matcher: /^@dob\s*=\s*\d{4}$/i,
    sorter: (devA, devB) => devA.bio.dob - devB.bio.dob,
    indexer: (dev) => {
      const yob = dev.bio.dob.getFullYear();
      return { id: dev.id, yob };
    },
    search: searchByYearOfBirth
  },
  {
    type: 'byMonthOfBirth',
    // TODO change this: match @dob = Aug | August
    matcher: /^@dob\s*=\s*[a-z]{3,}$/i,
    sorter: (devA, devB) => devA.bio.dob.getMonth() - devB.bio.dob.getMonth(),
    indexer: (dev) => {
      const mob = dev.bio.dob.getMonth();
      const months = getMonths();
      return { id: dev.id, mob: months[mob] };
    },
    search: searchByMonthOfBirth
  }
];

export default engines;

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

// const skillByCompetency = () => {
//     const matcher = /^#[a-z]+\s*(=|>=|<=|!=)\s*[a-z ]+$/i;
//     const operatorRegex = /=|>=|<=|!=/;
//     const weightedLevels = [
//       'Have No Idea',
//       'Heard About It',
//       'Learning It',
//       'Learnt It',
//       'Building With It',
//       'Built With It',
//       'Deployed It',
//       'Can Mentor On It',
//       'Can Consult On It'
//     ];

//     const opHandlers = [
//       {
//         key: /^=$/,
//         fn: (tagQry, level, skillGraph) => {
//           const tag = tagQry.replace('#', '');
//           const found = skillGraph.find(
//             ({ skill, competence = '' }) => tag === skill.toLowerCase()
//                    && level === competence.toLowerCase()
//           );
//           return found !== undefined;
//         }
//       },
//       {
//         key: /^>=$/,
//         fn: (tagQry, level, skillGraph) => {
//           const tag = tagQry.replace('#', '');
//           const levelWeight = weightedLevels.map((l) => l.toLowerCase()).indexOf(level);
//           if (levelWeight < 0) return false;

//           const found = skillGraph.find(
//             ({ skill, competence = '' }) =>
//               tag === skill.toLowerCase() && weightedLevels.indexOf(competence) >= levelWeight
//           );
//           return found !== undefined;
//         }
//       }
//     ];

//     const handler = (query, { tags }) => {
//       let status = false;
//       const operator = query.match(operatorRegex);

//       if (operator && operator[0]) {
//         const op = operator[0].trim();
//         const opHndlr = opHandlers.find(({ key }) => key.test(`${op}`));

//         if (!opHndlr) return status;

//         let [tag, level] = query.split(operatorRegex);
//         if (!level) return status;

//         tag = tag.trim();
//         level = level.trim();
//         const { fn } = opHndlr;
//         status = fn(tag, level, tags);
//         // log(`match for ${dev.bio.name}: ${status}`);
//       }

//       return status;
//     };

//     return { matcher, handler };
//   };

//   const dobInMonthOrYear = () => {
//     const matcher = /^@DOB\s*=\s*[a-z]{3,}|\d{4}$/i;
//     const handler = (query, dev) => {
//       const dob = new Date(dev.bio.dob);
//       const qry = (query.split(/=\s*/)[1] || '').trim();

//       if (/[a-z]{3,}/.test(qry)) {
//         const mth = dob.getMonth();
//         const [shortMth, longMth] = months[mth];
//         return qry === shortMth.toLowerCase() || qry === longMth.toLowerCase();
//       }

//       if (/\d{4}/.test(qry)) {
//         const year = dob.getFullYear();
//         return `${qry}` === `${year}`;
//       }

//       return false;
//     };
//     return { matcher, handler };
//   };

//   const dobInHalfAYear = () => {
//     const matcher = /^@DOB\s*=\s*h[1-2]$/i;
//     const handler = (query, dev) => {
//       const dob = new Date(dev.bio.dob);
//       const mth = dob.getMonth();
//       const qry = query.split(/=\s*/)[1];
//       return qry === 'h1' ? mth <= 5 : mth >= 6;
//     };
//     return { matcher, handler };
//   };

//   const dobInQuarters = () => {
//     const queryMatcher = /^@DOB\s*(=|>=|<=|!=)\s*q[1-4]$/i;
//     const operatorRegex = /=|>=|<=|!=/;
//     const qtrs = [
//       {
//         key: /^q1$/,
//         data: [0, 2]
//       },
//       {
//         key: /^q2$/,
//         data: [3, 5]
//       },
//       {
//         key: /^q3$/,
//         data: [6, 8]
//       },
//       {
//         key: /^q4$/,
//         data: [9, 11]
//       }
//     ];

//     const opHandlers = [
//       {
//         key: /^=$/,
//         fn: (q, m) => {
//           const qtr = qtrs.find(({ key }) => key.test(`${q}`));
//           if (!qtr) return false;

//           const {
//             data: [start, end]
//           } = qtr;
//           return m >= start && m <= end;
//         }
//       },
//       {
//         key: /^!=$/,
//         fn: (q, m) =>
//           qtrs
//             .filter(({ key }) => !key.test(`${q}`))
//             .map(({ data }) => {
//               const [start, end] = data;
//               return m >= start && m <= end;
//             })
//             .includes(true)
//       },
//       {
//         key: /^>=$/,
//         fn: (q, m) => {
//           const pos = parseInt(q.charAt(1), 10) - 1;
//           return qtrs
//             .filter((qtr, index) => index >= pos)
//             .map(({ data }) => {
//               const [start, end] = data;
//               return m >= start && m <= end;
//             })
//             .includes(true);
//         }
//       },
//       {
//         key: /^<=$/,
//         fn: (q, m) => {
//           const pos = parseInt(q.charAt(1), 10) - 1;
//           return qtrs
//             .filter((qtr, index) => index >= pos)
//             .map(({ data }) => {
//               const [start, end] = data;
//               return m >= start && m <= end;
//             })
//             .includes(true);
//         }
//       }
//     ];

//     const queryHandler = (query, dev) => {
//       const dob = new Date(dev.bio.dob);
//       const month = dob.getMonth();
//       const operator = query.match(operatorRegex);

//       let status = false;
//       if (operator && operator[0]) {
//         const op = operator[0].trim();
//         const opHndlr = opHandlers.find(({ key }) => key.test(`${op}`));

//         if (!opHndlr) return status;

//         let qry = query.split(operatorRegex)[1];
//         if (!qry) return status;

//         qry = qry.trim();
//         const { fn } = opHndlr;
//         status = fn(qry, month);
//         // log(`match for ${dev.bio.name}: ${status}`);
//       }

//       return status;
//     };

//     return { matcher: queryMatcher, handler: queryHandler };
//   };
