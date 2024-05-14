import HTML from '@datkat21/html'
import Player from './player'

class Visualizer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  worker: Worker

  get canvasWidth (): number {
    return this.canvas.width
  }

  get canvasHeight (): number {
    return this.canvas.height
  }

  /**
   * Create a new visualizer instance
   *
   * @param player The player instance
   */
  constructor (private readonly player: Player) {
    this.canvas = new HTML('canvas').styleJs({
      background: 'transparent',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '0'
    }).elm as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D

    this.worker = new Worker(new URL('./workers/calculateVisualizer.ts', import.meta.url), {
      type: 'module'
    })

    this.init()
  }

  private draw(data: Array<{ x: number, lineHeight: number }>): void {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Set line styles
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = document.body.style.getPropertyValue('--accent');
    this.ctx.lineJoin = 'round'; // Smooth joins for curves

    // Start drawing path
    this.ctx.beginPath();
    
    // Move to the starting point
    this.ctx.moveTo(data[0].x, this.canvasHeight - data[0].lineHeight);

    // Draw curve through each point
    for (let i = 1; i < data.length - 2; i++) {
      const xc = (data[i].x + data[i + 1].x) / 2;
      const yc = (this.canvasHeight - data[i].lineHeight + this.canvasHeight - data[i + 1].lineHeight) / 2;
      this.ctx.quadraticCurveTo(data[i].x, this.canvasHeight - data[i].lineHeight, xc, yc);
    }

    // Draw the last two points as a straight line
    this.ctx.lineTo(data[data.length - 2].x, this.canvasHeight - data[data.length - 2].lineHeight);
    this.ctx.lineTo(data[data.length - 1].x, this.canvasHeight - data[data.length - 1].lineHeight);

    // Stroke the path
    this.ctx.stroke();
  }

  /**
   * Initialize the visualizer
   *
   * @private
   * @memberof Visualizer
   */
  private init (): void {
    this.render()
    this.registerEvents()
    this.renderCanvas()
  }

  /**
   * Render the canvas
   *
   * @private
   * @memberof Visualizer
   */
  private render (): void {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    document.body.appendChild(this.canvas)
  }

  /**
   * Render the canvas
   *
   * @private
   * @memberof Visualizer
   */
  private renderCanvas (): void {
    // Create the audio source and analyser
    const audioSource = this.player.audioCtx.createMediaElementSource(this.player.audio)
    const analyser = this.player.audioCtx.createAnalyser()
    audioSource.connect(analyser)
    analyser.connect(this.player.audioCtx.destination)
    analyser.fftSize = 256

    // Create the buffer and data array
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    // Animation loop
    const animationLoop = (): void => {
      // Get the frequency data
      analyser.getByteFrequencyData(dataArray)

      // Send data to the worker
      this.worker.postMessage({ dataArray, canvasHeight: this.canvasHeight, canvasWidth: this.canvasWidth, bufferLength })
      requestAnimationFrame(animationLoop)
    }

    animationLoop()
  }

  /**
   * Register the events
   *
   * @private
   * @memberof Visualizer
   */
  private registerEvents (): void {
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    })
    this.worker.onmessage = (event) => {
      if (this.player.state !== 'playing') return
      this.draw(event.data)
    }
  }
}

export default Visualizer
