import HTML from '@datkat21/html'
import Player from './player'
import Queue from './queue'
import { Track } from '@spotify/web-api-ts-sdk'

class QueuePalette {
  private readonly element: HTML
  private readonly container: HTML

  /**
   * Create a new queue palette instance
   *
   * @param player The player instance
   * @param queue The queue instance
   */
  constructor (private readonly player: Player, private readonly queue: Queue) {
    // Initialize the elements
    this.element = new HTML('div')
    this.container = new HTML('div').classOn('container')

    // Initialize the queue palette
    this.init()
  }

  /**
   * Initialize the queue palette
   *
   * @private
   * @memberof QueuePalette
   */
  private init (): void {
    // Append the elements to the document
    this.element.classOn('queue')
    this.element.appendTo(document.body)

    this.container.appendTo(this.element)

    // Render the queue palette
    this.render()

    // Register the events
    this.registerEvents()
  }

  private async handleTrack (track: Track, index: number): Promise<void> {
    if (track == null) return
    const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
    const icon = new HTML('img')
      .classOn('image')
      .attr({ src: track.album.images[0].url, alt: `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}` })
    const meta = new HTML('span').text(
        `${track.name}\n${track.artists.map(artist => artist.name).join(', ')}`
    )
    const icons = new HTML('div').classOn('icons')

    const remove = new HTML('button')
      .classOn('material-symbols-sharp')
      .text('delete')
      .appendTo(icons)

    remove.on('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.queue.remove(index)
      this.render()
    })

    item.appendMany(icon, meta, icons)
    item.appendTo(this.container)

    item.on('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.queue.index = index
      this.player.start().catch(console.error)
    })
  }

  /**
   * Render the queue palette
   *
   * @private
   * @memberof QueuePalette
   */
  private render (): void {
    this.container.html('')
    this.queue.tracks.forEach((track, index) => {
      this.handleTrack(track, index).catch(console.error)
    })
  }

  /**
   * Register the events
   *
   * @private
   * @memberof QueuePalette
   */
  private registerEvents (): void {
    document.addEventListener('keydown', event => {
      // Handle the keybind
      if (!((event.ctrlKey || event.metaKey) && event.key === 'l')) {
        return
      }
      event.preventDefault()
      this.toggle()
    })

    // Rerender the queue palette when the queue changes
    this.queue.on('queuechange', () => {
      this.render()
    })
  }

  /**
   * Show the queue palette
   *
   * @memberof QueuePalette
   */
  show (): void {
    this.element.classOn('show')
  }

  /**
   * Hide the queue palette
   *
   * @memberof QueuePalette
   */
  hide (): void {
    this.element.classOff('show')
  }

  /**
   * Toggle the queue palette
   *
   * @memberof QueuePalette
   */
  toggle (): void {
    this.element.class('show')
  }
}

export default QueuePalette
