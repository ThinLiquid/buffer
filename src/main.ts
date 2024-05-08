import './style.scss'
import 'material-symbols'

import HTML from '@datkat21/html'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import localforage from 'localforage'
import { registerSW } from 'virtual:pwa-register'

import SearchPalette from './searchpal'
import Player from './player'
import Visualizer from './visualizer'
import Metadata from './metadata'
import Color from './color'
import Lyrics from './lyrics'
import QueuePalette from './queuepal'
import Queue from './queue'

const updateSW = registerSW({
  onOfflineReady () {
    console.log('offline ready')
  }
})
await updateSW()

// Set localForage drivers
await localforage.setDriver([
  localforage.INDEXEDDB,
  localforage.WEBSQL,
  localforage.LOCALSTORAGE
])

if (import.meta.env.DEV) {
  const { default: eruda } = await import('eruda')
  eruda.init()
}

const auth = (): SpotifyApi => SpotifyApi.withUserAuthorization(
  import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  window.location.origin + window.location.pathname,
  [
    'user-read-private',
    'user-read-email',
    'user-library-modify',
    'user-library-read'
  ]
)

// Start Spotify SDK Authorization flow
let sdk: SpotifyApi | null = navigator.onLine
  ? auth()
  : null

window.onload = async () => {
  if (sdk == null) return
  await sdk.currentUser.profile()
}

const queue = new Queue()
const player = new Player(sdk, localforage, queue)
const color = new Color()
const palette = new SearchPalette(sdk, player, localforage, queue)
const queuePalette = new QueuePalette(player, queue)
// eslint-disable-next-line no-new
new Metadata(sdk, player, color, palette, queuePalette, queue)
// eslint-disable-next-line no-new
new Visualizer(player)
// eslint-disable-next-line no-new
new Lyrics(player, queue)

if (
  navigator.userAgent.includes('Safari') &&
  !navigator.userAgent.includes('Chrome') &&
  !navigator.userAgent.includes('Firefox')
) {
  const div = new HTML('div')
    .styleJs({
      display: 'flex',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'black',
      color: 'white',
      zIndex: '99999'
    })
    .append(
      new HTML('h1')
        .styleJs({
          fontWeight: '300'
        })
        .text('click to enter')
    )
    .appendTo(document.body)
  const _ = (): void => {
    div.cleanup()

    player.audio.src = 'https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.mp3'
    player.audio.play().catch(console.error)
    player.audio.pause()

    div.un('click', _)
  }

  div.on('click', _)
}

window.ononline = async () => {
  if (sdk == null) return
  await sdk.currentUser.profile()
  sdk = navigator.onLine
    ? auth()
    : null
}

window.onoffline = () => {
  sdk = null
}
