/* eslint-disable react-hooks/rules-of-hooks */
import {
  TweetDeckBetaKeyboardMonitor,
  TweetDeckLegacyKeyboardMonitor,
  TwitterKeyboardMonitor,
} from './KeyboardMonitor'
import { exceptionRepo, featureRepo } from './configuration'
import './main.sass'
import TweetDeckBetaObserver from './observers/TweetDeckBetaObserver'
import TweetDeckLegacyObserver from './observers/TweetDeckLegacyObserver'
import TwitterMediaObserver from './observers/TwitterMediaObserver'
import { isBetaTweetDeck, isTwitter } from './utils/checker'
import { Action, exchangeInternal } from '@libs/browser'
import { TimeHelper } from '@libs/helpers'
import { init as SentryInit, setUser } from '@sentry/browser'

SentryInit({
  dsn: process.env.SENTRY_DSN,
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
  beforeSend: async (e, h) => {
    const lastException = await exceptionRepo.getLastException()
    if (
      lastException.message === e.message &&
      new Date().getTime() - lastException.timestamp <
        TimeHelper.minute(process.env.NODE_ENV === 'production' ? 30 : 1)
    )
      return null

    await exceptionRepo.setLastMessage(e.message)
    return e
  },
})

exchangeInternal({ action: Action.FetchUser }).then(
  resp => resp.status === 'success' && setUser(resp.data)
)

const useObserver = (revealNsfw: boolean) => {
  if (isTwitter()) return new TwitterMediaObserver(revealNsfw)
  if (isBetaTweetDeck()) return new TweetDeckBetaObserver(revealNsfw)
  return new TweetDeckLegacyObserver()
}

const useKeboardMonitor = () => {
  if (isTwitter()) return new TwitterKeyboardMonitor()
  if (isBetaTweetDeck()) return new TweetDeckBetaKeyboardMonitor()
  return new TweetDeckLegacyKeyboardMonitor()
}

let hasFocused = false

const isFocused = () => {
  hasFocused = true
}

const monitorKeyboardByFlag = () => {
  const kbMonitor = useKeboardMonitor()
  window.addEventListener('keyup', e => kbMonitor.handleKeyUp(e))
  window.addEventListener('keydown', e => kbMonitor.handleKeyDown(e))
}

featureRepo
  .getSettings()
  .then(feature => {
    feature.keyboardShortcut && monitorKeyboardByFlag()
    return feature
  })
  .then(feature => {
    const observer = useObserver(feature.autoRevealNsfw)
    window.addEventListener('focus', () => {
      feature.keyboardShortcut && monitorKeyboardByFlag()
      observer.initialize()
      if (!hasFocused) {
        observer.observeRoot()
        isFocused()
      }
    })

    observer.observeRoot()
    return feature
  })
