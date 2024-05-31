import HTML from '@datkat21/html'
import Player from './player'
import { Track } from '@spotify/web-api-ts-sdk'
import lrcParser from 'lrc-parser'
import * as uuid from 'uuid'
import Queue from './queue'
import { Lyric, LyricsResponse } from './types'

const LYRIC_OFFSET = 0.25
const APPEAR_DELAY = 250
const DEFAULT_TEXT = '♫⋆｡♪ ₊˚♬ ﾟ.'

class Lyrics {
  private readonly container: HTML

  private readonly prev: HTML
  private readonly current: HTML
  private readonly next: HTML

  private currentTrack: Track | null = null
  private lyricsData: Lyric[] = []
  private previousLyricId: string = ''

  constructor(private readonly player: Player, private readonly queue: Queue) {
    console.log(currentTrack)
    this.container = new HTML('div').classOn('lyrics')

    this.prev = new HTML('div')import HTML from '@datkat21/html'
import Player from './player'
import { Track } from '@spotify/web-api-ts-sdk'
import lrcParser from 'lrc-parser'
import * as uuid from 'uuid'
import Queue from './queue'
import { Lyric, LyricsResponse } from './types'

const LYRIC_OFFSET = 0.25
const APPEAR_DELAY = 250
const DEFAULT_TEXT = '♫⋆｡♪ ₊˚♬ ﾟ.'

class Lyrics {
  private readonly container: HTML

  private readonly prev: HTML
  private readonly current: HTML
  private readonly next: HTML

  private currentTrack: Track | null = null
  private lyricsData: Lyric[] = []
  private previousLyricId: string = ''

  constructor(private readonly player: Player, private readonly queue: Queue) {
    this.container = new HTML('div').classOn('lyrics')

    this.prev = new HTML('div')
    this.current = new HTML('div')
    this.next = new HTML('div')

    this.init()
  }

  /**
   * Get the lyrics of a track
   *
   * @private
   * @param track The track to get the lyrics of
   * @returns The lyrics of the track
   */
  private async getLyrics(track: Track): Promise<LyricsResponse> {
    return await fetch(
      `https://lrclib.net/api/get?track_name=${encodeURIComponent(
        track.name
      )}&album_name=${encodeURIComponent(
        track.album.name
      )}&artist_name=${encodeURIComponent(track.artists[0].name)}&duration=${
        track.duration_ms / 1000
      }`
    ).then(async res => {
      if (res.ok) return await res.json()
      return null
    })
  }

  /**
   * Initialize the lyrics
   *
   * @private
   * @memberof Lyrics
   */
  private init(): void {
    // Append the elements to the document
    this.container.appendTo(document.body)

    this.prev.appendTo(this.container)
    this.current.appendTo(this.container)
    this.next.appendTo(this.container)

    // Register the events
    this.registerEvents()
  }

  /**
   * Handle when no lyrics are found
   *
   * @private
   * @memberof Lyrics
   */
  private handleNoLyrics(): void {
    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text("Can't find lyrics for this song.")

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')
  }

  /**
   * Register the events
   *
   * @private
   * @memberof Lyrics
   */
  private registerEvents(): void {
    this.player.on('trackchange', () => {
      this.handleLyrics().catch(console.error)
    })
  }

  /**
   * Handle the lyrics
   *
   * @private
   * @memberof Lyrics
   */
  private async handleLyrics(): Promise<void> {
    this.player.audio.currentTime = 0
    const lyrics = await this.getLyrics(this.queue.currentTrack)
    if (lyrics?.syncedLyrics == null) {
      this.handleNoLyrics()
      return
    }
    this.lyricsData = lrcParser(lyrics.syncedLyrics).scripts as unknown as Lyric[]

    this.lyricsData.forEach(lyric => {
      lyric.id = uuid.v4()
    })

    this.previousLyricId = ''

    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text(this.lyricsData[0].text)

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')

    this.player.audio.ontimeupdate = () => this.updateLyrics()
    this.updateLyrics() // Initial call to set the first lyrics
  }

  /**
   * Update the lyrics based on the current time of the audio
   *
   * @private
   * @memberof Lyrics
   */
  private updateLyrics(): void {
    const currentTime = this.player.audio.currentTime

    const index = this.lyricsData.findIndex(
      lyric =>
        currentTime >= (lyric.start ?? -Infinity) - LYRIC_OFFSET &&
        currentTime <= lyric.end - LYRIC_OFFSET
    )

    if (index === -1 || this.lyricsData[index].id === this.previousLyricId) {
      return
    }

    const lyric = this.lyricsData[index]
    const nextLyricText = this.lyricsData[index + 1]?.text ?? ''
    const prevLyricText = this.lyricsData[index - 1]?.text ?? DEFAULT_TEXT

    this.current.classOff('appear')
    this.prev.classOff('appear')
    this.next.classOff('appear')

    setTimeout(() => {
      this.prev.classOn('appear')
      this.current.classOn('appear')
      this.next.classOn('appear')

      this.prev.text(prevLyricText)
      this.current.text(lyric.text)
      this.next.text(nextLyricText)

      this.previousLyricId = lyric.id
    }, APPEAR_DELAY)
  }
}

export default Lyrics

    this.current = new HTML('div')
    this.next = new HTML('div')

    this.init()
  }

  /**
   * Get the lyrics of a track
   *
   * @private
   * @param track The track to get the lyrics of
   * @returns The lyrics of the track
   */
  private async getLyrics(track: Track): Promise<LyricsResponse> {
    return await fetch(
      `https://lrclib.net/api/get?track_name=${encodeURIComponent(
        track.name
      )}&album_name=${encodeURIComponent(
        track.album.name
      )}&artist_name=${encodeURIComponent(track.artists[0].name)}&duration=${
        track.duration_ms / 1000
      }`
    ).then(async res => {
      if (res.ok) return await res.json()
      return null
    })
  }

  /**
   * Initialize the lyrics
   *
   * @private
   * @memberof Lyrics
   */
  private init(): void {
    // Append the elements to the document
    this.container.appendTo(document.body)

    this.prev.appendTo(this.container)
    this.current.appendTo(this.container)
    this.next.appendTo(this.container)

    // Register the events
    this.registerEvents()
  }

  /**
   * Handle when no lyrics are found
   *
   * @private
   * @memberof Lyrics
   */
  private handleNoLyrics(): void {
    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text("Can't find lyrics for this song.")

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')
  }

  /**
   * Register the events
   *
   * @private
   * @memberof Lyrics
   */
  private registerEvents(): void {
    this.player.on('trackchange', () => {
      this.handleLyrics().catch(console.error)
    })
  }

  /**
   * Handle the lyrics
   *
   * @private
   * @memberof Lyrics
   */
  private async handleLyrics(): Promise<void> {
    this.player.audio.currentTime = 0
    const lyrics = await this.getLyrics(this.queue.currentTrack)
    if (lyrics?.syncedLyrics == null) {
      this.handleNoLyrics()
      return
    }
    this.lyricsData = lrcParser(lyrics.syncedLyrics).scripts as unknown as Lyric[]

    this.lyricsData.forEach(lyric => {
      lyric.id = uuid.v4()
    })

    this.previousLyricId = ''

    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text(this.lyricsData[0].text)

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')

    this.player.audio.ontimeupdate = () => this.updateLyrics()
    this.updateLyrics() // Initial call to set the first lyrics
  }

  /**
   * Update the lyrics based on the current time of the audio
   *
   * @private
   * @memberof Lyrics
   */
  private updateLyrics(): void {
    const currentTime = this.player.audio.currentTime

    const index = this.lyricsData.findIndex(
      lyric =>
        currentTime >= (lyric.start ?? -Infinity) - LYRIC_OFFSET &&
        currentTime <= lyric.end - LYRIC_OFFSET
    )

    if (index === -1 || this.lyricsData[index].id === this.previousLyricId) {
      return
    }

    const lyric = this.lyricsData[index]
    const nextLyricText = this.lyricsData[index + 1]?.text ?? ''
    const prevLyricText = this.lyricsData[index - 1]?.text ?? DEFAULT_TEXT

    this.current.classOff('appear')
    this.prev.classOff('appear')
    this.next.classOff('appear')

    setTimeout(() => {
      this.prev.classOn('appear')
      this.current.classOn('appear')
      this.next.classOn('appear')

      this.prev.text(prevLyricText)
      this.current.text(lyric.text)
      this.next.text(nextLyricText)

      this.previousLyricId = lyric.id
    }, APPEAR_DELAY)
  }
}

export default Lyrics
