import { produce } from 'immer';

let STATE = {
  query: '',
  queryMatches: [],
  sorted: {
    byYearOfBirth: []
  },
  staging: [],
  developers: {}
};

export const getState = () => STATE;
export const setState = (fn) => {
  STATE = produce(STATE, fn);
  return STATE;
};

export const getMonths = () => [
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
