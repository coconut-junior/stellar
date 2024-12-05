const { rClearInterval } = require('timers');
const { getCPUUsage, cpuUsage } = require('process');
const os = require('os');

var startMeasure = cpuAverage();

function cpuAverage() {
  //Initialise sum of idle and time of cores and fetch CPU info
  var totalIdle = 0,
    totalTick = 0;
  var cpus = os.cpus();

  //Loop through CPU cores
  for (var i = 0, len = cpus.length; i < len; i++) {
    var cpu = cpus[i];

    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }

    //Total up the idle time of the core
    totalIdle += cpu.times.idle;
  }

  //Return the average Idle and Tick times
  return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

var monitorLoop = setInterval(function () {
  const free_mem = os.freemem();
  const total_mem = os.totalmem();
  let used_mem_percent = (total_mem - free_mem) / total_mem;

  //Grab second Measure
  var endMeasure = cpuAverage();
  //Calculate the difference in idle and total time between the measures
  var idleDifference = endMeasure.idle - startMeasure.idle;
  var totalDifference = endMeasure.total - startMeasure.total;
  //Calculate the average percentage CPU usage
  var percentageCPU = 100 - ~~((100 * idleDifference) / totalDifference);
  let mem_used_gb = Math.round((total_mem - free_mem) / 1024 / 1024 / 1024);

  $(`#cpuPercent`).html(`${percentageCPU}%`);
  $(`#memUsage`).html(`${mem_used_gb} GB`);
  $(`#ramMeter`).css('height', `${used_mem_percent * 100}%`);
  $(`#cpuMeter`).css('height', `${percentageCPU}%`);
}, 250);
