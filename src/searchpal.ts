import HTML from '@datkat21/html'
import { Album, Playlist, SearchResults, SimplifiedAlbum, SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import Player from './player'
import localforage from 'localforage'
import { CachedData } from './types'
import { throttle } from 'throttle-debounce'
import Queue from './queue'

class SearchPalette {
  private readonly element: HTML
  private readonly input: HTML
  private readonly jump: HTML
  private readonly container: HTML
  private readonly close: HTML

  /**
   * Create a new search palette instance
   *
   * @param sdk The Spotify API instance
   * @param player The player instance
   * @param queue The queue instance
   */
  constructor (
    private readonly sdk: SpotifyApi | null,
    private readonly player: Player,
    private readonly queue: Queue
  ) {
    // Initialize the elements
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

    // Initialize the search palette
    this.init().catch(console.error)
  }

  /**
   * Initialize the search palette
   *
   * @private
   */
  private async init (): Promise<void> {
    // Append the elements to the document
    this.element.classOn('searchpal')
    this.element.appendTo(document.body)

    this.close.appendTo(this.element)

    this.input.appendTo(this.element)
    this.jump.appendTo(this.element)
    this.container.appendTo(this.element)

    // Register the events
    this.registerEvents()
  }

  /**
   * Add the tracks of an album to the queue
   *
   * @private
   * @param album The album to add the tracks of
   * @memberof SearchPalette
   */
  private async addAlbumTracks (album: Album['id']): Promise<void> {
    if (this.sdk == null) return
    const albumData = await this.sdk.albums.get(album)
    const tracks = albumData.tracks.items.map(async track => {
      if (this.sdk == null) return
      return await this.sdk.tracks.get(track.id)
    })
    const filteredTracks = (await Promise.all(tracks)).filter(track => track != null) as Track[]
    this.queue.add(...filteredTracks)
  }

  /**
   * Load the tracks of an album
   *
   * @private
   * @param album The album to load the tracks of
   * @memberof SearchPalette
   */
  private async loadAlbumTracks (album: Album['id']): Promise<void> {
    if (this.sdk == null) return
    const albumData = await this.sdk.albums.get(album)
    const tracks = albumData.tracks.items.map(async track => {
      if (this.sdk == null) return
      return await this.sdk.tracks.get(track.id)
    })
    const filteredTracks = (await Promise.all(tracks)).filter(track => track != null) as Track[]
    this.queue.load(...filteredTracks)
  }

  /**
   * Add the tracks of a playlist to the queue
   *
   * @private
   * @param playlist The playlist to add the tracks of
   * @memberof SearchPalette
   */
  private async addPlaylistTracks (playlist: Playlist['id']): Promise<void> {
    if (this.sdk == null) return
    const playlistData = await this.sdk.playlists.getPlaylist(playlist)
    const tracks = playlistData.tracks.items.map(async track => {
      if (this.sdk == null) return
      return await this.sdk.tracks.get(track.track.id)
    })
    const filteredTracks = (await Promise.all(tracks)).filter(track => track != null) as Track[]
    this.queue.add(...filteredTracks)
  }

  /**
   * Load the tracks of a playlist
   *
   * @private
   * @param playlist The playlist to load the tracks of
   * @memberof SearchPalette
   */
  private async loadPlaylistTracks (playlist: Playlist['id']): Promise<void> {
    if (this.sdk == null) return
    const playlistData = await this.sdk.playlists.getPlaylist(playlist)
    const tracks = playlistData.tracks.items.map(async track => {
      if (this.sdk == null) return
      return await this.sdk.tracks.get(track.track.id)
    })
    const filteredTracks = (await Promise.all(tracks)).filter(track => track != null) as Track[]
    this.queue.load(...filteredTracks)
  }

  /**
   * Handle an album
   *
   * @private
   * @param album The album to handle
   * @memberof SearchPalette
   */
  private handleAlbum (album: SimplifiedAlbum): void {
    const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
    const icon = new HTML('img').classOn('image').attr({
      src: album.images[0].url,
      alt: `${album.name} by ${album.artists.map(artist => artist.name).join(', ')}`
    })
    const meta = new HTML('span').text(
        `${album.name}\n${album.artists.map(artist => artist.name).join(', ')}`
    )

    const icons = new HTML('div').classOn('icons')

    const add = new HTML('button')
      .classOn('material-symbols-sharp')
      .text('playlist_add')
      .appendTo(icons)

    add.on('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.addAlbumTracks(album.id).catch(console.error)
    })

    item.appendMany(icon, meta, icons)
    item.appendTo(this.container)

    item.on('click', () => {
      this.loadAlbumTracks(album.id)
        .then(async () => {
          await this.player.start()
          await this.hide()
        })
        .catch(console.error)
    })
  }

  /**
   * Handle a playlist
   *
   * @private
   * @param playlist The playlist to handle
   * @memberof SearchPalette
   */
  private handlePlaylist (playlist: Playlist): void {
    const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
    const icon = new HTML('img').classOn('image').attr({
      src: playlist.images[0].url,
      alt: `${playlist.name} compiled by ${playlist.owner.display_name}`
    })
    const meta = new HTML('span').text(
        `${playlist.name}\n${playlist.owner.display_name}`
    )

    const icons = new HTML('div').classOn('icons')

    const add = new HTML('button')
      .classOn('material-symbols-sharp')
      .text('playlist_add')
      .appendTo(icons)

    add.on('click', e => {
      e.preventDefault()
      e.stopPropagation()
      this.addPlaylistTracks(playlist.id).catch(console.error)
    })

    item.appendMany(icon, meta, icons)
    item.appendTo(this.container)

    item.on('click', () => {
      this.loadPlaylistTracks(playlist.id)
        .then(async () => {
          await this.player.start()
          await this.hide()
        })
        .catch(console.error)
    })
  }

  /**
   * Render the search results
   *
   * @private
   * @param results The search results to render
   * @memberof SearchPalette
   */
  private render (results: SearchResults<['track', 'album', 'playlist']>): void {
    // Clear the container
    this.container.html('')

    // Append the tracks
    this.container.append(new HTML('div').id('tracks'))
    if (this.sdk == null || results.tracks == null) return
    results.tracks.items.forEach(track => {
      const item = new HTML('div').classOn('item').attr({ tabindex: '0' })
      const icon = new HTML('img').classOn('image').attr({
        src: track.album.images[0].url,
        alt: `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`
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
        this.queue.add(track)
      })

      item.appendMany(icon, meta, icons)
      item.appendTo(this.container)

      item.on('click', () => {
        this.queue.load(track)
        this.player.start().catch(console.error)
        this.hide()
      })
    })

    // Append the albums
    this.container.append(new HTML('div').id('albums'))
    results.albums.items.forEach((album) => {
      this.handleAlbum(album)
    })

    // Append the playlists
    this.container.append(new HTML('div').id('playlists'))
    results.playlists.items.forEach((playlist) => {
      this.handlePlaylist(playlist as Playlist)
    })
  }

  /**
   * Register the events
   *
   * @private
   * @memberof SearchPalette
   */
  private registerEvents (): void {
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
  
  /**
   * Show the search palette
   *
   * @memberof SearchPalette
   */
  show (): void {
    this.element.classOn('show')
  }

  /**
   * Hide the search palette
   *
   * @memberof SearchPalette
   */
  hide (): void {
    this.element.classOff('show')
  }

  /**
   * Toggle the search palette
   *
   * @memberof SearchPalette
   */
  toggle (): void {
    this.element.class('show')
  }
}

export default SearchPalette
