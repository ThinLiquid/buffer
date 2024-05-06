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

export type PlayerEvent = 'trackchange' | 'statechange' | 'queuechange'
