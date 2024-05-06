import HTML from '@datkat21/html'
import Player from './player'

class QueuePalette {
  private element: HTML
  private container: HTML

  constructor (private readonly player: Player) {
    this.element = new HTML('div')
    this.container = new HTML('div').classOn('container')

    this.init()
  }

  private init () {
    this.element.classOn('queue')
    this.element.appendTo(document.body)

    this.container.appendTo(this.element)

    this.render()

    this.registerEvents()
  }

  private render () {
    this.container.html('')
    this.player.queue.forEach(async (track, index) => {
      if (track == undefined) return
      const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
      const icon = new HTML('img')
        .classOn('image')
        .attr({ src: track.album.images[0].url })
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
        this.player.remove(index)
        this.render()
      })

      item.appendMany(icon, meta, icons)
      item.appendTo(this.container)

      item.on('click', e => {
        e.preventDefault()
        e.stopPropagation()
        this.player.queueIndex = index
        this.player.play(track)
        this.hide()
      })
    })
  }

  private registerEvents () {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.hide()
        return
      }
      if (!((event.ctrlKey || event.metaKey) && event.key === 'l')) {
        return
      }
      event.preventDefault()
      this.toggle()
      return
    })

    this.player.on('queuechange', () => {
      this.render()
    })
  }

  show () {
    this.element.classOn('show')
  }

  hide () {
    this.element.classOff('show')
  }

  toggle () {
    this.element.class('show')
  }
}

export default QueuePalette
