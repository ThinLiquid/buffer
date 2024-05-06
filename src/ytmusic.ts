import { SearchResults, SearchVideo, Video } from './piped-types'

const instances = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.syncpundit.io',
  'https://api-piped.mha.fi',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.lol',
  'https://pipedapi.leptons.xyz',
  'https://piped-api.lunar.icu',
  'https://ytapi.dc09.ru',
  'https://pipedapi.colinslegacy.com',
  'https://yapi.vyper.me',
  'https://api.looleh.xyz',
  'https://piped-api.cfe.re',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.darkness.services',
  'https://pipedapi-libre.kavin.rocks',
  'https://pa.mint.lgbt',
  'https://pa.il.ax',
  'https://piped-api.privacy.com.de',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.us.projectsegfau.lt',
  'https://watchapi.whatever.social',
  'https://api.piped.privacydev.net',
  'https://pipedapi.palveluntarjoaja.eu',
  'https://pipedapi.smnz.de',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.qdi.fi',
  'https://piped-api.hostux.net',
  'https://pdapi.vern.cc',
  'https://pipedapi.pfcd.me',
  'https://pipedapi.frontendfriendly.xyz',
  'https://api.piped.yt',
  'https://pipedapi.astartes.nl',
  'https://pipedapi.osphost.fi',
  'https://pipedapi.simpleprivacy.fr',
  'https://pipedapi.drgns.space',
  'https://piapi.ggtyler.dev',
  'https://api.watch.pluto.lat',
  'https://piped-backend.seitan-ayoub.lol',
  'https://pipedapi.owo.si',
  'https://pipedapi.12a.app',
  'https://api.piped.minionflo.net',
  'https://pipedapi.nezumi.party',
  'https://pipedapi.ducks.party',
  'https://pipedapi.ngn.tf',
  'https://pipedapi.coldforge.xyz',
  'https://piped-api.codespace.cz',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.phoenixthrush.com'
]

class YTMusic {
  private instanceIndex: number
  instance: string
  constructor () {
    this.instanceIndex = 0
    this.instance = instances[this.instanceIndex]
    this.init()
  }

  private async init () {
    await this.findWorkingInstance()
  }

  private async findWorkingInstance () {
    const res = await fetch(instances[this.instanceIndex])
    if (res.ok) {
      return
    }
    this.instanceIndex++
    this.instance = instances[this.instanceIndex]
    await this.findWorkingInstance()
  }

  async searchSongs (
    query: string
  ): Promise<SearchResults<SearchVideo>['items']> {
    try {
      const res = await fetch(
        `${this.instance}/search?q=${encodeURIComponent(
          query
        )}&filter=music_songs`
      )
      const data = await res.json()
      return data.items
    } catch (e) {
      this.instanceIndex++
      await this.findWorkingInstance()
      return this.searchSongs(query)
    }
  }

  getVideo (videoId: string): Promise<Video> {
    return fetch(`${this.instance}/streams/${videoId}`)
      .then(response => response.json())
      .then(data => data)
  }
}

export default YTMusic
