import { Track } from '@spotify/web-api-ts-sdk'
import { QueueEvent, TrackWithUUID } from './types'
import { v4 as uuid } from 'uuid'

class Queue {
  index = 0
  tracks: TrackWithUUID[] = []

  private readonly events: Record<QueueEvent, Array<() => void>> = {
    queuechange: []
  }

  /**
   * Emit an event
   *
   * @param event The event to be emitted
   * @memberof Queue
   */
  private emit (event: QueueEvent): void {
    this.events[event]?.forEach(callback => callback())
  }

  /**
   * Register an event listener
   *
   * @param event The event to listen for
   * @param callback The callback to be called
   * @memberof Queue
   */
  on (event: QueueEvent, callback: () => void): void {
    this.events[event].push(callback)
  }

  /**
   * Reset the queue
   *
   * @memberof Queue
   */
  reset (): void {
    this.index = 0
    this.tracks = []
    this.emit('queuechange')
  }

  /**
   * Add UUIDs to tracks
   *
   * @private
   * @param tracks The tracks to add UUIDs to
   * @returns The tracks with UUIDs
   * @memberof Queue
   */
  private addUUID (tracks: Track[]): TrackWithUUID[] {
    return tracks.map(x => ({
      ...x,
      _id: uuid()
    }))
  }

  /**
   * Add tracks to the queue
   *
   * @param tracks The tracks to add
   * @memberof Queue
   */
  add (...tracks: Track[]): void {
    this.tracks.push(...this.addUUID(tracks))
    this.emit('queuechange')
  }

  /**
   * Remove a track from the queue
   *
   * @param index The index of the track to remove
   * @memberof Queue
   */
  remove (index: number): void {
    this.tracks.splice(index, 1)
    this.emit('queuechange')
  }

  /**
   * Load tracks into the queue
   *
   * @param tracks The tracks to load
   * @memberof Queue
   */
  load (...tracks: Track[]): void {
    tracks = this.addUUID(tracks)
    this.index = 0
    this.tracks = this.addUUID(tracks)
    this.emit('queuechange')
  }

  /**
   * Get the current track
   *
   * @readonly
   * @memberof Queue
   */
  get currentTrack (): TrackWithUUID {
    return this.tracks[this.index - 1]
  }
}

export default Queue
