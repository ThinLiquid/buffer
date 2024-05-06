import HTML from '@datkat21/html'
import Player from './player'

class Visualizer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor (private readonly player: Player) {
    this.canvas = new HTML('canvas').styleJs({
      background: 'transparent',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '0'
    }).elm as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.init()
  }

  init () {
    this.render()
    this.registerEvents()
    this.renderCanvas()
  }

  render () {
    document.body.appendChild(this.canvas)
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  renderCanvas () {
    const audioSource = this.player.audioCtx.createMediaElementSource(
      this.player.audio
    )
    const analyser = this.player.audioCtx.createAnalyser()
    audioSource.connect(analyser)
    analyser.connect(this.player.audioCtx.destination)
    analyser.fftSize = 256

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    let x = 0
    let lineHeight

    const animate = (): void => {
      const canvasWidth = this.canvas.width
      const canvasHeight = this.canvas.height
      const lineGap = canvasWidth / bufferLength

      if (this.player.state !== 'playing') return
      this.ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      analyser.getByteFrequencyData(dataArray)

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

    // Use requestAnimationFrame outside the function
    function animationLoop (): void {
      animate()
      requestAnimationFrame(animationLoop)
    }

    animationLoop()
  }

  private registerEvents () {
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    })
  }
}

export default Visualizer
