/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */

// import expose from 'comlink';
import { produce } from 'immer';

// enableAllPlugins();

const state = {
  developers: []
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
  const { id, avatar, bio, country } = dev;

  const dob = new Date(bio.dob);
  const names = bio.name.split(' ');
  const name = `${names[0]} ${names[1].charAt(0).toUpperCase()}.`;

  return `
      <div data-dev-id="${id}" class="dev-item">
          <div class="avatar">
              <img data-src="${avatar}" src="https://via.placeholder.com/64" title="${bio.name}" />
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

const processStartDevs = async ({ startDevs }) => produce(state, (draft) => {
  const sink = new Array(startDevs.length);
  draft.developers = startDevs.reduce((processed, dev, index) => {
    processed[index] = dataToDev(dev);
    return processed;
  }, sink);
});

/**
 * exposed Analyzer "API"
 */
const OMTInterface = {
  processStartDevs
};

export default OMTInterface;

// expose(OMTInterface);
