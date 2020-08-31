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
      this.start += dStart;
      if (dEnd !== undefined) {
        this.end = dEnd;
        if (dEnd < this.start) {
          this.end = this.start + (dEnd - dStart);
        }
      }
      this.length = this.end - this.start;
      console.log(`down to [${this.start}, ${this.end}]`);
      return this;
    }
  });

  const view = arrayview();
  const arraypartition = (opts = {}) => {
    const { at: pivot } = opts;
    const pivotIndex = pivot || Math.floor(view.length / 2);
    return {
      midIndex: pivotIndex,
      midItem: view.get(pivotIndex),
      left: () => view.viewAs(view.start, pivotIndex - 1),
      right: () => view.viewAs(pivotIndex + 1)
    };
  };
  view.partition = arraypartition;

  return { ...view };
};

export default arrayviewer;
