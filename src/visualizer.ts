import HTML from '@datkat21/html'
import Player from './player'

class Visualizer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

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
    this.init()
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
    document.body.appendChild(this.canvas)
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
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

    let x = 0
    let lineHeight

    const animate = (): void => {
      // Get the canvas width and height
      const canvasWidth = this.canvas.width
      const canvasHeight = this.canvas.height

      // Calculate the line gap
      const lineGap = canvasWidth / bufferLength

      // Clear the canvas if the player is not playing (performance)
      if (this.player.state !== 'playing') return
      this.ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // Get the frequency data
      analyser.getByteFrequencyData(dataArray)

      // Draw the visualizer
      this.ctx.lineWidth = 1
      this.ctx.strokeStyle = document.body.style.getPropertyValue('--accent')
      this.ctx.beginPath()

      x = 0
      const percent = dataArray[0] / 255
      lineHeight = (canvasHeight * percent) / 2
      this.ctx.moveTo(x, canvasHeight - lineHeight)

      for (let i = 1; i < bufferLength; i++) {
        const percent = dataArray[i] / 255
        lineHeight = (canvasHeight * percent) / 2

        this.ctx.lineTo(x, canvasHeight - lineHeight)

        x += lineGap + 2
      }

      this.ctx.stroke()
    }

    // Animation loop
    const animationLoop = (): void => {
      animate()
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
  }
}

export default Visualizer
