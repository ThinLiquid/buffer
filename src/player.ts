import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import YTMusic from './ytmusic'
import localforage from 'localforage'
import { AudioStream } from './piped-types'
import { CachedData, PlayerEvent, PlayerState } from './types'
import WAV from './wav'
import Queue from './queue'
import { arrayBufferToWav } from './util'

class Player {
  private readonly MAX_CALLBACKS = 10
  readonly audio: InstanceType<typeof Audio>
  metadata: MediaMetadata | null = null

  private _state: PlayerState = 'stopped'
  get state (): PlayerState {
    return this._state
  }

  set state (value: PlayerState) {
    // Set the state adn emit the state change event
    this._state = value
    this.emit('statechange')

    // Handle the state
    switch (this._state) {
      case 'playing':
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(this.handleError)
        }
        this.audio.play().catch(this.handleError)
        if (navigator.mediaSession.metadata !== this.metadata) {
          navigator.mediaSession.metadata = this.metadata
        }
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

  /**
   * Creates an instance of Player.
   *
   * @param sdk The Spotify API instance
   * @param localForage The localForage instance
   * @param queue The queue instance
   */
  constructor (
    private readonly sdk: SpotifyApi | null,
    private readonly localForage: typeof localforage,
    private readonly queue: Queue
  ) {
    // Create an audio element
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous' // Required so we can decode cross-origin audio data

    // Initialize the player
    this.init()
  }

  private _yt?: InstanceType<typeof YTMusic>
  private get yt (): InstanceType<typeof YTMusic> {
    if (this._yt == null) {
      this._yt = new YTMusic()
    }
    return this._yt
  }

  private _wav?: InstanceType<typeof WAV>
  private get wav (): InstanceType<typeof WAV> {
    if (this._wav == null) {
      this._wav = new WAV()
    }
    return this._wav
  }

  private _audioCtx?: InstanceType<typeof AudioContext>
  get audioCtx (): InstanceType<typeof AudioContext> {
    if (this._audioCtx == null) {
      this._audioCtx = new AudioContext()
    }
    return this._audioCtx
  }

  /**
   * Initialize the player
   *
   * @private
   * @memberof Player
   */
  private init (): void {
    // Workaround for Safari's autoplay policy
    const clickHandler = async (): Promise<void> => {
      window.onclick = null
      // Remove the event listener when it's no longer needed
      window.removeEventListener('click', () => {
        clickHandler().catch(this.handleError)
      })
      this.audioCtx.resume().catch(this.handleError)
    }
    window.addEventListener('click', () => {
      clickHandler().catch(this.handleError)
    })

    // Register media session handlers
    navigator.mediaSession.setActionHandler('play', () => {
      this.state = 'playing'
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      this.state = 'paused'
    })
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      this.audio.currentTime -= 10
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      this.audio.currentTime += 10
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.prev().catch(this.handleError)
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.next().catch(this.handleError)
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      this.state = 'stopped'
    })
    navigator.mediaSession.setActionHandler('seekto', ({ seekTime }) => {
      this.audio.currentTime = seekTime ?? this.audio.currentTime
    })

    // Register event listeners
    this.registerEvents()
  }

  /**
   * Register event listeners
   *
   * @private
   * @memberof Player
   */
  private registerEvents (): void {
    this.audio.addEventListener('ended', () => {
      this.next().catch(this.handleError)
    })
  }

  /**
   * Create an audio buffer from the audio element's source
   *
   * @private
   * @returns The audio buffer
   * @memberof Player
   */
  private async createAudioBuffer (): Promise<AudioBuffer> {
    return await new Promise((resolve, reject) => {
      // Make a request to get the audio data
      const request = new XMLHttpRequest()
      request.open('GET', this.audio.src, true)
      request.responseType = 'arraybuffer'

      request.onload = async () => {
        // Decode the audio data
        await this.audioCtx.decodeAudioData(request.response, resolve, reject)
      }

      request.send()
    })
  }

  /**
   * Convert a URL to a base64 string
   *
   * @private
   * @param url The URL to convert
   * @returns The base64 string
   * @memberof Player
   */
  private async urltoB64 (url: string): Promise<string> {
    const response = await fetch(url)
    const blob = await response.blob()
    const reader = new FileReader()

    return await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Stream audio from a URL
   *
   * @private
   * @param url The URL to stream from
   * @memberof Player
   */
  private async streamAudio (url: string): Promise<void> {
    this.audio.src = url
    this.state = 'playing'
  }

  /**
   * Fallback to WAV for Safari
   *
   * @private
   * @param url The URL to fallback from
   * @returns The WAV audio stream
   * @memberof Player
   */
  private async safariAudioFallback (url: string): Promise<string> {
    // Adapted from https://stackoverflow.com/a/62173861
    // Download the audio stream
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const wav = await arrayBufferToWav(this.audioCtx, buffer)
    return URL.createObjectURL(wav)
  }

  private async blobToDataURL (blob: Blob): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as any)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Play audio from buffers
   *
   * @private
   * @param buffers The buffers to play from
   * @memberof Player
   */
  private async playFromBuffers (
    buffers: CachedData['buffers']
  ): Promise<void> {
    // Create an audio buffer
    const buffer = this.audioCtx.createBuffer(
      2,
      buffers.left.byteLength / 4,
      buffers.sampleRate
    )

    // Set the audio buffer's channel data
    buffer.getChannelData(0).set(new Float32Array(buffers.left))
    buffer.getChannelData(1).set(new Float32Array(buffers.right))

    // Stream the audio
    this.audio.src = await this.blobToDataURL(this.wav.audioBufferToBlob(buffer))
    this.state = 'playing'
  }

  /**
   * Convert a Spotify track to a YouTube Music audio stream
   *
   * @private
   * @param track The Spotify track to convert
   * @returns The YouTube Music audio stream
   * @memberof Player
   */
  private async spotifyToYTMusic (track: Track): Promise<AudioStream> {
    // Search for the track on YouTube Music
    const results = await this.yt.searchSongs(
      `${track.name} - ${track.artists
        .map((artist: { name: any }) => artist.name)
        .join(', ')}`
    )

    // Get the video's audio stream
    const song = results[0]
    const video = await this.yt.getVideo(song.url.split('v=')[1])

    // Get the highest quality audio stream and return it
    return video.audioStreams.sort(
      (a: { bitrate: number }, b: { bitrate: number }) => b.bitrate - a.bitrate
    )[0]
  }

  /**
   * Play a track
   *
   * @private
   * @param track The track to play
   * @param buffers The buffers to play from
   * @param image The image to display
   * @memberof Player
   */
  private async play (track: Track): Promise<void> {
    // Pause the audio
    this.audio.pause()
    this.emit('trackchange')
    this.state = 'loading'

    // Check if the track is cached
    if (localforage.getItem(track.id) != null) {
      const cached = (await localforage.getItem(track.id)) as CachedData
      this.registerMetadata(track, cached.image)
      await this.playFromBuffers(cached.buffers)
      return
    }

    // Find a suitable stream from YouTube Music
    const stream = await this.spotifyToYTMusic(track)

    // Check if the user is using Safari
    const url = window.isSafari
      ? await this.safariAudioFallback(stream.url) // Fallback to WAV for Safari
      : stream.url // Use the original stream URL

    // Stream the audio
    this.registerMetadata(track)
    await this.streamAudio(url)

    // Save the track to cache
    const buffer = await this.createAudioBuffer()
    await this.localForage.setItem(track.id, {
      buffers: {
        left: buffer.getChannelData(0).buffer,
        right: buffer.getChannelData(1).buffer,
        sampleRate: buffer.sampleRate
      },
      track,
      image: await this.urltoB64(track.album.images[0].url)
    })
  }

  /**
   * Register metadata
   *
   * @private
   * @param track The track to register metadata for
   * @param image The image to display
   * @memberof Player
   */
  private registerMetadata (track: Track, image?: string): void {
    this.metadata = this.createMetadata(track, image)
    this.emit('metadatachange')
  }

  /**
   * Create metadata
   *
   * @private
   * @param track The track to create metadata for
   * @param image The image to display
   * @returns The metadata
   * @memberof Player
   */
  private createMetadata (track: Track, image?: string): MediaMetadata {
    // Create an array of artwork
    const artwork = [
      ...(image != null ? [{ src: image }] : []),
      ...(navigator.onLine
        ? track.album.images.map(image => ({
          src: image.url,
          sizes: `${image.width}x${image.height}`,
          type: image.url.includes('png') ? 'image/png' : 'image/jpeg'
        }))
        : [])
    ]

    // Return the metadata
    return new MediaMetadata({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      artwork
    })
  }

  private readonly events: Record<PlayerEvent, Array<() => void>> = {
    trackchange: [],
    statechange: [],
    metadatachange: []
  }

  /**
   * Emit an event
   *
   * @private
   * @param event The event to be emitted
   * @memberof Player
   */
  private emit (event: PlayerEvent): void {
    // Only call the first MAX_CALLBACKS callbacks
    this.events[event]?.slice(0, this.MAX_CALLBACKS).forEach(callback => callback())
  }

  /**
   * Register an event listener
   *
   * @param event The event to listen for
   * @param callback The callback to be called when the event is emitted
   * @memberof Player
   */
  on (event: PlayerEvent, callback: () => void): void {
    // Only add the callback if there are less than MAX_CALLBACKS for this event
    if (this.events[event].length < this.MAX_CALLBACKS) {
      this.events[event].push(callback)
    }
  }

  /**
   * Play the next track in the queue
   *
   * @memberof Player
   */
  async next (): Promise<void> {
    if (this.queue.index >= this.queue.tracks.length - 1) { // Prefetch when there's only one track left
      if (this.sdk == null) {
        return
      }
      this.queue.add(
        ...(await this.sdk.recommendations.get({
          seed_artists: this.queue.tracks.map(track => track.artists.map(artist => artist.id)).flat(),
          seed_tracks: this.queue.tracks.map(track => track.id),
          limit: 1
        })).tracks
      )
    }
    await this.play(this.queue.tracks[this.queue.index++])
  }

  /**
   * Play the previous track in the queue
   *
   * @memberof Player
   */
  async prev (): Promise<void> {
    // Check if the queue index is at the beginning
    if (this.queue.index <= 0) return
    await this.play(this.queue.tracks[--this.queue.index])
  }

  /**
   * Start the player
   *
   * @memberof Player
   */
  async start (): Promise<void> {
    // Play the next track in the queue
    await this.next()
  }

  private handleError (error: any): void {
    this.handleError(error)
  }
}

export default Player
