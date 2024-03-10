const os = require('os');

// 延迟用函数
const sleep = async delay => {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
};

// 获取cpu原始数据
const getCPUTime = () => {
  const cpus = os.cpus();
  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;
  let total = 0;

  for (let cpu in cpus) {
    user += cpus[cpu].times.user;
    nice += cpus[cpu].times.nice;
    sys += cpus[cpu].times.sys;
    irq += cpus[cpu].times.irq;
    idle += cpus[cpu].times.idle;
  }
  total = user + nice + sys + idle + irq;
  return {
    total,
    idle,
    user,
    sys,
    irq,
  };
};

// 被返回的数据
const systemInfo = {
  idle: 100,
  user: 0,
  sys: 0,
  irq: 0,
};

// 对获取的原始CPU数据进行计算，转化为使用率
const transformCPUTime = async () => {
  count--;
  const start = getCPUTime();
  await sleep(1000); // 1秒内的使用率，如果太短则变动太快。
  const end = getCPUTime();

  const total = end.total - start.total;
  const idle = end.idle - start.idle;
  const user = end.user - start.user;
  const sys = end.sys - start.sys;
  const irq = end.irq - start.irq;

  // console.log('count', count);
  // console.log('getCpusUse:', total, idle, user, sys, irq);
  systemInfo.idle = Number(Number((idle / total) * 100).toFixed());
  systemInfo.user = Number(Number((user / total) * 100).toFixed());
  systemInfo.sys = Number(Number((sys / total) * 100).toFixed());
  systemInfo.irq = Number(Number((irq / total) * 100).toFixed());
  if (count <= 0) {
    clearInterval(timeId);
  }
};

// 多用户使用可能有BUG，用ws可以解决
let count = 5;
let timeId = null;
const getCpusUse = () => {
  clearInterval(timeId);
  count = 5;
  timeId = setInterval(transformCPUTime, 1000);
  return systemInfo;
};
getCpusUse();

const formatMem = mem => {
  let unit = 0;
  while (mem > 1024) {
    mem /= 1024;
    unit++;
  }

  switch (unit) {
    case 0:
      return mem.toFixed(2) + 'B';
    case 1:
      return mem.toFixed(2) + 'K';
    case 2:
      return mem.toFixed(2) + 'M';
    case 3:
      return mem.toFixed(2) + 'G';
    case 4:
      return mem.toFixed(2) + 'T';
    case 5:
      return mem.toFixed(2) + 'P';
    default:
      return '你的内存太大了';
  }
};

const getMemoryUse = () => {
  const total = os.totalmem();
  const free = os.freemem();
  const freeUnit = formatMem(free);
  const use = total - free;
  const useUnit = formatMem(use);

  return {
    use,
    useUnit,
    free,
    freeUnit,
  };
};

module.exports = {
  getCpusUse,
  getMemoryUse,
};
