import { Track } from '@spotify/web-api-ts-sdk'

export interface CachedData {
  buffers: {
    left: ArrayBuffer
    right: ArrayBuffer
    sampleRate: number
  }
  track: Track
  image: string
}

export type PlayerState = 'playing' | 'paused' | 'stopped' | 'loading' | 'error'

export type PlayerEvent = 'trackchange' | 'statechange' | 'metadatachange'
export type QueueEvent = 'queuechange'

export interface TrackWithUUID extends Track {
  _id: string
}

export interface LyricsResponse {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string
  syncedLyrics: string
}

export interface Lyric {
  start?: number
  end: number
  text: string
  id: string
}
