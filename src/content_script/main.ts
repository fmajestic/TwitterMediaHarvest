/* eslint-disable react-hooks/rules-of-hooks */
import { init as SentryInit } from '@sentry/browser'
// import { BrowserTracing } from '@sentry/tracing'
import { SENTRY_DSN } from '../constants'
import './main.sass'

SentryInit({
  dsn: SENTRY_DSN,
  // integrations: [new BrowserTracing()],
  ignoreErrors: [
    'abs.twimg.com',
    'ApiError',
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
    'Extension context invalidated',
    '(intermediate value)(intermediate value)(intermediate value).querySelector is not a function',
    'Error: A listener indicated an asynchronous response by returning true',
    'The message port closed before a response was received.',
    // eslint-disable-next-line quotes
    "reading 'sendMessage'",
    'Could not establish connection. Receiving end does not exist.',
    /abs\.twimg\.com/,
  ],
  denyUrls: [/abs\.twimg\.com/, /browser-polyfill/],
  release: process.env.RELEASE,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 0.8,
  environment: process.env.NODE_ENV,
})

import { FeaturesRepository } from './features/repository'
import { TweetDeckBetaKeyboardMonitor, TweetDeckLegacyKeyboardMonitor, TwitterKeyboardMonitor } from './KeyboardMonitor'
import TweetDeckBetaObserver from './observers/TweetDeckBetaObserver'
import TweetDeckLegacyObserver from './observers/TweetDeckLegacyObserver'
import TwitterMediaObserver from './observers/TwitterMediaObserver'
import { isBetaTweetDeck, isTwitter } from './utils/checker'

const featureRepo = new FeaturesRepository()
const isRevealNsfw = await featureRepo.isRevealNsfw()

const useObserver = () => {
  if (isTwitter()) return new TwitterMediaObserver(isRevealNsfw)
  if (isBetaTweetDeck()) return new TweetDeckBetaObserver(isRevealNsfw)
  return new TweetDeckLegacyObserver()
}

const useKeboardMonitor = () => {
  if (isTwitter()) return new TwitterKeyboardMonitor()
  if (isBetaTweetDeck()) return new TweetDeckBetaKeyboardMonitor()
  return new TweetDeckLegacyKeyboardMonitor()
}

if (await featureRepo.isEnableKeyboardShortcut()) {
  const keyboardMonitor = useKeboardMonitor()
  window.addEventListener('keydown', keyboardMonitor.handleKeyDown.bind(keyboardMonitor))
  window.addEventListener('keyup', keyboardMonitor.handleKeyUp.bind(keyboardMonitor))
}

const observer = useObserver()

// Ensure observing when the tab is focused.
let hasFocused = false
window.addEventListener('focus', () => {
  observer.initialize()
  if (!hasFocused) {
    observer.observeRoot()
    hasFocused = true
  }
})

observer.observeRoot()
