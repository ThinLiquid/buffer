import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import YTMusic from './ytmusic'
import localforage from 'localforage'
import { AudioStream } from './piped-types'
import { CachedData, PlayerEvent, PlayerState } from './types'
import WAV from './wav'
import * as uuid from 'uuid'

class Player {
  private readonly yt: YTMusic
  private readonly wav: InstanceType<typeof WAV>
  readonly audio: InstanceType<typeof Audio>
  readonly audioCtx: AudioContext
  state: PlayerState = 'stopped'
  currentTrack: Track | null = null

  queue: Track[] = []
  recommendations: Track[] = []
  queueIndex = 0

  constructor (
    private readonly sdk: SpotifyApi | null,
    private readonly localForage: typeof localforage
  ) {
    this.yt = new YTMusic()
    this.wav = new WAV()
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous'
    this.audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)()
    this.init()
  }

  private init () {
    window.onclick = () => {
      window.onclick = null
      this.audioCtx.resume()
    }
    this.registerEvents()
  }

  private async getRecommendations () {
    if (!this.currentTrack) return
    const seed_tracks = this.queue
      .map(track => {
        if (!track) return null
        return track.id
      })
      .filter(id => id != null) as string[]
    console.log(this.currentTrack)
    const seed_artists = this.currentTrack.artists
      .map(artist => {
        if (!artist) return null
        return artist.id
      })
      .filter(id => id != null) as string[]
    return await this.sdk?.recommendations.get({
      seed_tracks: seed_tracks.slice(Math.max(seed_tracks.length - 5, 0)),
      seed_artists: seed_artists.slice(Math.max(seed_artists.length - 5, 0))
    })
  }

  private registerEvents () {
    this.audio.addEventListener('ended', () => {
      this.next()
    })
  }

  private createAudioBuffer (): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('GET', this.audio.src, true)
      request.responseType = 'arraybuffer'

      request.onload = () => {
        this.audioCtx.decodeAudioData(request.response, resolve, reject)
      }

      request.send()
    })
  }

  private async urltoB64 (url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()
    const reader = new FileReader()

    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private async streamAudio (url: string, track: Track, image?: string) {
    this.audio.src = url
    this.setState('playing')
    this.registerMetadata(track, image)
  }

  private async safariAudioFallback (url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()
    const reader = new FileReader()

    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private playFromBuffers (
    buffers: CachedData['buffers'],
    track: Track,
    image?: string
  ) {
    const buffer = this.audioCtx.createBuffer(
      2,
      buffers.left.byteLength / 4,
      buffers.sampleRate
    )

    buffer.getChannelData(0).set(new Float32Array(buffers.left))
    buffer.getChannelData(1).set(new Float32Array(buffers.right))

    this.audio.src = URL.createObjectURL(this.wav.audioBufferToBlob(buffer))
    this.setState('playing')
    this.registerMetadata(track, image)
  }

  private async spotifyToYTMusic (track: Track): Promise<AudioStream> {
    const results = await this.yt.searchSongs(
      `${track.name} - ${track.artists
        .map((artist: { name: any }) => artist.name)
        .join(', ')}`
    )
    const song = results[0]
    const video = await this.yt.getVideo(song.url.split('v=')[1])
    return video.audioStreams.sort(
      (a: { bitrate: number }, b: { bitrate: number }) => b.bitrate - a.bitrate
    )[0]
  }

  async play (track: Track, buffers?: CachedData['buffers'], image?: string) {
    this.audio.pause()
    this.currentTrack = {
      ...track,
      _id: uuid.v4()
    } as Track

    if (this.queue.length === 0) {
      this.add(track)
    }

    if (
      this.recommendations.length <= 0 &&
      this.queueIndex + 1 >= this.queue.length
    ) {
      const recommendations = await this.getRecommendations()
      if (recommendations) {
        this.recommendations.push(...recommendations.tracks)
      }
      this.emit('queuechange')
    }

    this.emit('trackchange')
    this.setState('loading')
    if (buffers) {
      this.playFromBuffers(buffers, track, image)
      return
    }

    // Find a suitable stream from YouTube Music
    const stream = await this.spotifyToYTMusic(track)

    const url =
      navigator.userAgent.includes('Safari') &&
      !navigator.userAgent.includes('Chrome') &&
      !navigator.userAgent.includes('Firefox')
        ? await this.safariAudioFallback(stream.url)
        : stream.url

    // Stream the audio
    this.streamAudio(url, track, image)

    // Save the track to cache
    ;(async () => {
      const buffer = await this.createAudioBuffer()
      this.localForage.setItem(track.id, {
        buffers: {
          left: buffer.getChannelData(0).buffer,
          right: buffer.getChannelData(1).buffer,
          sampleRate: buffer.sampleRate
        },
        track,
        image: await this.urltoB64(track.album.images[0].url)
      } as CachedData)
    })()

    this.queueIndex++
  }

  private registerMetadata (track: Track, image?: string) {
    const metadata = this.createMetadata(track, image)
    navigator.mediaSession.metadata = metadata
  }

  private createMetadata (track: Track, image?: string) {
    const artwork = [
      ...(image
        ? [
            {
              src: image,
              sizes: `640x640`,
              type: 'image/jpeg'
            }
          ]
        : []),
      ...track.album.images.map(image => ({
        src: image.url,
        sizes: `${image.width}x${image.height}`,
        type: image.url.includes('png') ? 'image/png' : 'image/jpeg'
      }))
    ]
    return new MediaMetadata({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      artwork
    })
  }

  setState (state: PlayerState) {
    this.state = state
    this.emit('statechange')
    switch (state) {
      case 'playing':
        this.audio.play()
        break
      case 'paused':
        this.audio.pause()
        break
      case 'stopped':
        this.audio.pause()
        this.audio.currentTime = 0
        break
      case 'loading':
        break
      default:
        break
    }
  }

  events: Record<PlayerEvent, (() => void)[]> = {
    trackchange: [],
    statechange: [],
    queuechange: []
  }

  private emit (event: PlayerEvent) {
    this.events[event]?.forEach(callback => callback())
  }

  on (event: PlayerEvent, callback: () => void) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(callback)
  }

  next () {
    if (this.queueIndex + 1 >= this.queue.length) {
      this.add(this.recommendations[0])
      this.recommendations.shift()
    }
    this.play(this.queue[this.queueIndex++])
  }

  prev () {
    if (this.queueIndex <= 0) return
    this.play(this.queue[--this.queueIndex])
  }

  reset () {
    this.queue = []
    this.recommendations = []
    this.queueIndex = 0
    this.emit('queuechange')
  }

  add (track: Track) {
    this.queue.push(track)
    this.emit('queuechange')
  }

  remove (index: number) {
    this.queue.splice(index, 1)
    this.emit('queuechange')
  }

  async load (tracks: Track['id'][]) {
    const _tracks = await Promise.all(
      tracks.map(async id => await this.sdk?.tracks.get(id))
    )
    this.queue.push(...(_tracks.filter(track => track != null) as Track[]))
    this.emit('queuechange')
  }

  start () {
    if (this.queue.length <= 0) return
    this.play(this.queue[this.queueIndex])
    this.queueIndex++
  }
}

export default Player
