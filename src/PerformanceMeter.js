export class PerformanceMeter {
  constructor(sampleSize = 24) {
    this.sampleSize = sampleSize;
    this.samples = [];
    this.lastTime = 0;
    this.fps = 0;
  }

  tick(now = performance.now()) {
    if (this.lastTime) {
      const delta = now - this.lastTime;
      if (delta > 0) {
        this.samples.push(1000 / delta);
        if (this.samples.length > this.sampleSize) {
          this.samples.shift();
        }
        this.fps = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
      }
    }
    this.lastTime = now;
    return this.fps;
  }

  reset() {
    this.samples = [];
    this.lastTime = 0;
    this.fps = 0;
  }
}
