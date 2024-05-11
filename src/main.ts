/* eslint-disable new-cap */

import './style.scss'
import 'material-symbols'

import HTML from '@datkat21/html'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import localforage from 'localforage'
import { registerSW } from 'virtual:pwa-register'

declare global {
  interface Window {
    isSafari: boolean
  }
}

function checkIsSafari (): boolean {
  return !!(navigator.userAgent.includes('Safari') &&
  !navigator.userAgent.includes('Chrome') &&
  !navigator.userAgent.includes('Firefox'))
}

window.isSafari = checkIsSafari()

const updateSW = registerSW({
  onNeedRefresh () {
    updateSW(true).catch(e => {
      console.error('Failed to update service worker:', e)
    })
  }
})

window.onload = async () => { await updateSW() }

// Set localForage drivers
try {
  await localforage.setDriver([
    localforage.INDEXEDDB,
    localforage.LOCALSTORAGE
  ])
} catch (e) {
  console.error('Failed to set localForage driver:', e)
  // handle error appropriately
}

const params = new URLSearchParams(window.location.search)
if (params.has('crt')) {
  document.body.classList.add('crt')
}
if (params.has('debug')) {
  ;(function () {
    var src = 'https://cdn.jsdelivr.net/npm/eruda';
    document.body.innerHTML += ('<scr' + 'ipt src="' + src + '"></scr' + 'ipt>');
    document.body.innerHTML += ('<scr' + 'ipt>eruda.init();</scr' + 'ipt>');
  })();
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

(async () => {
  const Queue = await import('./queue')
  const queue = new Queue.default()

  const Player = await import('./player')
  const player = new Player.default(sdk, localforage, queue)

  const Visualizer = await import('./visualizer')
  // eslint-disable-next-line no-new
  new Visualizer.default(player)

  const Lyrics = await import('./lyrics')
  // eslint-disable-next-line no-new
  new Lyrics.default(player, queue)

  const QueuePalette = await import('./queuepal')
  const queuePalette = new QueuePalette.default(player, queue)

  const SearchPalette = await import('./searchpal')
  const palette = new SearchPalette.default(sdk, player, queue)

  const Color = await import('./color')
  const color = new Color.default()

  const Metadata = await import('./metadata')
  // eslint-disable-next-line no-new
  new Metadata.default(sdk, player, color, palette, queuePalette, queue)

  if (!window.isSafari) {
    return
  }
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
})().catch(console.error)

window.ononline = async () => {
  if (sdk != null) return
  sdk = navigator.onLine
    ? auth()
    : null
}

window.onoffline = () => {
  sdk = null
}
