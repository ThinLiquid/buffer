import './style.scss'
import 'material-symbols'
import eruda from 'eruda'

import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import localforage from 'localforage'

import SearchPalette from './searchpal'
import Player from './player'
import Visualizer from './visualizer'
import Metadata from './metadata'
import Color from './color'
import Lyrics from './lyrics'
import QueuePalette from './queue'

// Set localForage drivers
await localforage.setDriver([
  localforage.INDEXEDDB,
  localforage.WEBSQL,
  localforage.LOCALSTORAGE
])

eruda.init()

// Start Spotify SDK Authorization flow
const sdk: SpotifyApi | null = navigator.onLine
  ? SpotifyApi.withUserAuthorization(
      import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      window.location.origin + window.location.pathname,
      [
        'user-read-private',
        'user-read-email',
        'user-library-modify',
        'user-library-read'
      ]
    )
  : null

window.onload = async () => {
  if (!sdk) return
  await sdk.currentUser.profile()
}

const player = new Player(sdk, localforage)
const color = new Color()
const palette = new SearchPalette(sdk, player, localforage)
const queuePalette = new QueuePalette(player)
new Metadata(sdk, player, color, palette, queuePalette)
new Visualizer(player)
new Lyrics(player)
