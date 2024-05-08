import { SearchResults, SearchVideo, Video } from './piped-types'

class YTMusic {
  instance: string
  constructor () {
    this.instance = 'https://pipedapi.reallyaweso.me'
  }

  /**
   * Search for songs
   *
   * @param query The query to search for
   * @returns The search results
   * @memberof YTMusic
   */
  async searchSongs (
    query: string
  ): Promise<SearchResults<SearchVideo>['items']> {
    const res = await fetch(
      `${this.instance}/search?q=${encodeURIComponent(
        query
      )}&filter=music_songs`
    )
    const data = await res.json()
    return data.items
  }

  /**
   * Get a video
   *
   * @param videoId The video ID to get
   * @returns The video
   * @memberof YTMusic
   */
  async getVideo (videoId: string): Promise<Video> {
    return await fetch(`${this.instance}/streams/${videoId}`)
      .then(async response => await response.json())
      .then(data => data)
  }
}

export default YTMusic
