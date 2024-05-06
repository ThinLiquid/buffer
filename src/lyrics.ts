import HTML from '@datkat21/html'
import Player from './player'
import { Track } from '@spotify/web-api-ts-sdk'
import lrcParser from 'lrc-parser'
import * as uuid from 'uuid'

const LYRIC_OFFSET = 0.25
const APPEAR_DELAY = 250
const DEFAULT_TEXT = '♫⋆｡♪ ₊˚♬ ﾟ.'

class Lyrics {
  container: HTML

  prev: HTML
  current: HTML
  next: HTML

  currentTrack: Track | null = null

  constructor (private readonly player: Player) {
    this.container = new HTML('div').classOn('lyrics')

    this.prev = new HTML('div')
    this.current = new HTML('div')
    this.next = new HTML('div')

    this.init()
  }

  async getLyrics (track: Track) {
    return fetch(
      `https://lrclib.net/api/get?track_name=${encodeURIComponent(
        track.name
      )}&album_name=${encodeURIComponent(
        track.album.name
      )}&artist_name=${encodeURIComponent(track.artists[0].name)}&duration=${
        track.duration_ms / 1000
      }`
    ).then(res => {
      if (res.ok) return res.json()
      return null
    })
  }

  init () {
    this.container.appendTo(document.body)

    this.prev.appendTo(this.container)
    this.current.appendTo(this.container)
    this.next.appendTo(this.container)

    this.registerEvents()
  }

  handleNoLyrics () {
    this.prev.text('')
    this.current.text(DEFAULT_TEXT)
    this.next.text("Can't find lyrics for this song.")

    this.prev.classOn('appear')
    this.current.classOn('appear')
    this.next.classOn('appear')
  }

  registerEvents () {
    this.player.on('trackchange', async () => {
      const lyrics = await this.getLyrics(this.player.currentTrack!)
      if (!lyrics || lyrics.syncedLyrics == null) {
        this.handleNoLyrics()
        return
      }
      const lyricsData = lrcParser(lyrics.syncedLyrics).scripts!

      lyricsData.forEach(lyric => {
        ;(lyric as any).id = uuid.v4()
      })

      let previousLyricId = ''

      this.prev.text('')
      this.current.text(DEFAULT_TEXT)
      this.next.text(lyricsData[0].text)

      this.prev.classOn('appear')
      this.current.classOn('appear')
      this.next.classOn('appear')

      const updateLyrics = async (): Promise<void> => {
        this.currentTrack = this.player.currentTrack
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
            (lyric as any).id !== previousLyricId
          )
        ) {
          return
        }

        const prevLyricText =
          index === lyricsData.length - 1 ? '' : lyricsData[index + 1].text
        const nextLyricText =
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
          prevLyricText.trim() === '' ? DEFAULT_TEXT : prevLyricText
        )
        this.current.text(lyric.text.trim() === '' ? DEFAULT_TEXT : lyric.text)
        this.prev.text(
          nextLyricText.trim() === '' ? DEFAULT_TEXT : nextLyricText
        )

        index++
        previousLyricId = (lyric as any).id

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
          (this.player.currentTrack as any)._id !==
          (this.currentTrack as any)._id
        )
          this.player.audio.ontimeupdate = null
        updateLyrics().catch(e => e)
      }
    })
  }
}

export default Lyrics
