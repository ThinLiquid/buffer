import HTML from '@datkat21/html'

import Color from './color'
import Player from './player'
import { getPalette } from 'get-palette'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import SearchPalette from './searchpal'
import QueuePalette from './queue'

class Metadata {
  private container: HTML
  private image: HTML
  private meta: HTML
  private text: HTML
  private icons: HTML

  private prevTrack: HTML
  private playPause: HTML
  private nextTrack: HTML
  private like: HTML

  private options: HTML
  private menu: HTML
  private queue: HTML

  constructor (
    private readonly sdk: SpotifyApi | null,
    private readonly player: Player,
    private readonly color: Color,
    private readonly palette: SearchPalette,
    private readonly queuePalette: QueuePalette
  ) {
    this.container = new HTML('div').classOn('meta')
    this.image = new HTML('img')
    this.meta = new HTML('div')
    this.text = new HTML('div').text('Not playing')
    this.icons = new HTML('div').classOn('icons')

    this.playPause = new HTML('button')
      .classOn('material-symbols-sharp')
      .classOn('filled')
      .text('play_arrow')

    this.prevTrack = new HTML('button')
      .classOn('material-symbols-sharp')
      .classOn('filled')
      .text('skip_previous')

    this.nextTrack = new HTML('button')
      .classOn('material-symbols-sharp')
      .classOn('filled')
      .text('skip_next')

    this.like = new HTML('button').classOn('material-symbols-sharp').text('add')

    this.options = new HTML('div').classOn('options')
    this.menu = new HTML('button')
      .classOn('material-symbols-sharp')
      .text('playlist_play')
    this.queue = new HTML('button')
      .classOn('material-symbols-sharp')
      .text('queue_music')

    this.init()
  }

  init () {
    this.render()
    this.registerEvents()
  }

  render () {
    this.container.appendTo(document.body)
    this.image.appendTo(this.container)
    this.meta.appendTo(this.container)
    this.text.appendTo(this.meta)
    this.icons.appendTo(this.meta)

    this.prevTrack.appendTo(this.icons)
    this.playPause.appendTo(this.icons)
    this.nextTrack.appendTo(this.icons)
    if (this.sdk) this.like.appendTo(this.icons)

    this.options.appendTo(document.body)
    this.menu.appendTo(this.options)
    this.queue.appendTo(this.options)
  }

  registerEvents () {
    this.player.audio.addEventListener('loadedmetadata', async () => {
      const { metadata } = navigator.mediaSession
      this.setMetadata(metadata)
    })

    if (this.sdk) {
      this.player.on('trackchange', async () => {
        const out: boolean[] = await this.sdk!.makeRequest(
          'GET',
          `me/tracks/contains?ids=${this.player.currentTrack!.id}`
        )
        this.like.text(out[0] ? 'done' : 'add')
      })
    }

    this.player.audio.addEventListener('play', () => {
      this.playPause.text('pause')
    })

    this.player.audio.addEventListener('pause', () => {
      this.playPause.text('play_arrow')
    })

    this.player.audio.addEventListener('ended', () => {
      this.playPause.text('play_arrow')
    })

    this.player.audio.addEventListener('timeupdate', () => {
      this.container.elm.style.setProperty(
        '--progress',
        `${Math.round(
          (this.player.audio.currentTime / this.player.audio.duration) * 100
        )}%`
      )
    })

    this.playPause.on('click', () => {
      if (this.player.state === 'playing') {
        this.player.setState('paused')
      } else {
        this.player.setState('playing')
      }
    })

    this.prevTrack.on('click', () => {
      this.player.prev()
    })

    this.nextTrack.on('click', () => {
      this.player.next()
    })

    if (this.sdk) {
      this.like.on('click', async () => {
        if (!this.player.currentTrack) return
        if (this.like.getText() === 'add') {
          await this.sdk!.makeRequest('PUT', 'me/tracks', {
            ids: [this.player.currentTrack.id]
          })
          this.like.text('done')
        } else {
          await this.sdk!.makeRequest('DELETE', 'me/tracks', {
            ids: [this.player.currentTrack.id]
          })
          this.like.text('add')
        }
      })
    }

    this.menu.on('click', () => {
      this.palette.toggle()
    })

    this.queue.on('click', () => {
      this.queuePalette.toggle()
    })
  }

  private async setMetadata (metadata: MediaMetadata | null) {
    const color = (await getPalette(metadata?.artwork[0].src!))[3]
    document.body.style.setProperty(
      '--accent',
      this.color.adjustContrastColor(`rgb(${color.join(',')})`)
    )
    document.body.style.setProperty('--on-accent', 'black')

    this.image.attr({ src: metadata?.artwork[0].src })
    this.text.text(
      `${metadata?.title}\n${metadata?.artist}\n${metadata?.album}`
    )
  }
}

export default Metadata
