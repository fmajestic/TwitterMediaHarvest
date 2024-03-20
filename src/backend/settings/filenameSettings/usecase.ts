import { PatternToken } from '@backend/enums'
import type { V4FilenameSettings } from '@schema'
import path from 'path'

export type FileInfo = {
  serial: number
  hash: string
  date: Date
}

// YYYYMMDDHHMMSS
const makeDatetimeString = (date: Date): string =>
  String(date.getFullYear()) +
  String(date.getMonth() + 1).padStart(2, '0') +
  String(date.getDate()).padStart(2, '0') +
  String(date.getHours()).padStart(2, '0') +
  String(date.getMinutes()).padStart(2, '0') +
  String(date.getSeconds()).padStart(2, '0')

// YYYYMMDD
const makeDateString = (date: Date): string =>
  String(date.getFullYear()) +
  String(date.getMonth() + 1).padStart(2, '0') +
  String(date.getDate()).padStart(2, '0')

const patternFormatters = {
  [PatternToken.Account]: (t, _) => t.screenName,
  [PatternToken.TweetId]: (t, _) => t.id,
  [PatternToken.Serial]: (_, f) => String(f.serial).padStart(2, '0'),
  [PatternToken.Hash]: (_, f) => f.hash,
  [PatternToken.Date]: (_, f) => makeDateString(f.date),
  [PatternToken.Datetime]: (_, f) => makeDatetimeString(f.date),
  [PatternToken.TweetDate]: (t, _) => makeDateString(t.createdAt),
  [PatternToken.TweetDatetime]: (t, _) => makeDatetimeString(t.createdAt),
  [PatternToken.AccountId]: (t, _) => t.userId,
} satisfies Record<PatternToken, (t: TweetDetail, f: FileInfo) => string>

export default class V4FilenameSettingsUsecase {
  constructor(readonly settings: V4FilenameSettings) {}

  makeFilename(tweetDetail: TweetDetail, fileInfo: FileInfo): string {
    let filename = this.settings.filenamePattern.join('-')
    for (const [pattern, format] of Object.entries(patternFormatters)) {
      filename = filename.replace(pattern, format(tweetDetail, fileInfo))
    }
    return filename
  }

  makeAggregationDirectory(tweetDetail: TweetDetail, fileInfo: FileInfo): string {
    return patternFormatters[this.settings.groupBy](tweetDetail, fileInfo)
  }

  makeFullPathWithFilenameAndExt(
    filename: string,
    ext: string,
    aggregationDir?: string
  ): string {
    let dir = this.settings.noSubDirectory ? '' : this.settings.directory
    if (this.settings.fileAggregation && aggregationDir) {
      dir = dir + '/' + aggregationDir
    }
    return path.format({
      dir: dir,
      name: filename,
      ext: ext,
    })
  }
}
