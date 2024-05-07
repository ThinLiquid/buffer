import HTML from '@datkat21/html'
import { SearchResults, SpotifyApi } from '@spotify/web-api-ts-sdk'
import Player from './player'
import localforage from 'localforage'
import { CachedData } from './types'
import { throttle } from 'throttle-debounce'

class SearchPalette {
  private element: HTML
  private input: HTML
  private jump: HTML
  private container: HTML
  private close: HTML

  constructor (
    private readonly sdk: SpotifyApi | null,
    private readonly player: Player,
    private readonly localForage: typeof localforage
  ) {
    this.element = new HTML('div')
    this.input = new HTML('input').attr({
      type: 'text',
      placeholder: 'Search on Spotify...'
    })
    this.jump = new HTML('div')
      .appendMany(
        new HTML('span').text('Jump to '),
        new HTML('a').text('tracks').attr({ href: '#tracks' }),
        new HTML('a').text('albums').attr({ href: '#albums' }),
        new HTML('a').text('playlists').attr({ href: '#playlists' })
      )
      .classOn('jump')
    this.container = new HTML('div').classOn('container')

    this.close = new HTML('button')
      .classOn('material-symbols-sharp')
      .text('close')

    this.init()
  }

  private init () {
    this.element.classOn('searchpal')
    this.element.appendTo(document.body)

    this.close.appendTo(this.element)

    this.input.appendTo(this.element)
    this.jump.appendTo(this.element)
    this.container.appendTo(this.element)

    this.localForage.ready(() => this.renderCached())

    this.registerEvents()
  }

  private render (results: SearchResults<['track', 'album', 'playlist']>) {
    this.container.html('')
    this.container.append(new HTML('div').id('tracks'))
    results.tracks.items.forEach(track => {
      const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
      const icon = new HTML('img').classOn('image').attr({
        src: track.album.images[0].url
      })
      const meta = new HTML('span').text(
        `${track.name}\n${track.artists.map(artist => artist.name).join(', ')}`
      )

      const icons = new HTML('div').classOn('icons')

      const add = new HTML('button')
        .classOn('material-symbols-sharp')
        .text('playlist_add')
        .appendTo(icons)

      add.on('click', e => {
        e.preventDefault()
        e.stopPropagation()
        this.player.add(track)
      })

      item.appendMany(icon, meta, icons)
      item.appendTo(this.container)

      item.on('click', () => {
        this.player.reset()
        this.player.add(track)
        this.player.start()
        this.hide()
      })
    })

    this.container.append(new HTML('div').id('albums'))
    results.albums.items.forEach(album => {
      const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
      const icon = new HTML('img').classOn('image').attr({
        src: album.images[0].url
      })
      const meta = new HTML('span').text(
        `${album.name}\n${album.artists.map(artist => artist.name).join(', ')}`
      )

      const icons = new HTML('div').classOn('icons')

      const add = new HTML('button')
        .classOn('material-symbols-sharp')
        .text('playlist_add')
        .appendTo(icons)

      add.on('click', async e => {
        e.preventDefault()
        e.stopPropagation()
        await this.player.load(
          (
            await this.sdk!.albums.get(album.id)
          ).tracks.items.map(track => track.id)
        )
      })

      item.appendMany(icon, meta, icons)
      item.appendTo(this.container)

      item.on('click', async () => {
        this.player.reset()
        await this.player.load(
          (
            await this.sdk!.albums.get(album.id)
          ).tracks.items.map(track => track.id)
        )
        this.player.start()
        this.hide()
      })
    })

    this.container.append(new HTML('div').id('playlists'))
    results.playlists.items.forEach(playlist => {
      const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
      const icon = new HTML('img').classOn('image').attr({
        src: playlist.images[0].url
      })
      const meta = new HTML('span').text(
        `${playlist.name}\n${playlist.owner.display_name}`
      )

      const icons = new HTML('div').classOn('icons')

      const add = new HTML('button')
        .classOn('material-symbols-sharp')
        .text('playlist_add')
        .appendTo(icons)

      add.on('click', async e => {
        e.preventDefault()
        e.stopPropagation()
        await this.player.load(
          (
            await this.sdk!.playlists.getPlaylist(playlist.id)
          ).tracks.items.map(track => track.track.id)
        )
      })

      item.appendMany(icon, meta, icons)
      item.appendTo(this.container)

      item.on('click', async () => {
        this.player.reset()
        await this.player.load(
          (
            await this.sdk!.playlists.getPlaylist(playlist.id)
          ).tracks.items.map(track => track.track.id)
        )
        this.player.start()
        this.hide()
      })
    })
  }

  private renderCached () {
    this.container.html('')
    this.container.append(new HTML('div').id('tracks'))
    this.localForage.keys().then(keys => {
      keys.forEach(async key => {
        const data: CachedData | null = await this.localForage.getItem(key)
        if (data == null) return
        if (data.image == null) return
        if (data.track == null) return
        if (data.track.name == null) return
        if (data.track.artists == null) return

        const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
        const icon = new HTML('img').classOn('image').attr({ src: data.image })
        const meta = new HTML('span').text(
          `${data.track.name}\n${data.track.artists
            .map(artist => artist.name)
            .join(', ')}`
        )
        const icons = new HTML('div').classOn('icons')

        const add = new HTML('button')
          .classOn('material-symbols-sharp')
          .text('playlist_add')
          .appendTo(icons)

        const remove = new HTML('button')
          .classOn('material-symbols-sharp')
          .text('delete')
          .appendTo(icons)

        remove.on('click', e => {
          e.preventDefault()
          e.stopPropagation()
          this.localForage.removeItem(key)
          item.cleanup()
        })

        add.on('click', e => {
          e.preventDefault()
          e.stopPropagation()
          this.player.add(data.track)
        })

        item.appendMany(icon, meta, icons)
        item.appendTo(this.container)

        item.on('click', () => {
          this.player.reset()
          this.player.add(data.track)
          this.player.start()
          this.hide()
        })
      })
    })
  }

  private registerEvents () {
    this.close.on('click', () => this.hide())
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.hide()
        return
      }
      if (!((event.ctrlKey || event.metaKey) && event.key === 'k')) {
        return
      }
      event.preventDefault()
      this.toggle()
      return
    })

    this.input.on(
      'input',
      throttle(1000, async () => {
        const query = this.input.getValue()
        if (query === '') {
          this.renderCached()
          return
        }
        if (this.sdk != null) {
          const results = await this.sdk.search(query, [
            'track',
            'album',
            'playlist'
          ])
          this.render(results)
        }
      })
    )
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

export default SearchPalette
