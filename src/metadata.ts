import HTML from '@datkat21/html'
import rangeSlider from 'range-slider-input'
import 'range-slider-input/dist/style.css'

import Color from './color'
import Player from './player'
import { getColor } from 'get-palette'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import SearchPalette from './searchpal'
import QueuePalette from './queuepal'
import Queue from './queue'

import VolumeOffIcon from './assets/volume_off.svg'

class Metadata {
  private readonly container: HTML
  private readonly image: HTML
  private readonly meta: HTML
  private readonly text: HTML
  private readonly icons: HTML

  private readonly prevTrack: HTML
  private readonly playPause: HTML
  private readonly nextTrack: HTML
  private readonly like: HTML
  private readonly download: HTML

  private readonly options: HTML
  private readonly menu: HTML
  private readonly queuebtn: HTML

  private readonly volume: HTML
  private readonly crt: HTML

  /**
   * Create a new metadata instance
   *
   * @param sdk The Spotify API instance
   * @param player The player instance
   * @param color The color library instance
   * @param palette The search palette instance
   * @param queuePalette The queue palette instance
   * @param queue The queue instance
   */
  constructor (
    private readonly sdk: SpotifyApi | null,
    private readonly player: Player,
    private readonly color: Color,
    private readonly palette: SearchPalette,
    private readonly queuePalette: QueuePalette,
    private readonly queue: Queue
  ) {
    // Initialize the elements
    this.container = new HTML('div').classOn('meta')
    this.image = new HTML('img')
    this.image.attr({ src: VolumeOffIcon, alt: 'Not playing' })
    this.meta = new HTML('div')
    this.text = new HTML('div').text('Not playing')
    this.icons = new HTML('div').classOn('icons')

    this.playPause = new HTML('button')
      .attr({ title: 'Play' })
      .classOn('material-symbols-sharp')
      .classOn('filled')
      .text('play_arrow')

    this.prevTrack = new HTML('button')
      .attr({ title: 'Previous' })
      .classOn('material-symbols-sharp')
      .classOn('filled')
      .text('skip_previous')

    this.nextTrack = new HTML('button')
      .attr({ title: 'Next' })
      .classOn('material-symbols-sharp')
      .classOn('filled')
      .text('skip_next')

    this.like = new HTML('button')
      .attr({ title: 'Like' })
      .classOn('material-symbols-sharp')
      .text('add')

    this.download = new HTML('button')
      .attr({ title: 'Download' })
      .classOn('material-symbols-sharp')
      .text('download')

    this.options = new HTML('div').classOn('options')
    this.menu = new HTML('button')
      .attr({ title: 'Menu' })
      .classOn('material-symbols-sharp')
      .text('menu')
    this.queuebtn = new HTML('button')
      .attr({ title: 'Queue' })
      .classOn('material-symbols-sharp')
      .text('queue_music')

    this.volume = new HTML('div')
      .attr({ title: 'Volume' })
      .id('range-slider')

    this.crt = new HTML('button')
      .attr({ title: 'CRT Mode' })
      .classOn('material-symbols-sharp')
      .text('blur_on')

    // Initialize the metadata
    this.init()
  }

  /**
   * Initialize the metadata
   *
   * @private
   * @memberof Metadata
   */
  private init (): void {
    this.render()
    this.registerEvents()
  }

  /**
   * Render the metadata
   *
   * @private
   * @memberof Metadata
   */
  private render (): void {
    // Append the elements to the body
    this.container.appendTo(document.body)
    this.image.appendTo(this.container)
    this.meta.appendTo(this.container)
    this.text.appendTo(this.meta)
    this.icons.appendTo(this.meta)

    this.prevTrack.appendTo(this.icons)
    this.playPause.appendTo(this.icons)
    this.nextTrack.appendTo(this.icons)
    if (this.sdk != null) this.like.appendTo(this.icons) // Only show the like button if the SDK is available
    this.download.appendTo(this.icons)

    this.options.appendTo(document.body)
    this.menu.appendTo(this.options)
    this.queuebtn.appendTo(this.options)

    this.volume.appendTo(this.options)
    rangeSlider(this.volume.elm, {
      value: [0, 100],
      thumbsDisabled: [true, false],
      rangeSlideDisabled: true,
      orientation: 'vertical',
      onInput: (value: number[]) => {
        this.player.audio.volume = value[1] / 100
      }
    })

    this.crt.appendTo(this.options)
  }

  /**
   * Register the events
   *
   * @private
   * @memberof Metadata
   */
  private registerEvents (): void {
    // Set the metadata when the metadata changes
    this.player.on('metadatachange', () => {
      this.setMetadata().catch((e) => console.error(e))
    })

    // Check if the track is liked
    if (this.sdk != null) {
      this.player.on('trackchange', () => {
        if (this.sdk != null) {
          this.sdk.makeRequest(
            'GET',
            `me/tracks/contains?ids=${this.queue.currentTrack.id}`
          )
            .then((data) => {
              this.like.text((data as boolean[])[0] ? 'done' : 'add')
            })
            .catch((e) => console.error(e))
        }
      })
    }

    // Register the events for the buttons
    this.player.audio.addEventListener('play', () => {
      this.playPause.text('pause')
        .attr({ title: 'Pause' })
    })

    this.player.audio.addEventListener('pause', () => {
      this.playPause.text('play_arrow')
        .attr({ title: 'Play' })
    })

    this.player.audio.addEventListener('ended', () => {
      this.playPause.text('play_arrow')
        .attr({ title: 'Play' })
    })

    // Update the progress bar
    this.player.audio.addEventListener('timeupdate', () => {
      this.container.elm.style.setProperty(
        '--progress',
        `${Math.round(
          (this.player.audio.currentTime / this.player.audio.duration) * 100
        )}%`
      )
    })

    // Register the click events
    this.playPause.on('click', () => {
      this.player.state = this.player.state === 'playing' ? 'paused' : 'playing'
    })

    // Register the click events for the buttons
    this.prevTrack.on('click', () => {
      this.player.prev().catch(console.error)
    })

    this.nextTrack.on('click', () => {
      this.player.next().catch(console.error)
    })

    this.download.on('click', () => {
      const link = document.createElement('a')
      link.setAttribute('download', '')
      link.href = this.player.audio.src
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })

    // Register the click events for the like button
    if (this.sdk != null) {
      this.like.on('click', () => {
        if (this.sdk != null) {
          if (this.queue.currentTrack == null) return
          if (this.like.getText() === 'add') {
            this.sdk.makeRequest('PUT', 'me/tracks', {
              ids: [this.queue.currentTrack.id]
            }).catch(console.error)
            this.like.text('done')
          } else {
            this.sdk.makeRequest('DELETE', 'me/tracks', {
              ids: [this.queue.currentTrack.id]
            }).catch(console.error)
            this.like.text('add')
          }
        }
      })
    }

    // Register the click events for the sidebar
    this.menu.on('click', () => {
      this.palette.toggle()
    })

    this.queuebtn.on('click', () => {
      this.queuePalette.toggle()
    })

    this.crt.on('click', () => {
      new HTML(document.body).class('crt')
    })
  }

  /**
   * Set the metadata
   *
   * @private
   * @memberof Metadata
   */
  private async setMetadata (): Promise<void> {
    // Check if the player is playing
    if (this.player.metadata == null) {
      this.text.text('Not playing')
      document.title = 'Not playing | ://buffer'
      this.image.attr({ src: '', alt: 'Not playing' })
      return
    }

    // Set the accent color
    const color = await getColor(this.player.metadata.artwork[0].src)
    document.body.style.setProperty(
      '--accent',
      this.color.adjustContrastColor(`rgb(${color.join(',')})`)
    )
    document.body.style.setProperty('--on-accent', 'black')

    // Set the metadata
    document.title = `${this.player.metadata.title} by ${this.player.metadata.artist} | ://buffer`
    this.image.attr({ src: this.player.metadata?.artwork[0].src, alt: `${this.player.metadata.title} by ${this.player.metadata.artist}` })
    this.text.text(
      `${this.player.metadata?.title}\n${this.player.metadata.artist}\n${this.player.metadata.album}`
    )

    const link = document.querySelectorAll("link[rel~='icon']") as unknown as HTMLLinkElement[]
    link.forEach((el) => {
      el.href = this.player.metadata?.artwork[0].src as string
    })
  }
}

export default Metadata
