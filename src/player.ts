import { SpotifyApi, Track } from '@spotify/web-api-ts-sdk'
import YTMusic from './ytmusic'
import localforage from 'localforage'
import { AudioStream } from './piped-types'
import { CachedData, PlayerEvent, PlayerState } from './types'
import WAV from './wav'
import Queue from './queue'
import { arrayBufferToWav } from './util'

class Player {
  private readonly yt: YTMusic
  private readonly wav: InstanceType<typeof WAV>
  readonly audio: InstanceType<typeof Audio>
  readonly audioCtx: AudioContext
  metadata: MediaMetadata | null = null
  state: PlayerState = 'stopped'

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
    // Initialize services/utils
    this.yt = new YTMusic()
    this.wav = new WAV()

    // Create an audio element
    this.audio = new Audio()
    this.audio.crossOrigin = 'anonymous' // Required so we can decode cross-origin audio data

    // Create an audio context
    this.audioCtx = new AudioContext()

    // Initialize the player
    this.init()
  }

  /**
   * Initialize the player
   *
   * @private
   * @memberof Player
   */
  private init (): void {
    // Workaround for Safari's autoplay policy
    window.onclick = async () => {
      window.onclick = null
      await this.audioCtx.resume()
    }

    // Register media session handlers
    navigator.mediaSession.setActionHandler('play', () => {
      this.setState('playing').catch(console.error)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      this.setState('paused').catch(console.error)
    })
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      this.audio.currentTime -= 10
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      this.audio.currentTime += 10
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.prev().catch(console.error)
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.next().catch(console.error)
    })
    navigator.mediaSession.setActionHandler('stop', () => {
      this.setState('stopped').catch(console.error)
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
      this.next().catch(console.error)
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
    await this.setState('playing')
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
    this.audio.src = URL.createObjectURL(this.wav.audioBufferToBlob(buffer))
    await this.setState('playing')
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
  private async play (track: Track, buffers?: CachedData['buffers'], image?: string): Promise<void> {
    // Pause the audio
    this.audio.pause()

    this.emit('trackchange')

    await this.setState('loading')

    // Check if the track is cached
    if (buffers != null) {
      await this.playFromBuffers(buffers)
      this.registerMetadata(track, image)
      return
    }

    // Find a suitable stream from YouTube Music
    const stream = await this.spotifyToYTMusic(track)

    // Check if the user is using Safari
    const url =
      navigator.userAgent.includes('Safari') &&
      !navigator.userAgent.includes('Chrome') &&
      !navigator.userAgent.includes('Firefox')
        ? await this.safariAudioFallback(stream.url) // Fallback to WAV for Safari
        : stream.url // Use the original stream URL

    // Stream the audio
    await this.streamAudio(url)
    this.registerMetadata(track)

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

  /**
   * Set the player's state
   *
   * @param state The state to set
   * @memberof Player
   */
  async setState (state: PlayerState): Promise<void> {
    // Set the state adn emit the state change event
    this.state = state
    this.emit('statechange')

    // Handle the state
    switch (state) {
      case 'playing':
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume()
        }
        await this.audio.play()
        navigator.mediaSession.metadata = this.metadata
        break
      case 'paused':
        await this.audio.pause()
        break
      case 'stopped':
        await this.audio.pause()
        this.audio.currentTime = 0
        break
      case 'loading':
        break
      default:
        break
    }
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
    this.events[event]?.forEach(callback => callback())
  }

  /**
   * Register an event listener
   *
   * @param event The event to listen for
   * @param callback The callback to be called when the event is emitted
   * @memberof Player
   */
  on (event: PlayerEvent, callback: () => void): void {
    this.events[event].push(callback)
  }

  /**
   * Play the next track in the queue
   *
   * @memberof Player
   */
  async next (): Promise<void> {
    if (this.queue.index >= this.queue.tracks.length) {
      if (this.sdk == null) {
        return
      }
      this.queue.add(
        ...(await this.sdk.recommendations.get({
          seed_artists: this.queue.currentTrack.artists.map(artist => artist.id),
          seed_tracks: [this.queue.currentTrack.id],
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
}

export default Player
