// ── Algorithm definitions ─────────────────────────────────────────────────────
const ALGOS = {
  bubble: {
    info: { name:'Bubble Sort', best:'O(n)', avg:'O(n²)', worst:'O(n²)', space:'O(1)',
      desc:'Repeatedly compares adjacent elements and swaps them if out of order, bubbling the largest values to the end.' },
    async run(arr, cb) {
      const n = arr.length;
      for (let i = 0; i < n-1; i++) {
        for (let j = 0; j < n-i-1; j++) {
          if (cb.stop()) return;
          if (await cb.cmp(arr, j, j+1)) await cb.swap(arr, j, j+1);
        }
        cb.sorted(n-1-i);
      }
      cb.sorted(0);
    }
  },
  selection: {
    info: { name:'Selection Sort', best:'O(n²)', avg:'O(n²)', worst:'O(n²)', space:'O(1)',
      desc:'Finds the minimum element from the unsorted portion and places it at the beginning, one at a time.' },
    async run(arr, cb) {
      const n = arr.length;
      for (let i = 0; i < n-1; i++) {
        let min = i;
        for (let j = i+1; j < n; j++) {
          if (cb.stop()) return;
          if (await cb.cmpLess(arr, j, min)) min = j;
        }
        if (min !== i) await cb.swap(arr, i, min);
        cb.sorted(i);
      }
      cb.sorted(n-1);
    }
  },
  insertion: {
    info: { name:'Insertion Sort', best:'O(n)', avg:'O(n²)', worst:'O(n²)', space:'O(1)',
      desc:'Builds a sorted array one item at a time by inserting each element into its correct position.' },
    async run(arr, cb) {
      const n = arr.length;
      cb.sorted(0);
      for (let i = 1; i < n; i++) {
        let j = i;
        while (j > 0) {
          if (cb.stop()) return;
          if (await cb.cmp(arr, j-1, j)) { await cb.swap(arr, j-1, j); j--; }
          else break;
        }
        cb.sorted(i);
      }
    }
  },
  merge: {
    info: { name:'Merge Sort', best:'O(n log n)', avg:'O(n log n)', worst:'O(n log n)', space:'O(n)',
      desc:'Recursively divides the array in half, sorts each half, then merges the sorted halves together.' },
    async run(arr, cb) {
      await mergeSort(arr, 0, arr.length-1, cb);
      if (!cb.stop()) for (let i=0;i<arr.length;i++) cb.sorted(i);
    }
  },
  quick: {
    info: { name:'Quick Sort', best:'O(n log n)', avg:'O(n log n)', worst:'O(n²)', space:'O(log n)',
      desc:'Picks a pivot element and partitions the array around it, then recursively sorts each partition.' },
    async run(arr, cb) {
      await quickSort(arr, 0, arr.length-1, cb);
      if (!cb.stop()) for (let i=0;i<arr.length;i++) cb.sorted(i);
    }
  }
};

async function mergeSort(arr, l, r, cb) {
  if (l >= r || cb.stop()) return;
  const m = Math.floor((l+r)/2);
  await mergeSort(arr, l, m, cb);
  await mergeSort(arr, m+1, r, cb);
  // merge
  const left = arr.slice(l, m+1), right = arr.slice(m+1, r+1);
  let i=0, j=0, k=l;
  while (i<left.length && j<right.length) {
    if (cb.stop()) return;
    await cb.flash(k, k+1);
    if (left[i] <= right[j]) { await cb.set(arr, k++, left[i++]); }
    else { await cb.set(arr, k++, right[j++]); }
  }
  while (i<left.length) { if(cb.stop())return; await cb.set(arr, k++, left[i++]); }
  while (j<right.length) { if(cb.stop())return; await cb.set(arr, k++, right[j++]); }
}

async function quickSort(arr, lo, hi, cb) {
  if (lo >= hi || cb.stop()) return;
  const p = await qPartition(arr, lo, hi, cb);
  cb.sorted(p);
  await quickSort(arr, lo, p-1, cb);
  await quickSort(arr, p+1, hi, cb);
  if (lo === hi) cb.sorted(lo);
}

async function qPartition(arr, lo, hi, cb) {
  cb.pivot(hi);
  let i = lo-1;
  for (let j=lo; j<hi; j++) {
    if (cb.stop()) return i+1;
    await cb.flash(j, hi);
    if (arr[j] <= arr[hi]) { i++; await cb.swap(arr, i, j); }
  }
  await cb.swap(arr, i+1, hi);
  return i+1;
}

// ── State ─────────────────────────────────────────────────────────────────────
let arr = [], bars = [], sorting = false, cancelled = false, comps = 0, speed = 50;
const sortedSet = new Set();

// ── DOM ───────────────────────────────────────────────────────────────────────
const container   = document.getElementById('bars-container');
const compEl      = document.getElementById('comp-count');
const statusEl    = document.getElementById('status');
const algoSel     = document.getElementById('algo-select');
const startBtn    = document.getElementById('start-btn');
const stopBtn     = document.getElementById('stop-btn');
const genBtn      = document.getElementById('generate-btn');
const sizeSld     = document.getElementById('size-slider');
const speedSld    = document.getElementById('speed-slider');
const sizeLabel   = document.getElementById('size-label');
const speedLabel  = document.getElementById('speed-label');
const titleEl     = document.getElementById('algo-title');
const bestEl      = document.getElementById('best');
const avgEl       = document.getElementById('avg');
const worstEl     = document.getElementById('worst');
const spaceEl     = document.getElementById('space');
const descEl      = document.getElementById('algo-desc');

// ── Helpers ───────────────────────────────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));
const getDelay = () => Math.max(1, 310 - speed * 3);

function setStatus(txt, cls='') {
  statusEl.textContent = txt;
  statusEl.className = cls;
}
function updateComps() { compEl.textContent = comps.toLocaleString(); }

// ── Array / render ────────────────────────────────────────────────────────────
function generate() {
  const n = parseInt(sizeSld.value);
  arr = Array.from({length:n}, () => Math.floor(Math.random()*88)+10);
  sortedSet.clear(); comps = 0;
  updateComps(); render(); setStatus('Ready');
}

function render() {
  container.innerHTML = ''; bars = [];
  const n = arr.length;
  const W = container.clientWidth;
  const gap = n > 80 ? 1 : n > 50 ? 2 : 3;
  const bw = Math.max(2, Math.floor((W - gap*(n-1)) / n));
  arr.forEach((v, i) => {
    const b = document.createElement('div');
    b.className = 'bar' + (sortedSet.has(i) ? ' sorted' : '');
    b.style.height = v + '%';
    b.style.width  = bw + 'px';
    if (n > 80) b.style.marginRight = '1px';
    container.appendChild(b);
    bars.push(b);
  });
}

// ── Bar helpers ───────────────────────────────────────────────────────────────
function cls(i, c) { if(bars[i]) bars[i].className = 'bar ' + c; }
function reset(i)  { if(bars[i]) bars[i].className = 'bar' + (sortedSet.has(i)?' sorted':''); }
function setH(i)   { if(bars[i]) bars[i].style.height = arr[i] + '%'; }

// ── Callbacks ─────────────────────────────────────────────────────────────────
function makeCallbacks() {
  return {
    stop: () => cancelled,

    cmp: async (a, i, j) => {
      comps++; updateComps();
      cls(i,'comparing'); cls(j,'comparing');
      await wait(getDelay());
      const r = a[i] > a[j];
      reset(i); reset(j);
      return r;
    },

    cmpLess: async (a, i, j) => {
      comps++; updateComps();
      cls(i,'comparing'); cls(j,'comparing');
      await wait(getDelay());
      const r = a[i] < a[j];
      reset(i); reset(j);
      return r;
    },

    swap: async (a, i, j) => {
      cls(i,'swapping'); cls(j,'swapping');
      [a[i], a[j]] = [a[j], a[i]];
      setH(i); setH(j);
      await wait(getDelay());
      reset(i); reset(j);
    },

    set: async (a, i, v) => {
      a[i] = v; setH(i);
      cls(i,'swapping');
      await wait(getDelay());
      reset(i);
    },

    flash: async (i, j) => {
      comps++; updateComps();
      cls(i,'comparing'); cls(j,'pivot');
      await wait(getDelay());
      reset(i); reset(j);
    },

    pivot: (i) => cls(i, 'pivot'),

    sorted: (i) => {
      sortedSet.add(i);
      if(bars[i]) bars[i].className = 'bar sorted';
    }
  };
}

// ── Sort ──────────────────────────────────────────────────────────────────────
async function startSort() {
  if (sorting) return;
  sorting = true; cancelled = false;
  comps = 0; sortedSet.clear();
  updateComps(); render();
  setDisabled(true); stopBtn.disabled = false;
  setStatus('Sorting…', 'running');

  const algo = ALGOS[algoSel.value];
  const t0 = performance.now();
  try { await algo.run(arr, makeCallbacks()); }
  catch(e) { console.error(e); }
  const elapsed = ((performance.now()-t0)/1000).toFixed(2);

  sorting = false;
  setDisabled(false); stopBtn.disabled = true;

  if (!cancelled) {
    for (let i=0; i<bars.length; i++) {
      sortedSet.add(i);
      bars[i].className = 'bar sorted';
      if (i%4===0) await wait(6);
    }
    setStatus(`Done ${elapsed}s · ${comps.toLocaleString()} comparisons`, 'done');
  } else {
    setStatus('Stopped', 'stopped');
  }
}

function setDisabled(d) {
  [genBtn, startBtn, algoSel, sizeSld, speedSld].forEach(e => e.disabled = d);
}

// ── Info panel ────────────────────────────────────────────────────────────────
function updateInfo() {
  const {name,best,avg,worst,space,desc} = ALGOS[algoSel.value].info;
  titleEl.textContent = name;
  bestEl.textContent  = best;
  avgEl.textContent   = avg;
  worstEl.textContent = worst;
  spaceEl.textContent = space;
  descEl.textContent  = desc;
}

// ── Events ────────────────────────────────────────────────────────────────────
genBtn.addEventListener('click', generate);
startBtn.addEventListener('click', startSort);
stopBtn.addEventListener('click', () => { cancelled = true; });
algoSel.addEventListener('change', () => { updateInfo(); if(!sorting) generate(); });
sizeSld.addEventListener('input', () => { sizeLabel.textContent = sizeSld.value; if(!sorting) generate(); });
speedSld.addEventListener('input', () => {
  speed = parseInt(speedSld.value);
  const labels = ['Glacial','Slow','Medium','Fast','Ludicrous'];
  speedLabel.textContent = labels[Math.min(4, Math.floor(speed/21))];
});
window.addEventListener('resize', () => { if(!sorting) render(); });

// ── Init ──────────────────────────────────────────────────────────────────────
updateInfo();
generate();
stopBtn.disabled = true;