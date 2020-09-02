const arrayviewer = (anArray) => {
  const arrayview = () => ({
    start: 0,
    end: anArray.length,
    length: anArray.length - 0,
    get(index) {
      return anArray[this.start + index];
    },
    toArray() {
      return anArray.slice(this.start, this.end + 1);
    },
    viewAs(dStart, dEnd) {
      this.start = dStart;
      this.end = dEnd || this.end;
      this.length = this.end - this.start;
      console.log(`down to [${this.start}, ${this.end}] with ${this.length} items`);
      return this;
    }
  });

  const view = arrayview();
  const arraypartition = (opts = {}) => {
    const { at: pivot } = opts;
    const pivotIndex = pivot || Math.floor(view.length / 2);
    console.log(`${view.length} items`);
    return {
      midIndex: pivotIndex,
      midItem: view.get(pivotIndex),
      left: () => view.viewAs(view.start, (view.start + pivotIndex) - 1),
      right: () => view.viewAs((view.start + pivotIndex) + 1)
    };
  };
  view.partition = arraypartition;

  return { ...view };
};

export default arrayviewer;
