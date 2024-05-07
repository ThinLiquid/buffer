import { SearchResults, SearchVideo, Video } from './piped-types'

class YTMusic {
  instance: string
  constructor () {
    this.instance = 'https://pipedapi.reallyaweso.me'
    this.init()
  }

  private async init () {}

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

  getVideo (videoId: string): Promise<Video> {
    return fetch(`${this.instance}/streams/${videoId}`)
      .then(response => response.json())
      .then(data => data)
  }
}

export default YTMusic
