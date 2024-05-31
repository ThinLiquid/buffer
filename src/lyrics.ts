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
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor (private readonly player: Player, private readonly queue: Queue) {
    this.container = new HTML('div').classOn('lyrics')
    this.prev = new HTML('div')
    this.current = new HTML('div')
    this.next = new HTML('div')
    this.init()
  }

  private async getLyrics (track: Track): Promise<LyricsResponse | null> {
    try {
      const res = await fetch(
        `https://lrclib.net/api/get?track_name=${encodeURIComponent(track.name)}&album_name=${encodeURIComponent(track.album.name)}&artist_name=${encodeURIComponent(track.artists[0].name)}&duration=${track.duration_ms / 1000}`
      )
      if (res.ok) {
        return await res.json()
      } else {
        console.error(`Failed to fetch lyrics: ${res.statusText}`)
        return null
      }
    } catch (error) {
      console.error(`Error fetching lyrics: ${error}`)
      return null
    }
  }

  private init (): void {
    this.container.appendTo(document.body)
    this.prev.appendTo(this.container)
    this.current.appendTo(this.container)
    this.next.appendTo(this.container)
    this.registerEvents()
  }

  private handleNoLyrics (): void {
    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text("Can't find lyrics for this song.")
    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')
  }

  private registerEvents (): void {
    this.player.on('trackchange', () => {
      this.handleLyrics().catch(console.error)
    })
  }

  private async handleLyrics (): Promise<void> {
    if (!this.queue.currentTrack) {
      console.error('No current track found in the queue.')
      this.handleNoLyrics()
      return
    }

    this.player.audio.currentTime = 0
    const lyrics = await this.getLyrics(this.queue.currentTrack)
    if (!lyrics || !lyrics.syncedLyrics) {
      this.handleNoLyrics()
      return
    }

    const lyricsData = lrcParser(lyrics.syncedLyrics).scripts as unknown as Lyric[]
    lyricsData.forEach(lyric => { lyric.id = uuid.v4() })

    let previousLyricId = ''

    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text(lyricsData[0]?.text ?? DEFAULT_TEXT)

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')

    const isCurrentLyric = (lyric: Lyric, currentTime: number): boolean =>
      currentTime >= (lyric.start ?? -Infinity) - LYRIC_OFFSET &&
      currentTime <= lyric.end - LYRIC_OFFSET &&
      lyric.id !== previousLyricId

    const updateLyrics = (): void => {
      const currentTime = this.player.audio.currentTime
      const index = lyricsData.findIndex(
        lyric => currentTime >= (lyric.start ?? -Infinity) - LYRIC_OFFSET && currentTime <= lyric.end - LYRIC_OFFSET
      )

      if (index === -1 || !isCurrentLyric(lyricsData[index], currentTime)) {
        return
      }

      const lyric = lyricsData[index]
      const nextLyricText = lyricsData[index + 1]?.text ?? ''
      const prevLyricText = lyricsData[index - 1]?.text ?? DEFAULT_TEXT

      const updateText = (element: InstanceType<typeof HTML>, text: string): void => {
        const trimmedText = text.trim()
        if (element.getText() !== trimmedText) {
          element.text(trimmedText === '' ? DEFAULT_TEXT : trimmedText)
        }
      }

      this.current.classOff('appear')
      this.prev.classOff('appear')
      this.next.classOff('appear')

      setTimeout(() => {
        this.prev.classOn('appear')
        this.current.classOn('appear')
        this.next.classOn('appear')
      }, APPEAR_DELAY)

      updateText(this.next, index + 1 !== lyricsData.length ? nextLyricText : 'ᶻ 𝗓 𐰁 .ᐟ')
      updateText(this.current, lyric.text)
      updateText(this.prev, prevLyricText)

      previousLyricId = lyric.id
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      if (this.queue.currentTrack !== this.currentTrack) {
        clearInterval(this.intervalId!)
        this.intervalId = null
      } else {
        updateLyrics()
      }
    }, 100)
  }
}

export default Lyrics
