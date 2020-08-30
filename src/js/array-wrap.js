const arrayviewer = (anArray) => {
  let start = 0;
  let end = anArray.length;
  const array = anArray;

  const arrayview = () => ({
    length: end - start,
    get: (index) => array[start + index],
    toArray: () => array.slice(start, end + 1),
    viewAs(dStart, dEnd) {
      start += dStart;
      end = dEnd === undefined ? this.length : dEnd;
      return this.toArray();
    }
  });

  const view = arrayview();
  const arraypartition = (pivot) => {
    const pivotIndex = pivot || Math.floor(view.length / 2);
    return {
      mid: view.get(pivotIndex),
      left: view.viewAs(start, pivotIndex - 1),
      right: view.viewAs(pivotIndex + 1)
    };
  };

  return { ...view, partitionAt: arraypartition };
};

export default arrayviewer;
