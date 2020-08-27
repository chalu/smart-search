/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */

// import expose from 'comlink';
import { produce } from 'immer';

// enableAllPlugins();

const state = {
  staging: [],
  developers: {}
};

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

const devToDOMString = (dev) => {
  const {
    id, avatar, bio, country
  } = dev;

  const dob = new Date(bio.dob);
  const names = bio.name.split(' ');
  const name = `${names[0]} ${names[1].charAt(0).toUpperCase()}.`;

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

const processDeveloperData = async (payload) => {
  const { developers, pageSize, isFirstPage = false } = payload;

  let devs = developers;
  if (isFirstPage === true) {
    devs = developers.slice(0, pageSize);
    const processed = produce(state, (draft) => {
      makeDevs(devs, draft.developers);
      draft.staging = developers.slice(pageSize);
    });
    const devsToRender = Object.values(processed.developers).map((d) => d.domString);
    return { devsToRender };
  }

  produce(state, (draft) => {
    if (draft.staging.length > 0) devs = [...draft.staging, ...devs];

    makeDevs(devs, draft.developers);
    draft.staging = [];
  });
  return { developers: ['call the API!'] };
};

/**
 * exposed Analyzer "API"
 */
const OMTInterface = {
  processDeveloperData
};

export default OMTInterface;

// expose(OMTInterface);
