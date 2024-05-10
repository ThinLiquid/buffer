import HTML from '@datkat21/html'
import Player from './player'
import { Track } from '@spotify/web-api-ts-sdk'
import lrcParser from 'lrc-parser'
import * as uuid from 'uuid'
import Queue from './queue'
import { LyricsResponse } from './types'

const LYRIC_OFFSET = 0.25
const APPEAR_DELAY = 250
const DEFAULT_TEXT = '♫⋆｡♪ ₊˚♬ ﾟ.'

class Lyrics {
  private readonly container: HTML

  private readonly prev: HTML
  private readonly current: HTML
  private readonly next: HTML

  private currentTrack: Track | null = null

  constructor (private readonly player: Player, private readonly queue: Queue) {
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
  private async getLyrics (track: Track): Promise<LyricsResponse> {
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
  private init (): void {
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
  private handleNoLyrics (): void {
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
  private registerEvents (): void {
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
  private async handleLyrics (): Promise<void> {
    this.player.audio.currentTime = 0
    const lyrics = await this.getLyrics(this.queue.currentTrack)
    if (lyrics?.syncedLyrics == null) {
      this.handleNoLyrics()
      return
    }
    const lyricsData = lrcParser(lyrics.syncedLyrics).scripts as any[]

    lyricsData.forEach(lyric => {
      lyric.id = uuid.v4()
    })

    let previousLyricId = ''

    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text(lyricsData[0].text)

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')

    const updateLyrics = async (): Promise<void> => {
      this.currentTrack = this.queue.currentTrack
      let index: number = lyricsData.findIndex(
        lyric =>
          this.player.audio.currentTime >= lyric.start - LYRIC_OFFSET &&
          this.player.audio.currentTime <= lyric.end - LYRIC_OFFSET
      )

      const lyric = lyricsData[index]

      if (
        !(
          this.player.audio.currentTime >= lyric.start - LYRIC_OFFSET &&
          this.player.audio.currentTime <= lyric.end - LYRIC_OFFSET &&
          lyric.id !== previousLyricId
        )
      ) {
        return
      }

      const nextLyricText =
        index === lyricsData.length - 1 ? '' : lyricsData[index + 1].text
      const prevLyricText =
        index === 0 ? DEFAULT_TEXT : lyricsData[index - 1].text

      this.current.classOff('appear')
      this.prev.classOff('appear')
      this.next.classOff('appear')

      await new Promise(resolve => {
        setTimeout(resolve, APPEAR_DELAY)
      })

      this.prev.classOn('appear')
      this.current.classOn('appear')
      this.next.classOn('appear')

      this.next.text(
        nextLyricText.trim() === '' ? DEFAULT_TEXT : nextLyricText
      )
      this.current.text(lyric.text.trim() === '' ? DEFAULT_TEXT : lyric.text)
      this.prev.text(
        prevLyricText.trim() === '' ? DEFAULT_TEXT : prevLyricText
      )

      index++
      previousLyricId = lyric.id

      if (index !== lyricsData.length) {
        return
      }
      this.prev.text(prevLyricText)
      this.next.text('')
      this.player.audio.ontimeupdate = null
    }

    updateLyrics().catch(e => e)

    this.player.audio.ontimeupdate = () => {
      if (
        (this.queue.currentTrack as any)._id !==
        (this.currentTrack as any)._id
      ) { this.player.audio.ontimeupdate = null }
      updateLyrics().catch(e => e)
    }
  }
}

export default Lyrics
